from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "task_mgmnt")

client = AsyncIOMotorClient(MONGODB_URI)
db = client[DATABASE_NAME]
tasks_collection = db["tasks"]
users_collection = db["users"]
orgs_collection = db["organisations"]
invitations_collection = db["invitations"]
