from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import tasks, auth
from app.routers import organisations
from app.routers import voice
from app.routers import mcp_server
from app.routers import reminders
from app.routers import comments
from app.routers import attachments
from app.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(title="Task Management API", version="2.0.0", lifespan=lifespan)

import os as _os

_extra = _os.getenv("ALLOWED_ORIGINS", "")
_origins = ["http://localhost:5173", "http://localhost:5174"]
if _extra:
    _origins += [o.strip() for o in _extra.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(organisations.router)
app.include_router(voice.router)
app.include_router(mcp_server.router)
app.include_router(reminders.router)
app.include_router(comments.router)
app.include_router(attachments.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
