from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from bson.errors import InvalidId

from app.models import NoteOut, TranscriptTurn
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
        call_id=doc.get("call_id", ""),
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


@router.get("/{note_id}", response_model=NoteOut)
async def get_note(note_id: str, current_user: dict = Depends(get_current_user)):
    doc = await notes_collection.find_one({"_id": _to_oid(note_id), "created_by.id": current_user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Note not found")
    return _doc_to_out(doc)


@router.delete("/{note_id}", status_code=204)
async def delete_note(note_id: str, current_user: dict = Depends(get_current_user)):
    doc = await notes_collection.find_one({"_id": _to_oid(note_id), "created_by.id": current_user["id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Note not found")
    await notes_collection.delete_one({"_id": doc["_id"]})
