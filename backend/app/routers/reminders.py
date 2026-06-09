from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone

from app.models import ReminderCreate, ReminderUpdate, ReminderOut
from app.database import reminders_collection
from app.auth import get_current_user

router = APIRouter(prefix="/api/reminders", tags=["reminders"])

VALID_CATEGORIES = {"personal", "work", "health", "other"}
VALID_STATUSES = {"pending", "completed", "cancelled"}


def _doc_to_out(doc: dict) -> ReminderOut:
    return ReminderOut(
        id=str(doc["_id"]),
        title=doc["title"],
        description=doc.get("description", ""),
        category=doc.get("category", "personal"),
        status=doc.get("status", "pending"),
        remind_at=doc.get("remind_at"),
        created_at=doc["created_at"],
        completed_at=doc.get("completed_at"),
        reminded=doc.get("reminded", False),
    )


def _to_oid(rid: str) -> ObjectId:
    try:
        return ObjectId(rid)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Reminder not found")


@router.get("", response_model=list[ReminderOut])
async def list_reminders(current_user: dict = Depends(get_current_user)):
    query = {"created_by.id": current_user["id"]}
    # Pending first, then by created_at descending
    docs = await reminders_collection.find(query).sort([
        ("status", 1),   # "cancelled" < "completed" < "pending" alphabetically — we re-sort in frontend
        ("created_at", -1),
    ]).to_list(length=500)
    return [_doc_to_out(d) for d in docs]


@router.post("", response_model=ReminderOut, status_code=status.HTTP_201_CREATED)
async def create_reminder(data: ReminderCreate, current_user: dict = Depends(get_current_user)):
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    category = data.category if data.category in VALID_CATEGORIES else "personal"
    doc = {
        "title": data.title.strip(),
        "description": data.description.strip(),
        "category": category,
        "status": "pending",
        "remind_at": data.remind_at,
        "created_by": {"id": current_user["id"], "name": current_user["name"], "email": current_user["email"]},
        "created_at": datetime.now(timezone.utc),
        "completed_at": None,
        "reminded": False,
    }
    result = await reminders_collection.insert_one(doc)
    created = await reminders_collection.find_one({"_id": result.inserted_id})
    return _doc_to_out(created)


@router.patch("/{reminder_id}", response_model=ReminderOut)
async def update_reminder(reminder_id: str, data: ReminderUpdate, current_user: dict = Depends(get_current_user)):
    oid = _to_oid(reminder_id)
    doc = await reminders_collection.find_one({"_id": oid, "created_by.id": current_user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Reminder not found")

    updates: dict = {}
    if data.title is not None:
        if not data.title.strip():
            raise HTTPException(status_code=400, detail="Title cannot be empty")
        updates["title"] = data.title.strip()
    if data.description is not None:
        updates["description"] = data.description.strip()
    if data.category is not None and data.category in VALID_CATEGORIES:
        updates["category"] = data.category
    if data.remind_at is not None:
        updates["remind_at"] = data.remind_at
        updates["reminded"] = False  # reset so notification fires again if date changed
    if data.status is not None and data.status in VALID_STATUSES:
        updates["status"] = data.status
        if data.status in ("completed", "cancelled"):
            updates["completed_at"] = datetime.now(timezone.utc)
        elif data.status == "pending":
            updates["completed_at"] = None

    if updates:
        await reminders_collection.update_one({"_id": oid}, {"$set": updates})

    updated = await reminders_collection.find_one({"_id": oid})
    return _doc_to_out(updated)


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(reminder_id: str, current_user: dict = Depends(get_current_user)):
    oid = _to_oid(reminder_id)
    doc = await reminders_collection.find_one({"_id": oid, "created_by.id": current_user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Reminder not found")
    await reminders_collection.delete_one({"_id": oid})
