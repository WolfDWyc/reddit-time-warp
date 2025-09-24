import os
from fastapi import FastAPI, HTTPException, Query, Depends
from datetime import datetime, UTC
from typing import Optional, Literal, List
from pydantic import BaseModel
import uvicorn
from loguru import logger
from fastapi.middleware.cors import CORSMiddleware
from services.cached_reddit_warper import CachedRedditWarper
from services.pushshift.pushshift_reddit_warper import PushshiftRedditWarper
from services.pushshift.pushshift_dump_fetcher import PushshiftDumpFetcher
from services.pushshift.torrent_downloader import TorrentDownloader
from services.subreddit_snapshot import Submission, Comment
from services.reddit_warper import RedditWarper


HOST = os.getenv("HOST", "0.0.0.0")
PORT = os.getenv("PORT", 8000)
RELOAD = os.getenv("RELOAD", "true").lower() == "true"
TORRENT_URL = os.getenv("TORRENT_URL", "https://academictorrents.com/download/1614740ac8c94505e4ecb9d88be8bed7b6afddd4.torrent")
TORRENT_SUBREDDITS_PATH = os.getenv("TORRENT_SUBREDDITS_PATH", "subreddits24")
TORRENT_CACHE_DIR = os.getenv("TORRENT_CACHE_DIR", r"D:\Projects\redditwarp\backend\.torrent_cache")
SUBREDDIT_CACHE_DIR = os.getenv("SUBREDDIT_CACHE_DIR", r"D:\Projects\redditwarp\backend\.subreddit_cache")
SUBREDDIT_CACHE_MAX_SIZE_BYTES = os.getenv("SUBREDDIT_CACHE_MAX_SIZE_BYTES", 2 * 1024 * 1024 * 1024)
MAX_SUBREDDIT_SIZE_BYTES = os.getenv("MAX_SUBREDDIT_SIZE_BYTES", 250 * 1024 * 1024)
CORS_ALLOWED_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "*").split(",")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SubmissionFilters(BaseModel):
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    sort_by: Literal["new", "old", "top"] = "top"


class SubmissionsResponse(BaseModel):
    subreddit: str
    snapshot_datetime: str
    filters: Optional[SubmissionFilters] = None
    submissions: List[Submission]
    count: int
    limit: int
    skip: int


class HotSubmissionsResponse(BaseModel):
    subreddit: str
    snapshot_datetime: str
    submissions: List[Submission]
    count: int
    limit: int
    skip: int


def get_warper() -> RedditWarper:
    """
    FastAPI dependency that provides a RedditWarper instance.
    Creates a cached warper with Pushshift backend.
    """
    logger.info("Creating RedditWarper dependency instance")
    warper = CachedRedditWarper(
        inner_warper=PushshiftRedditWarper(
            pushshift_dump_fetcher=PushshiftDumpFetcher(
                torrent_downloader=TorrentDownloader(
                    torrent_url=TORRENT_URL,
                    cache_dir=TORRENT_CACHE_DIR,
                ),
                subreddits_path=TORRENT_SUBREDDITS_PATH,
            ),
            max_subreddit_size_bytes=MAX_SUBREDDIT_SIZE_BYTES,
        ),
        cache_dir=SUBREDDIT_CACHE_DIR,
        max_size_bytes=SUBREDDIT_CACHE_MAX_SIZE_BYTES,
    )
    logger.info("RedditWarper dependency instance created successfully")
    return warper

async def validate_subreddit(subreddit: str, warper: RedditWarper = Depends(get_warper)) -> str:
    """
    Validate a subreddit name.
    """
    subreddits = await warper.available_subreddits()
    if subreddit not in subreddits:
        raise HTTPException(status_code=404, detail=f"Subreddit {subreddit} not found")
    return subreddit

@app.get(
    "/subreddits/{subreddit}/{snapshot_timestamp}/submissions/hot",
    response_model=HotSubmissionsResponse,
)
async def get_hot_submissions(
    snapshot_timestamp: int,
    subreddit: str = Depends(validate_subreddit),
    limit: int = Query(
        25, ge=1, le=1000, description="Number of submissions to return (max 1000)"
    ),
    skip: int = Query(0, ge=0, description="Number of submissions to skip"),
    warper: RedditWarper = Depends(get_warper),
) -> HotSubmissionsResponse:
    """
    Get hot submissions for a subreddit at a specific snapshot timestamp.

    Args:
        subreddit: The subreddit name (e.g., 'python', 'AskReddit')
        snapshot_timestamp: Unix timestamp representing when the Reddit snapshot was taken

    Returns:
        Hot submissions sorted by Reddit's hot algorithm
    """
    logger.info(
        f"Hot submissions request: subreddit={subreddit}, snapshot_timestamp={snapshot_timestamp}, "
        f"limit={limit}, skip={skip}"
    )

    snapshot_datetime = datetime.fromtimestamp(snapshot_timestamp, tz=UTC)
    logger.info(
        f"Converted snapshot_timestamp to datetime: {snapshot_datetime.isoformat()}"
    )

    logger.info(
        f"Fetching subreddit snapshot for r/{subreddit} at {snapshot_datetime.isoformat()}"
    )
    snapshot = await warper.get_subreddit(subreddit, snapshot_datetime)
    logger.info(f"Successfully fetched subreddit snapshot for r/{subreddit}")

    logger.info("Calculating hot submissions using Reddit's hot algorithm")
    hot_submissions = snapshot.get_hot_submissions(limit=limit, skip=skip)
    logger.info(
        f"Found {len(hot_submissions)} hot submissions (limit={limit}, skip={skip})"
    )

    response = HotSubmissionsResponse(
        subreddit=subreddit,
        submissions=hot_submissions,
        snapshot_datetime=snapshot_datetime.isoformat(),
        count=len(hot_submissions),
        limit=limit,
        skip=skip,
    )
    logger.info(f"Successfully returning hot submissions response for r/{subreddit}")
    return response


@app.get(
    "/subreddits/{subreddit}/{snapshot_timestamp}/submissions",
    response_model=SubmissionsResponse,
)
async def get_submissions(
    snapshot_timestamp: int,
    subreddit: str = Depends(validate_subreddit),
    start_time: Optional[int] = Query(None, description="Start unix timestamp filter"),
    end_time: Optional[int] = Query(None, description="End unix timestamp filter"),
    sort_by: Literal["new", "old", "top"] = Query(
        "top", description="Sort order: new, old, or top"
    ),
    limit: int = Query(
        25, ge=1, le=1000, description="Number of submissions to return (max 1000)"
    ),
    skip: int = Query(0, ge=0, description="Number of submissions to skip"),
    warper: RedditWarper = Depends(get_warper),
) -> SubmissionsResponse:
    """
    Get submissions for a subreddit at a specific snapshot timestamp with optional filtering and sorting.

    Args:
        subreddit: The subreddit name (e.g., 'python', 'AskReddit')
        snapshot_timestamp: Unix timestamp representing when the Reddit snapshot was taken
        start_time: Optional start unix timestamp filter
        end_time: Optional end unix timestamp filter
        sort_by: Sort order - 'new' (newest first), 'old' (oldest first), or 'top' (highest score first)

    Returns:
        Filtered and sorted submissions
    """
    logger.info(
        f"Submissions request: subreddit={subreddit}, snapshot_timestamp={snapshot_timestamp}, "
        f"start_time={start_time}, end_time={end_time}, sort_by={sort_by}, limit={limit}, skip={skip}"
    )

    try:
        snapshot_datetime = datetime.fromtimestamp(snapshot_timestamp, tz=UTC)
        logger.info(
            f"Converted snapshot_timestamp to datetime: {snapshot_datetime.isoformat()}"
        )

        logger.info(
            f"Fetching subreddit snapshot for r/{subreddit} at {snapshot_datetime.isoformat()}"
        )
        snapshot = await warper.get_subreddit(subreddit, snapshot_datetime)
        logger.info(f"Successfully fetched subreddit snapshot for r/{subreddit}")

        # Convert optional timestamp filters to datetime objects
        start_datetime = None
        end_datetime = None

        if start_time is not None:
            start_datetime = datetime.fromtimestamp(start_time, tz=UTC)
            logger.info(f"Applied start_time filter: {start_datetime.isoformat()}")
        if end_time is not None:
            end_datetime = datetime.fromtimestamp(end_time, tz=UTC)
            logger.info(f"Applied end_time filter: {end_datetime.isoformat()}")

        logger.info(f"Filtering and sorting submissions with sort_by={sort_by}")
        submissions = snapshot.get_submissions(
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            sort_by=sort_by,
            limit=limit,
            skip=skip,
        )
        logger.info(
            f"Found {len(submissions)} submissions after filtering (limit={limit}, skip={skip})"
        )

        filters = SubmissionFilters(
            start_time=start_datetime.isoformat() if start_datetime else None,
            end_time=end_datetime.isoformat() if end_datetime else None,
            sort_by=sort_by,
        )

        response = SubmissionsResponse(
            subreddit=subreddit,
            snapshot_datetime=snapshot_datetime.isoformat(),
            filters=filters,
            submissions=submissions,
            count=len(submissions),
            limit=limit,
            skip=skip,
        )
        logger.info(
            f"Successfully returning filtered submissions response for r/{subreddit}"
        )
        return response

    except Exception as e:
        logger.exception(f"Error fetching submissions for r/{subreddit}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching subreddit data: {str(e)}"
        )


@app.get("/subreddits")
async def get_available_subreddits(
    warper: RedditWarper = Depends(get_warper),
) -> List[str]:
    """
    Get all available subreddits.
    """
    return await warper.available_subreddits()


if __name__ == "__main__":
    logger.info("Initializing RedditWarp API server")
    logger.info("--- Server Configuration ---")
    logger.info(f"Host: {HOST}")
    logger.info(f"Port: {PORT}")
    logger.info(f"Reload: {RELOAD}")
    logger.info(f"Torrent URL: {TORRENT_URL}")
    logger.info(f"Subreddits path: {TORRENT_SUBREDDITS_PATH}")
    logger.info(f"Torrent cache dir: {TORRENT_CACHE_DIR}")
    logger.info(f"Subreddit cache dir: {SUBREDDIT_CACHE_DIR}")
    logger.info(f"Subreddit cache max size bytes: {SUBREDDIT_CACHE_MAX_SIZE_BYTES}")
    logger.info(f"Max subreddit size bytes: {MAX_SUBREDDIT_SIZE_BYTES}")
    logger.info(f"CORS allowed origins: {CORS_ALLOWED_ORIGINS}")
    logger.info("--- Server Configuration ---")
    logger.info("Starting RedditWarp API server")
    uvicorn.run("main:app", host=HOST, port=PORT, reload=RELOAD)
