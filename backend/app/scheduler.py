"""
Background scheduler — runs deadline and overdue checks every hour.
Flags tasks with `deadline_notified` / `overdue_notified` to avoid duplicate alerts.
"""
import calendar as _cal
import logging
import os
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database import tasks_collection, users_collection, reminders_collection
from app.services.notifications import notify_deadline_approaching, notify_task_overdue, notify_reminder, notify_morning_digest
from bson import ObjectId

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="UTC")

DONE = {"completed", "reviewed"}
ALBERTA_TZ = ZoneInfo("America/Edmonton")


def _next_occurrence(remind_at: datetime, recurrence: str) -> datetime:
    if remind_at.tzinfo is None:
        remind_at = remind_at.replace(tzinfo=timezone.utc)
    if recurrence == "daily":
        return remind_at + timedelta(days=1)
    if recurrence == "weekly":
        return remind_at + timedelta(weeks=1)
    if recurrence == "monthly":
        m = remind_at.month + 1
        y = remind_at.year + (m - 1) // 12
        m = ((m - 1) % 12) + 1
        max_day = _cal.monthrange(y, m)[1]
        return remind_at.replace(year=y, month=m, day=min(remind_at.day, max_day))
    return remind_at


async def _check_deadlines():
    now = datetime.now(timezone.utc)
    window_start = now + timedelta(hours=23)
    window_end = now + timedelta(hours=25)
    app_url = os.getenv("APP_URL", "http://localhost:5173")

    # Tasks due in ~24h, not yet deadline-notified, not done
    cursor = tasks_collection.find({
        "deadline": {"$gte": window_start, "$lte": window_end},
        "status": {"$nin": list(DONE)},
        "deadline_notified": {"$ne": True},
    })
    async for task in cursor:
        hours_left = int((task["deadline"].replace(tzinfo=timezone.utc) - now).total_seconds() / 3600)
        for assignee in task.get("assigned_to", []):
            user_doc = await users_collection.find_one({"_id": ObjectId(assignee["id"])})
            phone = user_doc.get("phone") if user_doc else None
            await notify_deadline_approaching(
                assignee_email=assignee["email"],
                assignee_phone=phone,
                task_title=task["title"],
                task_priority=task.get("priority", "medium"),
                hours_left=hours_left,
                task_url=f"{app_url}/tasks",
            )
        await tasks_collection.update_one({"_id": task["_id"]}, {"$set": {"deadline_notified": True}})
        logger.info("Deadline notification sent for task: %s", task["title"])


async def _check_overdue():
    now = datetime.now(timezone.utc)

    cursor = tasks_collection.find({
        "deadline": {"$lt": now},
        "status": {"$nin": list(DONE)},
        "overdue_notified": {"$ne": True},
    })
    async for task in cursor:
        for assignee in task.get("assigned_to", []):
            user_doc = await users_collection.find_one({"_id": ObjectId(assignee["id"])})
            phone = user_doc.get("phone") if user_doc else None
            app_url = os.getenv("APP_URL", "http://localhost:5173")
            await notify_task_overdue(
                assignee_email=assignee["email"],
                assignee_phone=phone,
                task_title=task["title"],
                task_priority=task.get("priority", "medium"),
                task_url=f"{app_url}/tasks",
            )
        await tasks_collection.update_one({"_id": task["_id"]}, {"$set": {"overdue_notified": True}})
        logger.info("Overdue notification sent for task: %s", task["title"])


async def _check_reminders():
    now = datetime.now(timezone.utc)
    app_url = os.getenv("APP_URL", "http://localhost:5173")
    cursor = reminders_collection.find({
        "status": "pending",
        "remind_at": {"$lte": now, "$ne": None},
        "reminded": {"$ne": True},
    })
    async for reminder in cursor:
        user = await users_collection.find_one({"_id": ObjectId(reminder["created_by"]["id"])})
        if user:
            try:
                await notify_reminder(
                    to_email=user["email"],
                    to_phone=user.get("phone"),
                    title=reminder["title"],
                    description=reminder.get("description", ""),
                    app_url=app_url,
                )
            except Exception as e:
                logger.error("Reminder notification failed for %s: %s", reminder["title"], e)
        recurrence = reminder.get("recurrence")
        if recurrence in ("daily", "weekly", "monthly") and reminder.get("remind_at"):
            next_dt = _next_occurrence(reminder["remind_at"], recurrence)
            await reminders_collection.update_one(
                {"_id": reminder["_id"]},
                {"$set": {"remind_at": next_dt, "reminded": False}},
            )
        else:
            await reminders_collection.update_one({"_id": reminder["_id"]}, {"$set": {"reminded": True}})
        logger.info("Reminder notification sent: %s", reminder["title"])


async def _send_morning_digest():
    """Send each user a targeted briefing: overdue + due today + due tomorrow + reminders today."""
    app_url = os.getenv("APP_URL", "http://localhost:5173")

    # Define day boundaries in Alberta time, converted to UTC for MongoDB
    now_ab = datetime.now(ALBERTA_TZ)
    today_ab = now_ab.date()
    today_start = datetime(today_ab.year, today_ab.month, today_ab.day, tzinfo=ALBERTA_TZ)
    today_end = today_start + timedelta(days=1)
    tomorrow_end = today_start + timedelta(days=2)

    # Iterate all users
    async for user in users_collection.find({"email": {"$exists": True}}):
        user_id = str(user["_id"])
        email = user.get("email", "")
        phone = user.get("phone")
        first_name = user.get("name", "there").split()[0]
        if not email:
            continue

        # Overdue: deadline passed, not done, assigned to this user
        overdue_cur = tasks_collection.find({
            "deadline": {"$lt": today_start},
            "status": {"$nin": list(DONE)},
            "assigned_to": {"$elemMatch": {"id": user_id}},
            "deleted_at": None,
        })
        overdue = [
            {"title": t["title"], "note": t["deadline"].strftime("was due %b %-d") if t.get("deadline") else None}
            async for t in overdue_cur
        ]

        # Due today
        due_today_cur = tasks_collection.find({
            "deadline": {"$gte": today_start, "$lt": today_end},
            "status": {"$nin": list(DONE)},
            "assigned_to": {"$elemMatch": {"id": user_id}},
            "deleted_at": None,
        })
        due_today = [{"title": t["title"]} async for t in due_today_cur]

        # Due tomorrow
        due_tomorrow_cur = tasks_collection.find({
            "deadline": {"$gte": today_end, "$lt": tomorrow_end},
            "status": {"$nin": list(DONE)},
            "assigned_to": {"$elemMatch": {"id": user_id}},
            "deleted_at": None,
        })
        due_tomorrow = [{"title": t["title"]} async for t in due_tomorrow_cur]

        # Reminders firing today
        reminders_cur = reminders_collection.find({
            "created_by.id": user_id,
            "status": "pending",
            "remind_at": {"$gte": today_start, "$lt": today_end},
        })
        reminders_today = [
            {"title": r["title"], "note": r["remind_at"].astimezone(ALBERTA_TZ).strftime("%-I:%M %p") if r.get("remind_at") else None}
            async for r in reminders_cur
        ]

        total = len(overdue) + len(due_today) + len(due_tomorrow) + len(reminders_today)
        if total == 0:
            continue

        try:
            await notify_morning_digest(
                to_email=email,
                to_phone=phone,
                first_name=first_name,
                overdue=overdue,
                due_today=due_today,
                due_tomorrow=due_tomorrow,
                reminders_today=reminders_today,
                app_url=app_url,
            )
            logger.info("Morning digest sent to %s (%d items)", email, total)
        except Exception as e:
            logger.error("Morning digest failed for %s: %s", email, e)


def start_scheduler():
    scheduler.add_job(_check_deadlines, "interval", hours=1, id="deadline_check", replace_existing=True)
    scheduler.add_job(_check_overdue, "interval", hours=1, id="overdue_check", replace_existing=True)
    scheduler.add_job(_check_reminders, "interval", minutes=5, id="reminder_check", replace_existing=True)
    scheduler.add_job(
        _send_morning_digest, "cron", hour=8, minute=0,
        timezone="America/Edmonton", id="morning_digest", replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started")


def stop_scheduler():
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")
