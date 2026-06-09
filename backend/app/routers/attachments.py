import boto3
import os
from uuid import uuid4
from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, status
from bson import ObjectId
from datetime import datetime, timezone

from app.database import tasks_collection
from app.auth import get_current_user

router = APIRouter(prefix="/api/tasks/{task_id}/attachments", tags=["attachments"])

MAX_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain", "text/csv",
}

FILE_ICONS: dict[str, str] = {
    "image/": "🖼️",
    "application/pdf": "📄",
    "text/": "📝",
    "application/vnd.ms-excel": "📊",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "📊",
    "application/msword": "📝",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "📝",
}


def _s3_client():
    return boto3.client(
        "s3",
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )


def _get_bucket() -> str:
    bucket = os.getenv("AWS_S3_BUCKET")
    if not bucket:
        raise HTTPException(status_code=503, detail="File storage not configured — set AWS_S3_BUCKET")
    return bucket


async def _get_task(task_id: str, org_id: str) -> dict:
    try:
        task_oid = ObjectId(task_id)
        org_oid  = ObjectId(org_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Task not found")
    task = await tasks_collection.find_one({"_id": task_oid, "org_id": org_oid})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("")
async def list_attachments(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await _get_task(task_id, current_user["org_id"])
    attachments = task.get("attachments", [])
    if not attachments:
        return []
    bucket = _get_bucket()
    s3 = _s3_client()
    result = []
    for att in attachments:
        try:
            url = s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": bucket, "Key": att["key"]},
                ExpiresIn=3600,
            )
        except Exception:
            url = att.get("url", "")
        result.append({**att, "url": url})
    return result


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    task_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    await _get_task(task_id, current_user["org_id"])

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"File type '{file.content_type}' not allowed")

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    bucket = _get_bucket()
    key = f"attachments/{task_id}/{uuid4()}/{file.filename}"
    s3 = _s3_client()
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=content,
        ContentType=file.content_type,
        ContentDisposition=f'attachment; filename="{file.filename}"',
    )

    attachment = {
        "key": key,
        "name": file.filename,
        "size": len(content),
        "content_type": file.content_type,
        "uploaded_by": {"id": current_user["id"], "name": current_user["name"]},
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    await tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$push": {"attachments": attachment}, "$inc": {"attachment_count": 1}},
    )
    url = s3.generate_presigned_url("get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=3600)
    return {**attachment, "url": url}


@router.delete("/{attachment_key:path}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    task_id: str,
    attachment_key: str,
    current_user: dict = Depends(get_current_user),
):
    task = await _get_task(task_id, current_user["org_id"])
    att = next((a for a in task.get("attachments", []) if a["key"] == attachment_key), None)
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")

    is_uploader = att["uploaded_by"]["id"] == current_user["id"]
    is_admin = current_user.get("role") in ("owner", "admin")
    if not is_uploader and not is_admin:
        raise HTTPException(status_code=403, detail="Not allowed")

    try:
        bucket = _get_bucket()
        _s3_client().delete_object(Bucket=bucket, Key=attachment_key)
    except Exception:
        pass

    await tasks_collection.update_one(
        {"_id": ObjectId(task_id)},
        {"$pull": {"attachments": {"key": attachment_key}}, "$inc": {"attachment_count": -1}},
    )
