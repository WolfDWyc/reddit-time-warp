# Reddit Time Warp

View a subreddit from any point in time.

<span style="font-size:x-large;"><b>
Visit: [https://wolfdwyc.github.io/reddit-time-warp/](https://wolfdwyc.github.io/reddit-time-warp/)
</b></span>

## What is this?

This is a web application that allows you to browse a subreddit from a specific point in time.

The main reason I made this is to browse subreddits about TV shows before I finished them without getting spoiled, but it may be useful for other purposes.

## How it works

Reddit Time Warp is pretty simple:

- It uses Pushshift data dumps to fetch historical data about subreddits.
- It serves that data using a FastAPI backend, which also caches data on disk for faster loading.
- The frontend is a React application that fetches data from the backend and displays it in a reddit-like read-only interface.


