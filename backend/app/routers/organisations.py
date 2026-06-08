from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from bson import ObjectId
from app.models import Organisation, OrganisationUpdate, OrgMember, OrgRole, OrgSettings
from app.database import orgs_collection, users_collection
from app.auth import get_current_user

router = APIRouter(prefix="/api/organisations", tags=["organisations"])


def _doc_to_org(doc: dict) -> Organisation:
    s = doc.get("settings", {})
    return Organisation(
        id=str(doc["_id"]),
        name=doc["name"],
        slug=doc["slug"],
        settings=OrgSettings(**s) if isinstance(s, dict) else OrgSettings(),
        created_at=doc["created_at"],
    )


@router.get("/me", response_model=Organisation)
async def get_my_org(current_user: dict = Depends(get_current_user)):
    org_id = current_user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=404, detail="No organisation found")
    doc = await orgs_collection.find_one({"_id": ObjectId(org_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Organisation not found")
    return _doc_to_org(doc)


@router.patch("/me", response_model=Organisation)
async def update_my_org(data: OrganisationUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in (OrgRole.owner, OrgRole.admin):
        raise HTTPException(status_code=403, detail="Only owners and admins can update organisation")

    org_id = current_user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=404, detail="No organisation found")

    updates: dict = {}
    if data.name is not None:
        updates["name"] = data.name.strip()
    if data.settings is not None:
        updates["settings"] = data.settings.model_dump()

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    await orgs_collection.update_one({"_id": ObjectId(org_id)}, {"$set": updates})
    doc = await orgs_collection.find_one({"_id": ObjectId(org_id)})
    return _doc_to_org(doc)


@router.get("/me/members", response_model=list[OrgMember])
async def list_members(current_user: dict = Depends(get_current_user)):
    org_id = current_user.get("org_id")
    if not org_id:
        return []
    try:
        docs = await users_collection.find(
            {"org_id": ObjectId(org_id)}
        ).sort("name", 1).to_list(length=500)
    except Exception:
        return []

    return [
        OrgMember(
            id=str(d["_id"]),
            name=d["name"],
            email=d["email"],
            role=d.get("role", OrgRole.member),
            joined_at=d.get("created_at", datetime.now(timezone.utc)),
        )
        for d in docs
    ]
