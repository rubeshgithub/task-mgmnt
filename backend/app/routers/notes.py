from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends, status
from bson import ObjectId
from bson.errors import InvalidId

from app.models import NoteOut, NoteCreate, NoteUpdate, TranscriptTurn
from app.database import notes_collection
from app.auth import get_current_user

router = APIRouter(prefix="/api/notes", tags=["notes"])


def _doc_to_out(doc: dict) -> NoteOut:
    started_at = doc.get("started_at")
    ended_at = doc.get("ended_at")
    duration = None
    if started_at and ended_at:
        duration = int((ended_at - started_at).total_seconds())

    turns = [
        TranscriptTurn(role=t.get("role", "agent"), content=t.get("content", ""))
        for t in (doc.get("transcript_object") or [])
    ]

    return NoteOut(
        id=str(doc["_id"]),
        source=doc.get("source", "voice"),
        call_id=doc.get("call_id", ""),
        title=doc.get("title"),
        body=doc.get("body"),
        summary=doc.get("summary", ""),
        transcript=doc.get("transcript", ""),
        transcript_object=turns,
        started_at=started_at,
        ended_at=ended_at,
        created_at=doc["created_at"],
        duration_seconds=duration,
    )


def _to_oid(nid: str) -> ObjectId:
    try:
        return ObjectId(nid)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Note not found")


@router.get("", response_model=list[NoteOut])
async def list_notes(current_user: dict = Depends(get_current_user)):
    docs = await notes_collection.find(
        {"created_by.id": current_user["id"]}
    ).sort("created_at", -1).to_list(length=200)
    return [_doc_to_out(d) for d in docs]


@router.post("", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(data: NoteCreate, current_user: dict = Depends(get_current_user)):
    if not data.body.strip():
        raise HTTPException(status_code=400, detail="Body is required")
    doc = {
        "source": "manual",
        "call_id": "",
        "title": data.title.strip() if data.title and data.title.strip() else None,
        "body": data.body.strip(),
        "summary": "",
        "transcript": "",
        "transcript_object": [],
        "created_by": {"id": current_user["id"], "name": current_user["name"], "email": current_user["email"]},
        "org_id": ObjectId(current_user["org_id"]) if current_user.get("org_id") else None,
        "started_at": None,
        "ended_at": None,
        "created_at": datetime.now(timezone.utc),
    }
    result = await notes_collection.insert_one(doc)
    created = await notes_collection.find_one({"_id": result.inserted_id})
    return _doc_to_out(created)


@router.patch("/{note_id}", response_model=NoteOut)
async def update_note(note_id: str, data: NoteUpdate, current_user: dict = Depends(get_current_user)):
    oid = _to_oid(note_id)
    doc = await notes_collection.find_one({"_id": oid, "created_by.id": current_user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Note not found")
    if doc.get("source") != "manual":
        raise HTTPException(status_code=400, detail="Voice notes cannot be edited")

    updates: dict = {}
    if data.title is not None:
        updates["title"] = data.title.strip() or None
    if data.body is not None:
        if not data.body.strip():
            raise HTTPException(status_code=400, detail="Body cannot be empty")
        updates["body"] = data.body.strip()

    if updates:
        await notes_collection.update_one({"_id": oid}, {"$set": updates})

    updated = await notes_collection.find_one({"_id": oid})
    return _doc_to_out(updated)


@router.get("/{note_id}", response_model=NoteOut)
async def get_note(note_id: str, current_user: dict = Depends(get_current_user)):
    doc = await notes_collection.find_one({"_id": _to_oid(note_id), "created_by.id": current_user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Note not found")
    return _doc_to_out(doc)


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(note_id: str, current_user: dict = Depends(get_current_user)):
    doc = await notes_collection.find_one({"_id": _to_oid(note_id), "created_by.id": current_user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Note not found")
    await notes_collection.delete_one({"_id": doc["_id"]})
