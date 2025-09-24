from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel
from abc import ABC, abstractmethod


class Comment(BaseModel):
    id: str
    author: Optional[str]
    body: str
    created_utc: datetime


class Submission(BaseModel):
    id: str
    title: str
    author: str
    selftext: Optional[str]
    created_utc: datetime
    score: int
    ups: Optional[int]
    downs: Optional[int]
    num_comments: Optional[int]
    media_url: Optional[str]


class SubredditSnapshot(ABC):
    @abstractmethod
    def get_subreddit_name(self) -> str:
        pass

    @abstractmethod
    def get_snapshot_datetime(self) -> datetime:
        pass

    @abstractmethod
    def get_submissions(
        self,
        start_datetime: datetime | None = None,
        end_datetime: datetime | None = None,
        sort_by: Literal["new", "old", "top"] = "top",
        limit: int | None = None,
        skip: int = 0,
    ) -> List["Submission"]:
        pass

    @abstractmethod
    def get_submission_comments(self, submission_id: str) -> Optional[list["Comment"]]:
        pass


class SimpleSubredditSnapshot(SubredditSnapshot):
    def __init__(
        self,
        subreddit_name: str,
        snapshot_datetime: datetime,
        submissions: list["Submission"],
        comments: dict[str, list["Comment"]],
    ):
        self.subreddit_name = subreddit_name
        self.snapshot_datetime = snapshot_datetime
        self.submissions = submissions
        self.comments = comments

    def get_subreddit_name(self) -> str:
        return self.subreddit_name

    def get_snapshot_datetime(self) -> datetime:
        return self.snapshot_datetime

    def get_submissions(
        self,
        start_datetime: datetime | None = None,
        end_datetime: datetime | None = None,
        sort_by: Literal["new", "old", "top"] = "top",
        limit: int | None = None,
        skip: int = 0,
    ) -> List["Submission"]:
        # Filter submissions by datetime range
        filtered_submissions = []
        for submission in self.submissions:
            if start_datetime and submission.created_utc < start_datetime:
                continue
            if end_datetime and submission.created_utc > end_datetime:
                continue
            filtered_submissions.append(submission)

        # Sort submissions
        if sort_by == "new":
            filtered_submissions.sort(key=lambda x: x.created_utc, reverse=True)
        elif sort_by == "old":
            filtered_submissions.sort(key=lambda x: x.created_utc)
        elif sort_by == "top":
            filtered_submissions.sort(key=lambda x: x.score, reverse=True)

        # Apply skip and limit efficiently
        start_idx = skip
        end_idx = start_idx + limit if limit is not None else None
        return filtered_submissions[start_idx:end_idx]

    def get_hot_submissions(
        self,
        limit: int | None = None,
        skip: int = 0,
    ) -> List["Submission"]:
        """
        Returns submissions sorted by Reddit's "hot" algorithm.
        The hot score is calculated as:
            hot_score = sign * log10(max(abs(score), 1)) + (created_utc - 1134028003) / 45000
        Where:
            score = upvotes - downvotes
            sign = 1 if score > 0, -1 if score < 0, 0 if score == 0
            created_utc: seconds since epoch (UTC)
        """
        import math

        def hot_score(submission) -> float:
            score = getattr(submission, "score", 0)
            upvotes = getattr(submission, "upvotes", None)
            downvotes = getattr(submission, "downvotes", None)
            # If upvotes/downvotes are available, prefer them for controversy penalty
            if upvotes is not None and downvotes is not None:
                score = upvotes - downvotes
            sign = 1 if score > 0 else -1 if score < 0 else 0
            order = math.log10(max(abs(score), 1))
            # Reddit epoch: 1134028003 (Dec 8, 2005, 7:46:43 AM UTC)
            created_utc = getattr(submission, "created_utc", None)

            seconds = (
                int(created_utc.timestamp())
                if hasattr(created_utc, "timestamp")
                else int(created_utc)
            )
            return round(sign * order + (seconds - 1134028003) / 45000, 7)

        submissions = list(self.submissions)
        submissions.sort(key=hot_score, reverse=True)

        # Apply skip and limit efficiently
        start_idx = skip
        end_idx = start_idx + limit if limit is not None else None
        return submissions[start_idx:end_idx]

    def get_submission_comments(self, submission_id: str) -> Optional[List["Comment"]]:
        return self.comments.get(submission_id, None)
