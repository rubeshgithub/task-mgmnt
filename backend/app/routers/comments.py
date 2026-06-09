from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone

from app.models import CommentCreate, CommentOut, Assignee
from app.database import tasks_collection, comments_collection
from app.auth import get_current_user

router = APIRouter(prefix="/api/tasks/{task_id}/comments", tags=["comments"])


def _to_oid(id: str) -> ObjectId:
    try:
        return ObjectId(id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Not found")


def _doc_to_out(doc: dict) -> CommentOut:
    return CommentOut(
        id=str(doc["_id"]),
        task_id=doc["task_id"],
        text=doc["text"],
        created_by=Assignee(**doc["created_by"]),
        created_at=doc["created_at"],
    )


async def _get_task_in_org(task_id: str, org_id: str):
    try:
        org_oid = ObjectId(org_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Task not found")
    task = await tasks_collection.find_one({"_id": _to_oid(task_id), "org_id": org_oid})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("", response_model=list[CommentOut])
async def list_comments(task_id: str, current_user: dict = Depends(get_current_user)):
    await _get_task_in_org(task_id, current_user["org_id"])
    docs = await comments_collection.find({"task_id": task_id}).sort("created_at", 1).to_list(500)
    return [_doc_to_out(d) for d in docs]


@router.post("", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def create_comment(task_id: str, data: CommentCreate, current_user: dict = Depends(get_current_user)):
    await _get_task_in_org(task_id, current_user["org_id"])
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    doc = {
        "task_id": task_id,
        "text": data.text.strip(),
        "created_by": {"id": current_user["id"], "name": current_user["name"], "email": current_user["email"]},
        "created_at": datetime.now(timezone.utc),
    }
    result = await comments_collection.insert_one(doc)
    await tasks_collection.update_one({"_id": _to_oid(task_id)}, {"$inc": {"comment_count": 1}})
    created = await comments_collection.find_one({"_id": result.inserted_id})
    return _doc_to_out(created)


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(task_id: str, comment_id: str, current_user: dict = Depends(get_current_user)):
    await _get_task_in_org(task_id, current_user["org_id"])
    comment = await comments_collection.find_one({"_id": _to_oid(comment_id), "task_id": task_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    is_author = comment["created_by"]["id"] == current_user["id"]
    is_admin = current_user.get("role") in ("owner", "admin")
    if not is_author and not is_admin:
        raise HTTPException(status_code=403, detail="Not allowed")
    await comments_collection.delete_one({"_id": _to_oid(comment_id)})
    await tasks_collection.update_one({"_id": _to_oid(task_id)}, {"$inc": {"comment_count": -1}})
