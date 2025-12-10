from datetime import datetime, UTC
from typing import List, Dict
from src.services.subreddit_snapshot import (
    Submission,
    SubredditSnapshot,
    SimpleSubredditSnapshot,
)
from src.services.pushshift.pushshift_dump_fetcher import PushshiftDumpFetcher
from src.services.reddit_warper import RedditWarper


from loguru import logger


class PushshiftRedditWarper(RedditWarper):
    def __init__(
        self,
        pushshift_dump_fetcher: PushshiftDumpFetcher,
        max_subreddit_size_bytes: int | None = None,
    ):
        self.pushshift_dump_fetcher = pushshift_dump_fetcher
        self.max_subreddit_size_bytes = max_subreddit_size_bytes

    async def get_subreddit(
        self, subreddit_name: str, snapshot_datetime: datetime
    ) -> SubredditSnapshot:
        submissions = self.pushshift_dump_fetcher.fetch_subreddit_dump(subreddit_name)

        submissions_list: List[Submission] = []
        async for submission in submissions:
            if submission.get("subreddit") != subreddit_name:
                continue
            # Convert created_utc (int/float) to datetime
            submission_created_utc = submission.get("created_utc")
            if isinstance(submission_created_utc, str):
                submission_created_utc = int(submission_created_utc)
            created_utc = datetime.fromtimestamp(submission_created_utc, UTC)
            if created_utc > snapshot_datetime:
                continue
            submissions_list.append(
                Submission(
                    id=submission.get("id"),
                    title=submission.get("title"),
                    author=submission.get("author"),
                    selftext=submission.get("selftext"),
                    created_utc=created_utc,
                    score=submission.get("score", 0),
                    ups=submission.get("ups"),
                    downs=submission.get("downs"),
                    num_comments=submission.get("num_comments"),
                    media_url=submission.get("url"),
                )
            )

        # For now, we do not have comments, so we use an empty list for each submission
        comments: Dict[str, List] = {s.id: [] for s in submissions_list}

        return SimpleSubredditSnapshot(
            subreddit_name=subreddit_name,
            snapshot_datetime=snapshot_datetime,
            submissions=submissions_list,
            comments=comments,
        )

    async def available_subreddits(self) -> List[str]:
        subreddit_sizes = await self.pushshift_dump_fetcher.available_subreddits()
        # Filter out any subreddits that are larger than the max_subreddit_size_bytes
        if self.max_subreddit_size_bytes:
            subreddit_sizes = [
                x for x in subreddit_sizes if x[1] <= self.max_subreddit_size_bytes
            ]
        # Sort by size, largest first
        subreddit_sizes.sort(key=lambda x: x[1], reverse=True)
        return [x[0] for x in subreddit_sizes]
