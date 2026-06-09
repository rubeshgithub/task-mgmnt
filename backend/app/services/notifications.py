"""
Notification routing:
  SMS  = time-sensitive, requires immediate action (urgent/high + deadline/overdue)
  Email = informational, archivable (all assignment/completion events)

Priority thresholds for SMS: urgent and high only.
"""
import logging
from app.services.email import send_invitation_email, send_task_email
from app.services.sms import send_sms

logger = logging.getLogger(__name__)

SMS_PRIORITIES = {"urgent", "high"}


# ── Invitations ───────────────────────────────────────────────────────────────

async def notify_invitation(to_email: str, org_name: str, invite_url: str, invited_by: str, to_phone: str | None = None):
    await send_invitation_email(to_email, org_name, invite_url, invited_by)
    if to_phone:
        msg = f"You've been invited to join {org_name} on TaskFlow. Sign up here: {invite_url}"
        await send_sms(to_phone, msg)


# ── Task assigned ─────────────────────────────────────────────────────────────

async def notify_task_assigned(
    assignee_email: str,
    assignee_name: str,
    assignee_phone: str | None,
    task_title: str,
    task_priority: str,
    task_deadline: str,
    assigned_by: str,
    task_url: str,
):
    await send_task_email(
        to=assignee_email,
        subject=f"Task assigned: {task_title}",
        heading="You've been assigned a task",
        body=f"<b>{assigned_by}</b> assigned you the task <b>{task_title}</b>.",
        meta=f"Priority: {task_priority.capitalize()} &nbsp;·&nbsp; Deadline: {task_deadline}",
        cta_label="View Task",
        cta_url=task_url,
    )
    if assignee_phone and task_priority in SMS_PRIORITIES:
        msg = f"TaskFlow: '{task_title}' assigned to you by {assigned_by}. Priority: {task_priority.upper()}. Deadline: {task_deadline}."
        await send_sms(assignee_phone, msg)


# ── Task deleted ──────────────────────────────────────────────────────────────

async def notify_task_deleted(
    assignee_email: str,
    task_title: str,
    deleted_by: str,
):
    await send_task_email(
        to=assignee_email,
        subject=f"Task removed: {task_title}",
        heading="A task assigned to you was removed",
        body=f"<b>{deleted_by}</b> deleted the task <b>{task_title}</b> that was assigned to you.",
        meta=None,
        cta_label=None,
        cta_url=None,
    )


# ── Task completed (notify creator) ──────────────────────────────────────────

async def notify_task_completed(
    creator_email: str,
    task_title: str,
    completed_by: str,
    task_url: str,
):
    await send_task_email(
        to=creator_email,
        subject=f"Task completed: {task_title}",
        heading="A task has been completed",
        body=f"<b>{completed_by}</b> marked <b>{task_title}</b> as completed.",
        meta=None,
        cta_label="View Task",
        cta_url=task_url,
    )


# ── Reminder (called by scheduler) ───────────────────────────────────────────

async def notify_reminder(
    to_email: str,
    to_phone: str | None,
    title: str,
    description: str,
    app_url: str,
):
    body = f"<b>{title}</b>"
    if description:
        body += f"<br><br>{description}"
    await send_task_email(
        to=to_email,
        subject=f"Reminder: {title}",
        heading="You have a reminder",
        body=body,
        meta=None,
        cta_label="View Reminders",
        cta_url=f"{app_url}/reminders",
    )
    if to_phone:
        await send_sms(to_phone, f"Reminder: {title}")


# ── Deadline approaching (called by scheduler) ────────────────────────────────

async def notify_deadline_approaching(
    assignee_email: str,
    assignee_phone: str | None,
    task_title: str,
    task_priority: str,
    hours_left: int,
    task_url: str,
):
    label = f"{hours_left}h" if hours_left < 24 else "tomorrow"
    await send_task_email(
        to=assignee_email,
        subject=f"Deadline approaching: {task_title}",
        heading=f"Task due {label}",
        body=f"Your task <b>{task_title}</b> is due in <b>{label}</b>.",
        meta=f"Priority: {task_priority.capitalize()}",
        cta_label="View Task",
        cta_url=task_url,
    )
    if assignee_phone and task_priority in SMS_PRIORITIES:
        msg = f"TaskFlow: '{task_title}' is due in {label}. Priority: {task_priority.upper()}."
        await send_sms(assignee_phone, msg)


# ── Task overdue ──────────────────────────────────────────────────────────────

async def notify_task_overdue(
    assignee_email: str,
    assignee_phone: str | None,
    task_title: str,
    task_priority: str,
    task_url: str,
):
    await send_task_email(
        to=assignee_email,
        subject=f"Overdue: {task_title}",
        heading="Task is overdue",
        body=f"Your task <b>{task_title}</b> has passed its deadline.",
        meta=f"Priority: {task_priority.capitalize()}",
        cta_label="View Task",
        cta_url=task_url,
    )
    if assignee_phone and task_priority in SMS_PRIORITIES:
        msg = f"TaskFlow: OVERDUE — '{task_title}'. Please action immediately."
        await send_sms(assignee_phone, msg)
