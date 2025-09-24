FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Set working directory
WORKDIR /app

# Copy uv configuration files
COPY pyproject.toml uv.lock .python-version README.md ./

# Install dependencies
RUN uv sync --frozen --no-cache

# Copy application code
COPY src/ ./src/


# Expose port (adjust as needed)
EXPOSE 8000

# Set environment variables
ENV RELOAD=false
ENV TORRENT_CACHE_DIR=.torrent_cache
ENV SUBREDDIT_CACHE_DIR=.subreddit_cache

# Run the application
CMD ["uv", "run", "python", "src/main.py"]