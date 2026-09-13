import os
import logging
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from routers import interview, report

# Configure centralized logging format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("backend.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager executed when the server launches and shuts down.
    Prints the required startup message upon launch.
    """
    print("AI Interview Coach API started successfully")
    logger.info("AI Interview Coach API started successfully")
    yield


app = FastAPI(
    title="AI Interview Coach API",
    description="Backend API for AI-powered mock technical interviews and performance evaluations",
    version="1.0.0",
    lifespan=lifespan,
)


# Global exception handler for unhandled errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch unhandled exceptions and return user-friendly JSON message rather than raw traceback.
    Preserves explicitly raised HTTPExceptions (400, 404, etc.).
    """
    if isinstance(exc, (HTTPException, StarletteHTTPException)):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=getattr(exc, "headers", None),
        )
    logger.error("Unhandled exception caught on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )


# Configure CORS middleware with dynamic environment configuration
allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "*")
if allowed_origins_raw.strip() == "*":
    origins = ["*"]
else:
    origins = [o.strip() for o in allowed_origins_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True if origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers with their specified prefixes
app.include_router(interview.router, prefix="/api/interview")
app.include_router(report.router, prefix="/api/report")


@app.get("/")
def read_root():
    """Health check endpoint."""
    logger.debug("Health check ping received at '/'")
    return {"message": "AI Interview Coach API is running"}


@app.get("/health")
def health_check():
    """Explicit health check endpoint returning service status."""
    logger.debug("Health check ping received at '/health'")
    return {"status": "healthy", "message": "AI Interview Coach API is running"}
