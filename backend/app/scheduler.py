"""
Background scheduler — runs deadline and overdue checks every hour.
Flags tasks with `deadline_notified` / `overdue_notified` to avoid duplicate alerts.
"""
import logging
import os
from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.database import tasks_collection, users_collection, reminders_collection
from app.services.notifications import notify_deadline_approaching, notify_task_overdue, notify_reminder
from bson import ObjectId

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="UTC")

DONE = {"completed", "reviewed"}


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
        await reminders_collection.update_one({"_id": reminder["_id"]}, {"$set": {"reminded": True}})
        logger.info("Reminder notification sent: %s", reminder["title"])


def start_scheduler():
    scheduler.add_job(_check_deadlines, "interval", hours=1, id="deadline_check", replace_existing=True)
    scheduler.add_job(_check_overdue, "interval", hours=1, id="overdue_check", replace_existing=True)
    scheduler.add_job(_check_reminders, "interval", minutes=5, id="reminder_check", replace_existing=True)
    scheduler.start()
    logger.info("Scheduler started")


def stop_scheduler():
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")
