from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.v1.health import health as health_check, ready as ready_check
from app.api.v1.router import router
from app.core.config import settings
from app.core.errors import ApiError, api_error_handler, unhandled_error_handler
from app.db.session import get_db

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger("automatic")


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.db.session import SessionLocal, init_db
    from app.use_cases.seed import seed_reference_data

    init_db()
    db = SessionLocal()
    try:
        seed_reference_data(db)
    finally:
        db.close()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Automatic API",
        version="0.1.0",
        openapi_url="/api/v1/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.exception_handler(ApiError)
    async def handle_api_error(request: Request, exc: ApiError):
        return await api_error_handler(request, exc)

    @app.exception_handler(HTTPException)
    async def handle_http_error(request: Request, exc: HTTPException):
        detail = exc.detail if isinstance(exc.detail, dict) else {
            "code": "http_error",
            "message": str(exc.detail),
        }
        request_id = getattr(request.state, "request_id", None)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": detail.get("code", "http_error"),
                    "message": detail.get("message", "Error"),
                    "details": detail.get("details", {}),
                    "request_id": request_id,
                }
            },
            headers={"X-Request-ID": request_id} if request_id else None,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, exc: RequestValidationError):
        request_id = getattr(request.state, "request_id", None)
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Payload inválido",
                    "details": {"errors": exc.errors()},
                    "request_id": request_id,
                }
            },
            headers={"X-Request-ID": request_id} if request_id else None,
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, exc: Exception):
        logger.exception("unhandled error", exc_info=exc)
        return await unhandled_error_handler(request, exc)

    # Root aliases keep `docker compose up` + `/ready` usable by probes and by
    # the acceptance checklist, while the versioned API stays under /api/v1.
    @app.get("/health", include_in_schema=False)
    def root_health():
        return health_check()

    @app.get("/ready", include_in_schema=False)
    def root_ready(db: Session = Depends(get_db)):
        return ready_check(db)

    app.include_router(router)
    return app


app = create_app()
