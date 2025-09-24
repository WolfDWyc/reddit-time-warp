from abc import abstractmethod
from datetime import datetime
from services.subreddit_snapshot import SubredditSnapshot


class RedditWarper:
    @abstractmethod
    async def get_subreddit(
        self, subreddit_name: str, snapshot_datetime: datetime
    ) -> SubredditSnapshot:
        pass

    @abstractmethod
    async def available_subreddits(self) -> list[str]:
        pass
