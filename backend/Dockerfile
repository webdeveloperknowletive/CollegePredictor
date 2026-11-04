
# syntax=docker/dockerfile:1.7

FROM python:3.13-slim

# Install uv from its official image
COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

WORKDIR /app

# PostgreSQL client is required for database restore operations
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       postgresql-client \
       ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies separately so code changes don't invalidate this layer
COPY requirements.txt .

RUN --mount=type=cache,target=/root/.cache/uv,sharing=locked \
    uv pip install --system -r requirements.txt

# Copy backend source and data
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
