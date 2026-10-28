from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Callable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings


def add_cors_middleware(app: FastAPI) -> None:
    settings = get_settings()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def add_rate_limit_middleware(app: FastAPI) -> None:
    requests_by_ip: dict[str, deque[float]] = defaultdict(deque)

    @app.middleware("http")
    async def rate_limit(request: Request, call_next: Callable):
        if not request.url.path.startswith("/api"):
            return await call_next(request)

        key = request.client.host if request.client else "unknown"
        now = time.time()
        bucket = requests_by_ip[key]
        bucket.append(now)
        while bucket and now - bucket[0] > 60:
            bucket.popleft()

        if len(bucket) > 200:
            return Response(status_code=429, content="Too many requests")

        return await call_next(request)


from fastapi.responses import Response
