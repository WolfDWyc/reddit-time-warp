from typing import Any
from datetime import datetime
from src.services.subreddit_snapshot import SubredditSnapshot
from src.services.reddit_warper import RedditWarper
from diskcache import Cache
import hashlib
import pickle
import os
from loguru import logger


class CachedRedditWarper(RedditWarper):
    def __init__(
        self,
        inner_warper: RedditWarper,
        cache_dir: str = "./subreddit_cache",
        max_size_bytes: int = 2 * 1024 * 1024 * 1024,
    ):
        """
        :param inner_warper: The RedditWarper instance to wrap and cache.
        :param cache_dir: Directory for diskcache storage.
        :param max_size_bytes: Maximum cache size in bytes.
        """
        self.inner_warper = inner_warper
        self.subreddit_cache = Cache(
            directory=os.path.join(cache_dir, "content"), size_limit=max_size_bytes
        )
        self.subreddit_list_cache = Cache(
            directory=os.path.join(cache_dir, "list"), size_limit=max_size_bytes
        )
        logger.debug(
            f"Initialized CachedRedditWarper with cache_dir={cache_dir}, max_size_bytes={max_size_bytes}"
        )

    @staticmethod
    def _make_cache_key(subreddit_name: str, snapshot_datetime: datetime) -> str:
        # Use a hash to avoid issues with long keys or special characters
        key_data = f"{subreddit_name}:{snapshot_datetime.isoformat()}"
        cache_key = hashlib.sha256(key_data.encode("utf-8")).hexdigest()
        logger.debug(
            f"Generated cache key for subreddit='{subreddit_name}', datetime='{snapshot_datetime}': {cache_key}"
        )
        return cache_key

    async def get_subreddit(
        self, subreddit_name: str, snapshot_datetime: datetime
    ) -> SubredditSnapshot:
        cache_key = self._make_cache_key(subreddit_name, snapshot_datetime)
        logger.debug(
            f"Attempting to retrieve subreddit '{subreddit_name}' at '{snapshot_datetime}' from cache with key '{cache_key}'"
        )
        cached = self.subreddit_cache.get(cache_key, default=None)
        if cached is not None:
            try:
                # Unpickle the cached snapshot
                snapshot = pickle.loads(cached)
                logger.debug(
                    f"Cache hit for subreddit '{subreddit_name}' at '{snapshot_datetime}'"
                )
                return snapshot
            except Exception as e:
                logger.warning(
                    f"Failed to unpickle cached snapshot for key '{cache_key}': {e}. Removing corrupted cache entry."
                )
                # If unpickling fails, remove the corrupted cache entry
                self.subreddit_cache.pop(cache_key, None)
        else:
            logger.debug(
                f"Cache miss for subreddit '{subreddit_name}' at '{snapshot_datetime}'"
            )
        # Not cached or cache corrupted, fetch and cache
        snapshot = await self.inner_warper.get_subreddit(
            subreddit_name, snapshot_datetime
        )
        try:
            self.subreddit_cache.set(cache_key, pickle.dumps(snapshot))
            logger.debug(
                f"Cached subreddit '{subreddit_name}' at '{snapshot_datetime}' with key '{cache_key}'"
            )
        except Exception as e:
            logger.warning(
                f"Failed to pickle/cache snapshot for subreddit '{subreddit_name}' at '{snapshot_datetime}': {e}"
            )
            # If pickling fails, do not cache
            pass
        return snapshot

    async def available_subreddits(self) -> list[str]:
        # Cache the subreddits list
        cache_key = "available_subreddits"
        logger.debug("Attempting to retrieve available subreddits list from cache")
        cached = self.subreddit_list_cache.get(cache_key, default=None)
        if cached is not None:
            logger.debug("Cache hit for available subreddits list")
            return pickle.loads(cached)
        logger.debug(
            "Cache miss for available subreddits list, fetching from inner_warper"
        )
        # Not cached, fetch and cache
        subreddits = await self.inner_warper.available_subreddits()
        try:
            self.subreddit_list_cache.set(cache_key, pickle.dumps(subreddits))
            logger.debug("Cached available subreddits list")
        except Exception as e:
            logger.warning(f"Failed to pickle/cache available subreddits list: {e}")
        return subreddits
