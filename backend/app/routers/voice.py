"""
Voice endpoints — called by Retell AI as custom tool webhooks.
Each endpoint accepts a POST with args from Retell and returns a plain string
result that the LLM reads back to the caller.

Auth flow:
  1. verify_user(email, pin)  → voice_token (15-min JWT)
  2. All other tools pass voice_token in args
"""
import os
import logging
import re
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Header, Request
from jose import jwt, JWTError
from pydantic import BaseModel
from typing import Optional

from app.database import users_collection, tasks_collection, orgs_collection
from app.auth import verify_password, hash_password
from app.models import Priority

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["voice"])

VOICE_SECRET = os.getenv("VOICE_JWT_SECRET", "voice-secret-change-this")
VOICE_TOKEN_MINUTES = 15
RETELL_API_KEY = os.getenv("RETELL_API_KEY", "")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_voice_token(user_id: str, org_id: str) -> str:
    payload = {
        "sub": user_id,
        "org": org_id,
        "scope": "voice",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=VOICE_TOKEN_MINUTES),
    }
    return jwt.encode(payload, VOICE_SECRET, algorithm="HS256")


def _decode_voice_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, VOICE_SECRET, algorithms=["HS256"])
        if payload.get("scope") != "voice":
            raise ValueError("Not a voice token")
        return payload
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired voice session")


def _verify_retell(request: Request):
    """Optional Retell API key check — set RETELL_API_KEY in .env to enforce."""
    if not RETELL_API_KEY:
        return
    key = request.headers.get("x-retell-api-key", "")
    if key != RETELL_API_KEY:
        raise HTTPException(status_code=403, detail="Unauthorized")


def _parse_deadline(raw: str) -> datetime | None:
    """Parse common date strings. LLM should send ISO format; this is a fallback."""
    raw = raw.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%B %d %Y", "%b %d %Y"):
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


async def _resolve_member(name: str, org_id: str) -> dict | None:
    """Fuzzy match member name within org — returns user doc or None."""
    pattern = re.compile(re.escape(name.strip()), re.IGNORECASE)
    async for doc in users_collection.find({"org_id": ObjectId(org_id)}):
        if pattern.search(doc.get("name", "")):
            return doc
    return None


# ── Tool: verify_user ─────────────────────────────────────────────────────────

class VerifyUserArgs(BaseModel):
    email: str
    pin: str


@router.post("/verify-user")
async def verify_user(args: VerifyUserArgs, request: Request):
    _verify_retell(request)
    doc = await users_collection.find_one({"email": args.email.lower().strip()})
    if not doc or not doc.get("pin_hash"):
        return {"result": "I couldn't find that account or no voice PIN is set. Please set your voice PIN in the app settings first."}

    if not verify_password(args.pin.strip(), doc["pin_hash"]):
        return {"result": "Incorrect PIN. Please try again."}

    org_id = str(doc.get("org_id", ""))
    token = _make_voice_token(str(doc["_id"]), org_id)

    # Fetch org name
    org_name = ""
    if org_id:
        org = await orgs_collection.find_one({"_id": doc["org_id"]})
        if org:
            org_name = org.get("name", "")

    return {
        "result": f"Verified. Welcome, {doc['name']}.",
        "voice_token": token,
        "user_name": doc["name"],
        "org_name": org_name,
    }


# ── Tool: create_task ─────────────────────────────────────────────────────────

class CreateTaskArgs(BaseModel):
    voice_token: str
    title: str
    description: Optional[str] = ""
    deadline: str          # ISO date string — LLM resolves "next Friday" to this
    priority: Optional[str] = "medium"
    assignee_name: Optional[str] = None


@router.post("/create-task")
async def voice_create_task(args: CreateTaskArgs, request: Request):
    _verify_retell(request)
    payload = _decode_voice_token(args.voice_token)
    user_id = payload["sub"]
    org_id = payload["org"]

    # Resolve deadline
    deadline = _parse_deadline(args.deadline)
    if not deadline:
        return {"result": f"I couldn't understand the deadline '{args.deadline}'. Could you say the date again in a clearer format, like June 15th 2025?"}

    # Validate priority
    priority_map = {"low": "low", "medium": "medium", "high": "high", "urgent": "urgent"}
    priority = priority_map.get((args.priority or "medium").lower(), "medium")

    # Resolve creator
    creator_doc = await users_collection.find_one({"_id": ObjectId(user_id)})
    if not creator_doc:
        return {"result": "Session error. Please call back and verify again."}

    creator = {"id": user_id, "name": creator_doc["name"], "email": creator_doc["email"]}

    # Resolve assignee
    assignee = creator  # default to self
    assignee_display = "yourself"
    if args.assignee_name:
        member = await _resolve_member(args.assignee_name, org_id)
        if not member:
            return {"result": f"I couldn't find a team member named '{args.assignee_name}'. Could you spell the name or try again?"}
        if member.get("_id") and str(member["_id"]) != user_id:
            assignee = {"id": str(member["_id"]), "name": member["name"], "email": member["email"]}
            assignee_display = member["name"]

    doc = {
        "title": args.title,
        "description": args.description or "",
        "priority": priority,
        "deadline": deadline,
        "status": "assigned",
        "tags": [],
        "assigned_to": [assignee],
        "created_by": creator,
        "created_at": datetime.now(timezone.utc),
        "progress_percentage": 0,
        "org_id": ObjectId(org_id) if org_id else None,
        "deleted_at": None,
        "source": "voice",
    }
    await tasks_collection.insert_one(doc)

    deadline_str = deadline.strftime("%B %d, %Y")
    return {
        "result": (
            f"Done. I've created the task '{args.title}', assigned to {assignee_display}, "
            f"{priority} priority, due {deadline_str}. Is there anything else?"
        )
    }


# ── Tool: update_task_status ──────────────────────────────────────────────────

class UpdateTaskArgs(BaseModel):
    voice_token: str
    task_title: str        # partial match
    new_status: str        # "started", "in_progress", "completed", "on_hold"


@router.post("/update-task")
async def voice_update_task(args: UpdateTaskArgs, request: Request):
    _verify_retell(request)
    payload = _decode_voice_token(args.voice_token)
    user_id = payload["sub"]
    org_id = payload["org"]

    status_map = {
        "started": "started",
        "start": "started",
        "in progress": "in_progress",
        "in_progress": "in_progress",
        "completed": "completed",
        "complete": "completed",
        "done": "completed",
        "on hold": "on_hold",
        "on_hold": "on_hold",
        "hold": "on_hold",
    }
    new_status = status_map.get(args.new_status.lower().strip())
    if not new_status:
        return {"result": f"I don't recognise the status '{args.new_status}'. You can say started, in progress, completed, or on hold."}

    pattern = re.compile(re.escape(args.task_title.strip()), re.IGNORECASE)
    query = {
        "org_id": ObjectId(org_id) if org_id else None,
        "deleted_at": None,
        "$or": [
            {"assigned_to": {"$elemMatch": {"id": user_id}}},
            {"created_by.id": user_id},
        ],
    }
    doc = None
    async for candidate in tasks_collection.find(query):
        if pattern.search(candidate.get("title", "")):
            doc = candidate
            break

    if not doc:
        return {"result": f"I couldn't find a task matching '{args.task_title}' in your list. Could you say the task name again?"}

    await tasks_collection.update_one({"_id": doc["_id"]}, {"$set": {"status": new_status}})
    readable = new_status.replace("_", " ")
    return {"result": f"Updated. '{doc['title']}' is now marked as {readable}."}


# ── Tool: list_my_tasks ───────────────────────────────────────────────────────

class ListTasksArgs(BaseModel):
    voice_token: str


@router.post("/list-tasks")
async def voice_list_tasks(args: ListTasksArgs, request: Request):
    _verify_retell(request)
    payload = _decode_voice_token(args.voice_token)
    user_id = payload["sub"]
    org_id = payload["org"]

    query = {
        "org_id": ObjectId(org_id) if org_id else None,
        "deleted_at": None,
        "status": {"$nin": ["completed", "reviewed"]},
        "assigned_to": {"$elemMatch": {"id": user_id}},
    }
    docs = await tasks_collection.find(query).sort("deadline", 1).to_list(length=10)

    if not docs:
        return {"result": "You have no open tasks at the moment."}

    lines = []
    for d in docs:
        deadline_str = d["deadline"].strftime("%B %d") if d.get("deadline") else "no deadline"
        lines.append(f"'{d['title']}' — {d.get('priority', 'medium')} priority, due {deadline_str}, status {d['status'].replace('_', ' ')}")

    summary = f"You have {len(docs)} open task{'s' if len(docs) > 1 else ''}. " + ". Next: ".join(lines[:3])
    return {"result": summary}


# ── Tool: update_task_details ────────────────────────────────────────────────

class UpdateTaskDetailsArgs(BaseModel):
    voice_token: str
    task_title: str                  # partial match to find the task
    new_title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[str] = None   # YYYY-MM-DD
    priority: Optional[str] = None   # low / medium / high / urgent


@router.post("/update-task-details")
async def voice_update_task_details(args: UpdateTaskDetailsArgs, request: Request):
    _verify_retell(request)
    payload = _decode_voice_token(args.voice_token)
    user_id = payload["sub"]
    org_id = payload["org"]

    # Build the update dict from whatever was provided
    updates: dict = {}

    if args.new_title and args.new_title.strip():
        updates["title"] = args.new_title.strip()

    if args.description is not None:
        updates["description"] = args.description.strip()

    if args.deadline:
        parsed = _parse_deadline(args.deadline)
        if not parsed:
            return {"result": f"I couldn't understand the deadline '{args.deadline}'. Please say it as a date like June 20th 2026."}
        updates["deadline"] = parsed

    if args.priority:
        priority_map = {"low": "low", "medium": "medium", "high": "high", "urgent": "urgent"}
        mapped = priority_map.get(args.priority.lower().strip())
        if not mapped:
            return {"result": f"I don't recognise the priority '{args.priority}'. You can say low, medium, high, or urgent."}
        updates["priority"] = mapped

    if not updates:
        return {"result": "No changes were provided. Please tell me what you'd like to update — title, description, deadline, or priority."}

    # Find the task by partial title match (same org, not deleted, caller is assignee or creator)
    pattern = re.compile(re.escape(args.task_title.strip()), re.IGNORECASE)
    query = {
        "org_id": ObjectId(org_id) if org_id else None,
        "deleted_at": None,
        "$or": [
            {"assigned_to": {"$elemMatch": {"id": user_id}}},
            {"created_by.id": user_id},
        ],
    }
    doc = None
    async for candidate in tasks_collection.find(query):
        if pattern.search(candidate.get("title", "")):
            doc = candidate
            break

    if not doc:
        return {"result": f"I couldn't find a task matching '{args.task_title}' in your list. Could you say the task name again?"}

    await tasks_collection.update_one({"_id": doc["_id"]}, {"$set": updates})

    changed = []
    if "title" in updates:       changed.append(f"title to '{updates['title']}'")
    if "description" in updates: changed.append("description")
    if "deadline" in updates:    changed.append(f"deadline to {updates['deadline'].strftime('%B %d, %Y')}")
    if "priority" in updates:    changed.append(f"priority to {updates['priority']}")

    summary = " and ".join(changed)
    return {"result": f"Done. I've updated the task '{doc['title']}' — changed {summary}. Anything else?"}


# ── Tool: find_member ─────────────────────────────────────────────────────────

class FindMemberArgs(BaseModel):
    voice_token: str
    name: str


@router.post("/find-member")
async def voice_find_member(args: FindMemberArgs, request: Request):
    _verify_retell(request)
    payload = _decode_voice_token(args.voice_token)
    org_id = payload["org"]

    pattern = re.compile(re.escape(args.name.strip()), re.IGNORECASE)
    matches = []
    async for doc in users_collection.find({"org_id": ObjectId(org_id)}):
        if pattern.search(doc.get("name", "")):
            matches.append(doc["name"])

    if not matches:
        return {"result": f"No team member found matching '{args.name}'."}
    if len(matches) == 1:
        return {"result": f"Found {matches[0]}."}
    return {"result": f"I found multiple matches: {', '.join(matches)}. Which one did you mean?"}
