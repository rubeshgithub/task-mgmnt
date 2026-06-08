from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from bson.errors import InvalidId
from app.database import users_collection, orgs_collection
import bcrypt
import os

SECRET_KEY = os.getenv("JWT_SECRET", "change-this-secret")
ALGORITHM = "HS256"
EXPIRY_DAYS = int(os.getenv("JWT_EXPIRY_DAYS", "7"))

bearer = HTTPBearer()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=EXPIRY_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub", "")
        doc = await users_collection.find_one({"_id": ObjectId(user_id)})
    except (JWTError, InvalidId, Exception):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    if not doc:
        raise HTTPException(status_code=401, detail="User not found")

    org_id = str(doc.get("org_id", ""))
    org_name = ""
    if org_id:
        try:
            org = await orgs_collection.find_one({"_id": ObjectId(org_id)})
            if org:
                org_name = org.get("name", "")
        except Exception:
            pass

    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "email": doc["email"],
        "org_id": org_id,
        "role": doc.get("role", "member"),
        "org_name": org_name,
        "phone": doc.get("phone"),
    }
