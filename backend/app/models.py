from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class TaskStatus(str, Enum):
    assigned = "assigned"
    started = "started"
    in_progress = "in_progress"
    completed = "completed"
    reviewed = "reviewed"
    on_hold = "on_hold"


class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"


class OrgRole(str, Enum):
    owner = "owner"
    admin = "admin"
    member = "member"


# ── Organisation ─────────────────────────────────────────────────────────────

class OrgSettings(BaseModel):
    primary_color: str = "#1A55E3"
    logo_url: Optional[str] = None
    sms_enabled: bool = False
    email_enabled: bool = True


class Organisation(BaseModel):
    id: str
    name: str
    slug: str
    settings: OrgSettings
    created_at: datetime


class OrganisationUpdate(BaseModel):
    name: Optional[str] = None
    settings: Optional[OrgSettings] = None


class OrgMember(BaseModel):
    id: str
    name: str
    email: str
    role: OrgRole
    joined_at: datetime


# ── Users ─────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    org_name: str


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    pin: Optional[str] = None  # 4-6 digit voice PIN


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    org_id: str
    role: OrgRole
    org_name: str
    phone: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Tasks ─────────────────────────────────────────────────────────────────────

class Assignee(BaseModel):
    id: str
    name: str
    email: str


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    priority: Priority
    deadline: datetime
    tags: list[str] = []
    assigned_to: list[Assignee] = []


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[Priority] = None
    deadline: Optional[datetime] = None
    progress_percentage: Optional[int] = None
    tags: Optional[list[str]] = None


class Task(BaseModel):
    id: str
    title: str
    description: str
    status: TaskStatus
    priority: Priority
    deadline: datetime
    assigned_to: list[Assignee]
    created_by: Assignee
    created_at: datetime
    progress_percentage: int = 0
    tags: list[str] = []
    org_id: str = ""
    comment_count: int = 0
    attachment_count: int = 0


# ── Reminders ────────────────────────────────────────────────────────────────

class ReminderCreate(BaseModel):
    title: str
    description: str = ""
    category: str = "personal"   # personal | work | health | other
    remind_at: Optional[datetime] = None
    recurrence: Optional[str] = None  # daily | weekly | monthly


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    remind_at: Optional[datetime] = None
    status: Optional[str] = None  # pending | completed | cancelled
    recurrence: Optional[str] = None  # daily | weekly | monthly | null to clear


class ReminderOut(BaseModel):
    id: str
    title: str
    description: str
    category: str
    status: str
    remind_at: Optional[datetime] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    reminded: bool = False
    recurrence: Optional[str] = None


# ── Comments ─────────────────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    text: str


class CommentOut(BaseModel):
    id: str
    task_id: str
    text: str
    created_by: Assignee
    created_at: datetime


# ── Invitations ───────────────────────────────────────────────────────────────

class InvitationCreate(BaseModel):
    email: str
    role: OrgRole = OrgRole.member


class Invitation(BaseModel):
    id: str
    org_id: str
    email: str
    role: OrgRole
    token: str
    invited_by: str
    created_at: datetime
    expires_at: datetime
    accepted: bool = False


class InvitationPreview(BaseModel):
    org_name: str
    role: OrgRole
    email: str
    invited_by_name: str


class TranscriptTurn(BaseModel):
    role: str   # "agent" | "user"
    content: str


class NoteOut(BaseModel):
    id: str
    call_id: str
    summary: str
    transcript: str
    transcript_object: list[TranscriptTurn]
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    duration_seconds: Optional[int] = None
