from fastapi import APIRouter, HTTPException, status, Depends
from datetime import datetime, timedelta, timezone
import secrets
import re
import os
from bson import ObjectId
from app.models import (
    UserCreate, UserLogin, UserOut, UserProfileUpdate, TokenResponse, OrgRole,
    InvitationCreate, Invitation, InvitationPreview,
)
from app.services.phone import validate_canadian_phone
from app.database import users_collection, orgs_collection, invitations_collection
from app.auth import hash_password, verify_password, create_token, get_current_user
from app.services.notifications import notify_invitation

router = APIRouter(prefix="/api/auth", tags=["auth"])

APP_URL = os.getenv("APP_URL", "http://localhost:5173")


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower().strip()).strip("-")
    return slug or "org"


def _user_out(doc: dict, org_name: str) -> UserOut:
    return UserOut(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        org_id=str(doc.get("org_id", "")),
        role=doc.get("role", OrgRole.member),
        org_name=org_name,
        phone=doc.get("phone"),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate):
    if await users_collection.find_one({"email": data.email.lower()}):
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create organisation
    slug = _slugify(data.org_name)
    existing_slugs = await orgs_collection.count_documents({"slug": {"$regex": f"^{slug}"}})
    if existing_slugs:
        slug = f"{slug}-{existing_slugs + 1}"

    org_doc = {
        "name": data.org_name.strip(),
        "slug": slug,
        "settings": {"primary_color": "#1A55E3", "sms_enabled": False, "email_enabled": True},
        "created_at": datetime.now(timezone.utc),
    }
    org_result = await orgs_collection.insert_one(org_doc)
    org_id = org_result.inserted_id

    # Create owner user
    user_doc = {
        "name": data.name.strip(),
        "email": data.email.lower().strip(),
        "password_hash": hash_password(data.password),
        "org_id": org_id,
        "role": OrgRole.owner,
        "created_at": datetime.now(timezone.utc),
    }
    user_result = await users_collection.insert_one(user_doc)
    user_doc["_id"] = user_result.inserted_id

    return TokenResponse(
        access_token=create_token(str(user_result.inserted_id)),
        user=_user_out(user_doc, data.org_name.strip()),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin):
    doc = await users_collection.find_one({"email": data.email.lower().strip()})
    if not doc or not verify_password(data.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    org_name = ""
    if doc.get("org_id"):
        org = await orgs_collection.find_one({"_id": doc["org_id"]})
        if org:
            org_name = org.get("name", "")

    return TokenResponse(
        access_token=create_token(str(doc["_id"])),
        user=_user_out(doc, org_name),
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    return UserOut(**current_user)


@router.patch("/profile", response_model=UserOut)
async def update_profile(data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    updates: dict = {}
    if data.name is not None:
        updates["name"] = data.name.strip()
    if data.phone is not None:
        if data.phone == "":
            updates["phone"] = None
        else:
            e164 = validate_canadian_phone(data.phone)
            if not e164:
                raise HTTPException(status_code=422, detail="Must be a valid Canadian mobile number (e.g. +1 613 555 1234)")
            updates["phone"] = e164

    if data.pin is not None:
        pin = data.pin.strip()
        if pin == "":
            updates["pin_hash"] = None
        elif not pin.isdigit() or not (4 <= len(pin) <= 6):
            raise HTTPException(status_code=422, detail="Voice PIN must be 4 to 6 digits")
        else:
            updates["pin_hash"] = hash_password(pin)

    if updates:
        await users_collection.update_one({"_id": ObjectId(current_user["id"])}, {"$set": updates})

    doc = await users_collection.find_one({"_id": ObjectId(current_user["id"])})
    org_name = current_user.get("org_name", "")
    return _user_out(doc, org_name)


@router.get("/users", response_model=list[UserOut])
async def list_users(current_user: dict = Depends(get_current_user)):
    org_id = current_user.get("org_id")
    if not org_id:
        return []
    try:
        docs = await users_collection.find(
            {"org_id": ObjectId(org_id)}
        ).sort("name", 1).to_list(length=500)
    except Exception:
        return []

    org_name = current_user.get("org_name", "")
    return [_user_out(d, org_name) for d in docs]


# ── Invitations ───────────────────────────────────────────────────────────────

@router.post("/invitations", response_model=Invitation, status_code=status.HTTP_201_CREATED)
async def create_invitation(data: InvitationCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in (OrgRole.owner, OrgRole.admin):
        raise HTTPException(status_code=403, detail="Only owners and admins can invite members")

    org_id = current_user["org_id"]
    email = data.email.lower().strip()

    # Check if already a member
    if await users_collection.find_one({"email": email, "org_id": ObjectId(org_id)}):
        raise HTTPException(status_code=400, detail="User is already a member of this organisation")

    # Invalidate any previous pending invite for same email+org
    await invitations_collection.update_many(
        {"org_id": ObjectId(org_id), "email": email, "accepted": False},
        {"$set": {"accepted": True}},
    )

    token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc)
    doc = {
        "org_id": ObjectId(org_id),
        "email": email,
        "role": data.role,
        "token": token,
        "invited_by": current_user["id"],
        "created_at": now,
        "expires_at": now + timedelta(days=7),
        "accepted": False,
    }
    result = await invitations_collection.insert_one(doc)

    invite_url = f"{APP_URL}/invite/{token}"
    await notify_invitation(email, current_user["org_name"], invite_url, current_user["name"])

    return Invitation(
        id=str(result.inserted_id),
        org_id=org_id,
        email=email,
        role=data.role,
        token=token,
        invited_by=current_user["id"],
        created_at=now,
        expires_at=now + timedelta(days=7),
        accepted=False,
    )


@router.get("/invitations/preview/{token}", response_model=InvitationPreview)
async def preview_invitation(token: str):
    inv = await invitations_collection.find_one({"token": token, "accepted": False})
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found or already used")
    if inv["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invitation has expired")

    org = await orgs_collection.find_one({"_id": inv["org_id"]})
    inviter = await users_collection.find_one({"_id": ObjectId(inv["invited_by"])})

    return InvitationPreview(
        org_name=org["name"] if org else "Unknown",
        role=inv["role"],
        email=inv["email"],
        invited_by_name=inviter["name"] if inviter else "Someone",
    )


@router.post("/invitations/accept/{token}", response_model=TokenResponse)
async def accept_invitation(token: str, data: UserLogin):
    inv = await invitations_collection.find_one({"token": token, "accepted": False})
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found or already used")
    if inv["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="Invitation has expired")
    if data.email.lower().strip() != inv["email"]:
        raise HTTPException(status_code=400, detail="Email does not match invitation")

    # Accept = create user account (or update if somehow exists without org)
    existing = await users_collection.find_one({"email": inv["email"]})
    if existing and existing.get("org_id"):
        raise HTTPException(status_code=400, detail="Account already exists")

    org = await orgs_collection.find_one({"_id": inv["org_id"]})
    org_name = org["name"] if org else ""

    if existing:
        # Edge case: user exists but has no org yet
        await users_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {"org_id": inv["org_id"], "role": inv["role"]}},
        )
        user_doc = {**existing, "org_id": inv["org_id"], "role": inv["role"]}
        user_id = str(existing["_id"])
    else:
        user_doc = {
            "name": data.email.split("@")[0].capitalize(),
            "email": inv["email"],
            "password_hash": hash_password(data.password),
            "org_id": inv["org_id"],
            "role": inv["role"],
            "created_at": datetime.now(timezone.utc),
        }
        result = await users_collection.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
        user_id = str(result.inserted_id)

    await invitations_collection.update_one({"_id": inv["_id"]}, {"$set": {"accepted": True}})

    return TokenResponse(
        access_token=create_token(user_id),
        user=_user_out(user_doc, org_name),
    )
