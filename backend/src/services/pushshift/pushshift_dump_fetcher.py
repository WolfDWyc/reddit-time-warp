import asyncio
import orjson
from pathlib import Path
import zstandard
from typing import Iterator
from src.services.pushshift.torrent_downloader import TorrentDownloader
from loguru import logger


def read_and_decode(
    reader, chunk_size, max_window_size, previous_chunk=None, bytes_read=0
):
    chunk = reader.read(chunk_size)
    bytes_read += chunk_size
    if previous_chunk is not None:
        chunk = previous_chunk + chunk
    try:
        return chunk.decode()
    except UnicodeDecodeError:
        if bytes_read > max_window_size:
            raise UnicodeError(
                f"Unable to decode frame after reading {bytes_read:,} bytes"
            )
        logger.info(f"Decoding error with {bytes_read:,} bytes, reading another chunk")
        return read_and_decode(reader, chunk_size, max_window_size, chunk, bytes_read)


def read_lines_zst(file_name, chunk_size=2**21):
    with open(file_name, "rb") as file_handle:
        buffer = ""
        reader = zstandard.ZstdDecompressor(max_window_size=2**31).stream_reader(
            file_handle
        )
        while True:
            chunk = read_and_decode(reader, chunk_size, (2**29) * 2)

            if not chunk:
                break
            lines = (buffer + chunk).split("\n")

            for line in lines[:-1]:
                yield line, file_handle.tell()

            buffer = lines[-1]

        reader.close()


class PushshiftDumpFetcher:
    def __init__(self, torrent_downloader: TorrentDownloader, subreddits_path: str, read_chunk_size=2**21):
        self.torrent_downloader = torrent_downloader
        self.subreddits_path = subreddits_path
        self.read_chunk_size = read_chunk_size

    async def fetch_subreddit_dump(self, subreddit_name: str) -> Iterator[dict]:
        submissions_filename = (
            Path(self.subreddits_path) / f"{subreddit_name}_submissions.zst"
        )

        submissions_file = await self.torrent_downloader.download_file(
            submissions_filename
        )

        logger.debug(f"Got submissions file at: {submissions_file}, reading lines")

        for line, file_bytes_processed in read_lines_zst(submissions_file, self.read_chunk_size):
            yield orjson.loads(line)

    async def available_subreddits(self) -> list[tuple[str, int]]:
        subreddits = []
        for file, size in await self.torrent_downloader.list_files():
            if file.endswith("_submissions.zst"):
                path = Path(file)
                subreddits.append((path.stem.split("_")[0], size))
        return subreddits


async def main():
    TORRENT_URL = "https://academictorrents.com/download/1614740ac8c94505e4ecb9d88be8bed7b6afddd4.torrent"

    fetcher = PushshiftDumpFetcher(TorrentDownloader(TORRENT_URL), "subreddits24", read_chunk_size=2**21)
    async for submission in fetcher.fetch_subreddit_dump("invincible"):
        pass


if __name__ == "__main__":
    asyncio.run(main())
