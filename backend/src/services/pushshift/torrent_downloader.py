import os
from typing import Optional, List, Union
import shutil
import tempfile
import asyncio
import aiohttp
import aiofiles
import hashlib
from pathlib import Path

from loguru import logger
from aiotorrent import Torrent


async def _monitor_download_progress(file_obj, filename: str) -> None:
    """
    Monitors download progress and logs it periodically.
    """
    last_progress = -1
    while True:
        try:
            progress = file_obj.get_download_progress()
            if progress != last_progress and progress % 10 == 0:  # Log every 10%
                logger.debug(f"Download progress for '{filename}': {progress}%")
                last_progress = progress

            if progress >= 100:
                logger.debug(f"Download completed for '{filename}': 100%")
                break

            await asyncio.sleep(1)  # Check every second
        except Exception as e:
            logger.debug(f"Progress monitoring error for '{filename}': {e}")
            break


def _get_file_path_from_info(file_info: dict) -> str:
    """
    Given a file_info dict from torrent.torrent_info['files'], return the full file path as a string.
    """
    # file_info['path'] is a list of path parts
    return os.path.join(*file_info["path"])


class TorrentDownloader:
    def __init__(self, torrent_url: str, cache_dir: Optional[str] = ".torrent_cache"):
        self.torrent_url = torrent_url
        self.cache_dir = cache_dir
        if self.cache_dir:
            os.makedirs(self.cache_dir, exist_ok=True)

    def _get_cache_path(self, filename: str) -> Optional[str]:
        if self.cache_dir:
            url_hash = hashlib.sha256(self.torrent_url.encode()).hexdigest()
            return os.path.join(self.cache_dir, url_hash, filename)
        return None

    def _get_torrent_cache_path(self) -> Optional[str]:
        if self.cache_dir:
            url_hash = hashlib.sha256(self.torrent_url.encode()).hexdigest()
            return os.path.join(self.cache_dir, f"{url_hash}.torrent")
        return None

    async def _download_torrent_file(self, tmpdir: str) -> str:
        """
        Downloads the torrent file, using the cache if available.
        Returns the path to the torrent file (either in cache or tmpdir).
        """
        cache_torrent_path = self._get_torrent_cache_path()
        if cache_torrent_path and os.path.exists(cache_torrent_path):
            logger.debug(f"Cache hit for torrent file: {cache_torrent_path}")
            torrent_path = os.path.join(tmpdir, "temp.torrent")
            shutil.copy2(cache_torrent_path, torrent_path)
            return torrent_path

        logger.debug(
            f"Cache miss for torrent file, downloading from: {self.torrent_url}"
        )
        torrent_path = os.path.join(tmpdir, "temp.torrent")
        async with aiohttp.ClientSession() as session:
            async with session.get(
                self.torrent_url, timeout=aiohttp.ClientTimeout(total=30)
            ) as resp:
                resp.raise_for_status()
                async with aiofiles.open(torrent_path, "wb") as f:
                    async for chunk in resp.content.iter_chunked(8192):
                        if chunk:
                            await f.write(chunk)

        logger.debug(f"Downloaded torrent file to: {torrent_path}")

        if cache_torrent_path:
            os.makedirs(os.path.dirname(cache_torrent_path), exist_ok=True)
            shutil.copy2(torrent_path, cache_torrent_path)
            logger.debug(f"Cached torrent file to: {cache_torrent_path}")
        return torrent_path

    async def download_file(self, filename: Path) -> str:
        """
        Downloads a specific file from the torrent.
        If cache_dir is set and the file exists, returns the cached file path.
        Otherwise, downloads the file and stores it in cache_dir if set.
        Returns the path to the downloaded file.

        Args:
            filename: The file path within the torrent, as a string or pathlib.Path.
        """
        # Accept pathlib.Path or str for filename
        filename_str = str(filename)

        cache_path = self._get_cache_path(filename_str)
        if cache_path and os.path.exists(cache_path):
            logger.debug(f"Cache hit for file '{filename_str}': {cache_path}")
            return cache_path

        logger.debug(f"Cache miss for file '{filename_str}', starting download")

        with tempfile.TemporaryDirectory() as tmpdir:
            torrent_path = await self._download_torrent_file(tmpdir)
            logger.debug("Initializing torrent")
            torrent = Torrent(torrent_path)
            await torrent.init()

            # Find the index and file_info dict in torrent.torrent_info['files'] whose path matches filename
            file_info = None
            file_index = None
            for idx, f in enumerate(torrent.torrent_info.get("files", [])):
                file_path = _get_file_path_from_info(f)
                # Compare using pathlib for robust path matching
                if Path(file_path) == Path(filename_str) or file_path.endswith(
                    filename_str
                ):
                    file_info = f
                    file_index = idx
                    break

            if file_info is None or file_index is None:
                raise FileNotFoundError(f"File '{filename_str}' not found in torrent.")

            # Now, find the corresponding file_obj in torrent.files by index
            try:
                file_obj = torrent.files[file_index]
            except (IndexError, AttributeError):
                raise FileNotFoundError(
                    f"File object for '{filename_str}' not found in torrent.files."
                )

            logger.debug(f"Downloading file '{filename_str}' from torrent")

            # Start progress monitoring task
            progress_task = asyncio.create_task(
                _monitor_download_progress(file_obj, filename_str)
            )

            try:
                await torrent.download(file_obj)
            finally:
                # Cancel progress monitoring task
                progress_task.cancel()
                try:
                    await progress_task
                except asyncio.CancelledError:
                    pass

            file_abs_path = os.path.join(torrent.torrent_info["name"], file_obj.name)
            if not os.path.exists(file_abs_path):
                raise FileNotFoundError(
                    f"Downloaded file '{filename_str}' not found at expected location."
                )

            if cache_path:
                os.makedirs(os.path.dirname(cache_path), exist_ok=True)
                shutil.copy2(file_abs_path, cache_path)
                logger.debug(f"Cached file '{filename_str}' to: {cache_path}")
                # Remove the file from the temporary directory
                os.remove(file_abs_path)

                return cache_path
            return file_abs_path

    async def list_files(self) -> List[tuple[str, int]]:
        """
        Lists all files available in the torrent.
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            torrent_path = await self._download_torrent_file(tmpdir)
            logger.debug("Initializing torrent")
            torrent = Torrent(torrent_path)
            await torrent.init()
            # Use torrent.torrent_info['files'] to get the full paths
            files_info = torrent.torrent_info.get("files", [])
            return [(_get_file_path_from_info(f), f["length"]) for f in files_info]


# Security warning:
# - aiotorrent is a third-party library and may not be as widely audited as libtorrent.
# - Downloading and executing torrents from untrusted sources can be dangerous.
# - Always validate the source of your torrent files and consider running in a sandboxed environment.
# - Use aiohttp for secure HTTP connections and validate SSL certificates.


# Example usage:
async def main() -> None:
    downloader = TorrentDownloader(
        "https://academictorrents.com/download/1614740ac8c94505e4ecb9d88be8bed7b6afddd4.torrent",
        ".torrent_cache",
    )
    files = await downloader.list_files()
    print(files)


if __name__ == "__main__":
    asyncio.run(main())
