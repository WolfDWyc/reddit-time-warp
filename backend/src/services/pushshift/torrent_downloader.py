import os
from typing import Optional, List, Union
import shutil
import tempfile
import asyncio
import aiohttp
import aiofiles
import hashlib
from pathlib import Path
import inspect
from loguru import logger
from aiotorrent import Torrent
import diskcache
import logging
import contextlib   
from typing import Generator

class InterceptHandler(logging.Handler):
    def emit(self, record: logging.LogRecord) -> None:

        level: str | int
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where originated the logged message.
        frame, depth = inspect.currentframe(), 0
        while frame and (depth == 0 or frame.f_code.co_filename == logging.__file__):
            frame = frame.f_back
            depth += 1

        # If it's a debug message, don't log it
        if level == "DEBUG":
            return
        logger.opt(depth=depth, exception=record.exc_info).debug(record.getMessage())


logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)


def _get_file_path_from_info(file_info: dict) -> str:
    """
    Given a file_info dict from torrent.torrent_info['files'], return the full file path as a string.
    """
    # file_info['path'] is a list of path parts
    return os.path.join(*file_info["path"])


class FileCache:
    def __init__(self, cache_dir: Optional[str] = ".torrent_cache"):
        self.cache_dir = cache_dir
        if self.cache_dir:
            os.makedirs(self.cache_dir, exist_ok=True)
        self._content_cache_dir = os.path.join(self.cache_dir, "content")
        self._metadata_cache_dir = os.path.join(self.cache_dir, "metadata")
        os.makedirs(self._content_cache_dir, exist_ok=True)
        os.makedirs(self._metadata_cache_dir, exist_ok=True)
        
        self._metadata_cache = diskcache.Cache(self._metadata_cache_dir)

    def _get_cache_path(self, key: str) -> str:
        # hexdigest the key
        key_hash = hashlib.sha256(key.encode()).hexdigest()
        return os.path.join(self._content_cache_dir, key_hash)

    def set(self, key: str, filename: str) -> str:
        self._metadata_cache.set(key, filename)

        # Copy the file to the content cache
        shutil.copy2(filename, self._get_cache_path(key))

        # Return the path to the content cache
        return self._get_cache_path(key)
    
    def get(self, key: str) -> Optional[str]:
        if key not in self._metadata_cache:
            return None
        
        # Return the path to the content cache
        return self._get_cache_path(key)
    
    def _get_lock_path(self, key: str) -> str:
        return self._get_cache_path(key) + ".lock"
    
    async def lock_file(self, key: str) -> None:
        logger.debug(f"Trying to lock file: {key} at path {self._get_lock_path(key)}")
        # If the file is already locked, wait for it to be unlocked
        time_waited = 0
        while self.is_locked(key):
            await asyncio.sleep(0.1)
            if round(time_waited, 1) % 10 == 0 and round(time_waited, 1) > 0:
                logger.warning(f"Waiting for lock file to be unlocked: {key}, waited for {round(time_waited, 1)} seconds")
            time_waited += 0.1
        lock_key = self._get_lock_path(key)
        with open(lock_key, "w") as f:
            f.write(key)
        logger.debug(f"Locked file: {key}")
    
    async def unlock_file(self, key: str) -> None:
        logger.debug(f"Unlocking file: {key}")
        lock_key = self._get_lock_path(key)
        if os.path.exists(lock_key):
            os.remove(lock_key)
                
    def is_locked(self, key: str) -> bool:
        lock_key = self._get_lock_path(key)
        return os.path.exists(lock_key)

    # Context manager for locking
    @contextlib.asynccontextmanager
    async def lock_context(self, key: str) -> Generator[None, None, None]:
        try:
            await self.lock_file(key)
            yield
        finally:
            await self.unlock_file(key)

class TorrentDownloader:
    def __init__(self, torrent_url: str, cache_dir: str = ".torrent_cache"):
        self.torrent_url = torrent_url
        self.cache = FileCache(cache_dir)

    async def _download_torrent_file(self) -> str:
        """
        Downloads the torrent file, using the cache if available.
        Returns the path to the torrent file (either in cache or tmpdir).
        """
        cached_torrent_path = self.cache.get(self.torrent_url)
        if cached_torrent_path:
            logger.debug(f"Cache hit for torrent file: {cached_torrent_path}")
            return cached_torrent_path

        logger.debug(
            f"Cache miss for torrent file, downloading from: {self.torrent_url}"
        )
        async with self.cache.lock_context(self.torrent_url):
            with tempfile.TemporaryDirectory() as tmpdir:
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

                cached_torrent_path = self.cache.set(self.torrent_url, torrent_path)
                logger.debug(f"Cached torrent file to: {cached_torrent_path}")
                # Remove the torrent file from the temporary directory
                os.remove(torrent_path)
                return cached_torrent_path

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
        cache_key = self.torrent_url + ":" + str(filename)

        cache_path = self.cache.get(cache_key)
        if cache_path:
            logger.debug(f"Cache hit for file '{filename_str}': {cache_path}")
            return cache_path

        logger.debug(f"Cache miss for file '{filename_str}', starting download")

        torrent_path = await self._download_torrent_file()
        async with self.cache.lock_context(cache_key):
            logger.debug("Initializing torrent")
            torrent = Torrent(torrent_path)
            await torrent.init()

            # Find the index and file_info dict in torrent.torrent_info['files'] whose path matches filename
            file_info = None
            file_index = None
            for idx, f in enumerate(torrent.torrent_info.get("files", [])):
                file_path = _get_file_path_from_info(f)
                # Compare using pathlib for robust path matching
                if Path(file_path) == filename or file_path.endswith(
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

            await torrent.download(file_obj)

            file_abs_path = os.path.join(torrent.torrent_info["name"], file_obj.name)
            if not os.path.exists(file_abs_path):
                raise FileNotFoundError(
                    f"Downloaded file '{filename_str}' not found at expected location."
                )

            
            cache_path = self.cache.set(cache_key, file_abs_path)
            logger.debug(f"Cached file '{filename_str}' to: {cache_path}")
            os.remove(file_abs_path)
            
            return cache_path

    async def list_files(self) -> List[tuple[str, int]]:
        """
        Lists all files available in the torrent.
        """
        torrent_path = await self._download_torrent_file()
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
