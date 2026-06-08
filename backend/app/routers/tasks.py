from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone
import asyncio
import logging
import os

logger = logging.getLogger(__name__)
from app.models import Task, TaskCreate, TaskUpdate
from app.database import tasks_collection, users_collection
from app.auth import get_current_user
from app.services.notifications import notify_task_assigned, notify_task_deleted, notify_task_completed

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

ELEVATED = {"owner", "admin"}


def doc_to_task(doc: dict) -> Task:
    doc["id"] = str(doc.pop("_id"))
    if "org_id" in doc:
        doc["org_id"] = str(doc["org_id"])
    return Task(**doc)


def to_oid(task_id: str) -> ObjectId:
    try:
        return ObjectId(task_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Task not found")


def _org_filter(current_user: dict) -> dict:
    org_id = current_user.get("org_id")
    if org_id:
        try:
            return {"org_id": ObjectId(org_id), "deleted_at": None}
        except Exception:
            pass
    return {"deleted_at": None}


def _can_manage_task(doc: dict, current_user: dict) -> bool:
    """Owner/admin can manage any task. Member can only manage tasks they created."""
    if current_user.get("role") in ELEVATED:
        return True
    return doc.get("created_by", {}).get("id") == current_user["id"]


@router.get("/", response_model=list[Task])
async def list_tasks(current_user: dict = Depends(get_current_user)):
    query = _org_filter(current_user)
    if current_user.get("role") == "member":
        query["assigned_to"] = {"$elemMatch": {"id": current_user["id"]}}
    docs = await tasks_collection.find(query).sort("created_at", -1).to_list(length=500)
    return [doc_to_task(d) for d in docs]


@router.post("/", response_model=Task, status_code=status.HTTP_201_CREATED)
async def create_task(data: TaskCreate, current_user: dict = Depends(get_current_user)):
    assignees = [a.model_dump() for a in data.assigned_to] if data.assigned_to else [
        {"id": current_user["id"], "name": current_user["name"], "email": current_user["email"]}
    ]
    org_id = current_user.get("org_id")
    doc = {
        **data.model_dump(exclude={"assigned_to"}),
        "status": "assigned",
        "assigned_to": assignees,
        "created_by": {"id": current_user["id"], "name": current_user["name"], "email": current_user["email"]},
        "created_at": datetime.now(timezone.utc),
        "progress_percentage": 0,
        "org_id": ObjectId(org_id) if org_id else None,
        "deleted_at": None,
    }
    result = await tasks_collection.insert_one(doc)
    created = await tasks_collection.find_one({"_id": result.inserted_id})
    task = doc_to_task(created)

    app_url = os.getenv("APP_URL", "http://localhost:5173")
    deadline_str = data.deadline.strftime("%b %d, %Y")

    async def _notify_assignees():
        try:
            for assignee in assignees:
                if assignee["id"] == current_user["id"]:
                    continue
                user_doc = await users_collection.find_one({"_id": ObjectId(assignee["id"])})
                phone = user_doc.get("phone") if user_doc else None
                await notify_task_assigned(
                    assignee_email=assignee["email"],
                    assignee_name=assignee["name"],
                    assignee_phone=phone,
                    task_title=data.title,
                    task_priority=data.priority.value,
                    task_deadline=deadline_str,
                    assigned_by=current_user["name"],
                    task_url=f"{app_url}/tasks",
                )
                logger.info("Assignment notification sent to %s", assignee["email"])
        except Exception as e:
            logger.error("Assignment notification failed: %s", e)

    asyncio.ensure_future(_notify_assignees())
    return task


@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    query = {"_id": to_oid(task_id), **_org_filter(current_user)}
    doc = await tasks_collection.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")
    return doc_to_task(doc)


@router.patch("/{task_id}", response_model=Task)
async def update_task(task_id: str, data: TaskUpdate, current_user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided")

    query = {"_id": to_oid(task_id), **_org_filter(current_user)}
    doc_before = await tasks_collection.find_one(query)
    if not doc_before:
        raise HTTPException(status_code=404, detail="Task not found")

    # Members can update status/progress on assigned tasks, but only edit
    # title/description/priority/deadline on tasks they created.
    editable_fields = {"title", "description", "priority", "deadline", "tags"}
    if updates.keys() & editable_fields and not _can_manage_task(doc_before, current_user):
        raise HTTPException(status_code=403, detail="You can only edit tasks you created")

    await tasks_collection.update_one({"_id": doc_before["_id"]}, {"$set": updates})
    updated = await tasks_collection.find_one({"_id": doc_before["_id"]})

    if updates.get("status") == "completed" and doc_before.get("status") != "completed":
        creator = doc_before.get("created_by", {})
        logger.info("Task completed — creator: %s, current_user: %s", creator.get("id"), current_user["id"])
        if creator.get("id") and creator.get("email"):
            app_url = os.getenv("APP_URL", "http://localhost:5173")
            async def _notify_completed():
                try:
                    await notify_task_completed(
                        creator_email=creator["email"],
                        task_title=doc_before["title"],
                        completed_by=current_user["name"],
                        task_url=f"{app_url}/tasks",
                    )
                    logger.info("Completion email sent to %s", creator["email"])
                except Exception as e:
                    logger.error("Completion notification failed: %s", e)
            asyncio.ensure_future(_notify_completed())

    return doc_to_task(updated)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    query = {"_id": to_oid(task_id), **_org_filter(current_user)}
    doc = await tasks_collection.find_one(query)
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")

    if not _can_manage_task(doc, current_user):
        raise HTTPException(status_code=403, detail="You can only delete tasks you created")

    # Soft delete — preserve for audit trail
    await tasks_collection.update_one(
        {"_id": doc["_id"]},
        {"$set": {"deleted_at": datetime.now(timezone.utc), "deleted_by": current_user["id"]}},
    )

    async def _notify_deleted():
        try:
            for assignee in doc.get("assigned_to", []):
                if assignee["id"] == current_user["id"]:
                    continue
                await notify_task_deleted(
                    assignee_email=assignee["email"],
                    task_title=doc["title"],
                    deleted_by=current_user["name"],
                )
        except Exception as e:
            logger.error("Delete notification failed: %s", e)

    asyncio.ensure_future(_notify_deleted())
