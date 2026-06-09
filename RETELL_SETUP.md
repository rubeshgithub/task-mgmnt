# TaskFlow — Retell AI Voice Agent Setup

Hand this doc to a co-worker Claude session to configure the Retell AI voice agent.

---

## What's already built

The backend exposes a complete voice API at:

```
https://task-mgmnt-production.up.railway.app
```

There is also an MCP (Model Context Protocol) server at:

```
POST https://task-mgmnt-production.up.railway.app/api/mcp
```

The MCP server speaks JSON-RPC 2.0 and is intended as the **Custom LLM** brain inside Retell AI.

---

## Authentication flow

All voice tools require a `voice_token`. To get one:

1. Caller says their email and voice PIN
2. Agent calls `verify_user` → receives a `voice_token` (15-min JWT, scope: "voice")
3. All subsequent tool calls include `voice_token`

Users set their voice PIN in the web app at **Settings → My Profile → Voice PIN** (4–6 digits).

---

## The 10 voice tools

All tool endpoints require the header:
```
x-retell-api-key: <RETELL_API_KEY>
```

---

### 1. `verify_user`
**POST** `/api/voice/verify-user`

```json
{ "email": "user@example.com", "pin": "1234" }
```

Response:
```json
{ "result": "Verified. Welcome, John.", "voice_token": "eyJ...", "user_name": "John", "org_name": "Acme" }
```

---

### 2. `create_task`
**POST** `/api/voice/create-task`

```json
{
  "voice_token": "eyJ...",
  "title": "Follow up with client",
  "deadline": "2026-06-15",
  "priority": "high",
  "description": "Optional description",
  "assignee_name": "Sarah"
}
```

- `priority`: one of `low`, `medium`, `high`, `urgent`
- `assignee_name`: partial/full name — fuzzy matched against org members. Omit to assign to the caller.
- `deadline`: must be ISO date `YYYY-MM-DD`. Resolve relative dates ("next Friday") before calling.

Notifications fired:
- **Email** to assignee (always, when assigning to someone else)
- **SMS** to assignee (only if priority is `high` or `urgent` and they have a phone number)

---

### 3. `update_task_status`
**POST** `/api/voice/update-task`

```json
{
  "voice_token": "eyJ...",
  "task_title": "Follow up",
  "new_status": "completed"
}
```

- `task_title`: partial match, case-insensitive
- `new_status`: one of `started`, `in_progress`, `completed`, `on_hold`

Notifications fired:
- **Email** to task creator when status is set to `completed`

---

### 4. `list_my_tasks`
**POST** `/api/voice/list-tasks`

```json
{ "voice_token": "eyJ..." }
```

Returns up to 10 open tasks sorted by deadline.

---

### 5. `find_member`
**POST** `/api/voice/find-member`

```json
{ "voice_token": "eyJ...", "name": "Sarah" }
```

Use this to confirm the right person before assigning a task.

---

### 6. `update_task_details`
**POST** `/api/voice/update-task-details`

```json
{
  "voice_token": "eyJ...",
  "task_title": "Follow up",
  "new_title": "Follow up with client",
  "description": "Updated description",
  "deadline": "2026-06-20",
  "priority": "high"
}
```

- `task_title`: partial match to find the task
- All other fields are optional — only include what needs to change
- `priority`: one of `low`, `medium`, `high`, `urgent`
- `deadline`: ISO date `YYYY-MM-DD` — LLM must resolve relative dates before calling

---

### 7. `create_reminder`
**POST** `/api/voice/create-reminder`

```json
{
  "voice_token": "eyJ...",
  "title": "Call Dr Smith",
  "remind_at": "2026-06-10T15:00:00",
  "category": "health",
  "description": "Annual check-up follow-up",
  "recurrence": "weekly"
}
```

- `remind_at`: ISO datetime `YYYY-MM-DDTHH:MM:SS` (UTC). Resolve relative times ("tomorrow at 3pm") before calling. If omitted, reminder has no time set.
- `category`: one of `personal`, `work`, `health`, `other` (defaults to `personal`)
- `recurrence`: one of `daily`, `weekly`, `monthly` — omit for a one-off reminder

Notifications fired:
- **Email + SMS** at `remind_at` time (fired by the scheduler, not at creation time)

---

### 8. `list_reminders`
**POST** `/api/voice/list-reminders`

```json
{ "voice_token": "eyJ..." }
```

Returns up to 10 pending reminders sorted by `remind_at` (soonest first).

---

### 9. `complete_reminder`
**POST** `/api/voice/complete-reminder`

```json
{
  "voice_token": "eyJ...",
  "reminder_title": "Call Dr"
}
```

- `reminder_title`: partial match, case-insensitive — matches against pending reminders only

---

### 10. `update_reminder`
**POST** `/api/voice/update-reminder`

```json
{
  "voice_token": "eyJ...",
  "reminder_title": "Call Dr",
  "new_title": "Call Dr Smith",
  "remind_at": "2026-06-11T09:00:00",
  "recurrence": "none"
}
```

- `reminder_title`: partial match to find the reminder
- All other fields are optional — only include what needs to change
- `recurrence`: pass `"none"` to remove an existing recurrence
- Updating `remind_at` resets the notification so it fires again at the new time

---

## MCP server (Custom LLM path)

If using Claude as the Custom LLM brain inside Retell, point Retell to:

```
POST https://task-mgmnt-production.up.railway.app/api/mcp
```

It handles:
- `initialize` — returns server capabilities
- `tools/list` — returns all 10 tool schemas
- `tools/call` — proxies calls to the voice API internally

---

## What you need to do in Retell AI

### Step 1 — Create the agent

1. Log in to [app.retellai.com](https://app.retellai.com)
2. **Create Agent** → choose **Custom LLM**
3. Set the LLM webhook URL to:
   ```
   https://task-mgmnt-production.up.railway.app/api/mcp
   ```

### Step 2 — System prompt for the agent

Paste this as the agent's system prompt:

```
You are a voice assistant for TaskFlow, a task and reminder management system.

Your job:
1. Greet the caller and ask for their email and PIN to verify them.
2. Once verified, help them manage tasks and reminders.
3. Always call verify_user first. Never perform any operations without a valid voice_token.
4. Keep responses short — this is a phone call.
5. After completing an action, ask if there is anything else you can help with.

--- TASKS ---
- Use create_task to create new tasks. Confirm title, deadline, and assignee before calling.
- Use update_task_status to change workflow state: started, in_progress, completed, on_hold.
- Use update_task_details to change title, description, deadline, or priority. Only pass fields that need to change.
- Use list_my_tasks to read back the caller's open tasks.
- Use find_member to confirm a team member's name before assigning a task.
- For deadlines, convert what the caller says ("next Monday", "end of week") into YYYY-MM-DD before calling.

--- REMINDERS ---
- Use create_reminder to set a personal reminder. Confirm title and time before calling.
- Use list_reminders to read back the caller's pending reminders.
- Use complete_reminder to mark a reminder done.
- Use update_reminder to change a reminder's title, time, or recurrence. Only pass fields that need to change. Pass recurrence="none" to remove recurrence.
- For reminder times, convert what the caller says ("tomorrow at 3pm", "next Monday morning") into YYYY-MM-DDTHH:MM:SS (UTC) before calling.
- Reminders are personal — they are not shared with the org.

Tool call order:
  verify_user → then any combination of task/reminder tools as needed
```

### Step 3 — Add the 10 custom tools

In Retell → Agent → Tools, add each tool with these settings:

| Tool name             | Method | URL                                                                                   |
|-----------------------|--------|---------------------------------------------------------------------------------------|
| `verify_user`         | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/verify-user`                 |
| `create_task`         | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/create-task`                 |
| `update_task_status`  | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/update-task`                 |
| `update_task_details` | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/update-task-details`         |
| `list_my_tasks`       | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/list-tasks`                  |
| `find_member`         | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/find-member`                 |
| `create_reminder`     | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/create-reminder`             |
| `list_reminders`      | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/list-reminders`              |
| `complete_reminder`   | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/complete-reminder`           |
| `update_reminder`     | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/update-reminder`             |

For each tool, add the request header:
```
x-retell-api-key: <your RETELL_API_KEY from Railway env vars>
```

Use the JSON schemas defined in the MCP server (`/api/mcp` → `tools/list`) as the tool input schemas.

### Step 4 — Assign a phone number

In Retell → Phone Numbers → **Import** or **Buy** a number, then assign it to the agent.

### Step 5 — Test the call

1. Make sure a user account exists in the web app with a voice PIN set (Settings → Voice PIN).
2. Call the Retell number.
3. Say: "Hi, my email is user@example.com and my PIN is 1234"
4. Try creating a task: *"Create a high priority task called Follow up with Sarah, due next Friday"*
5. Try creating a reminder: *"Remind me to take medication tomorrow at 8am"*
6. Try listing: *"What tasks do I have?"* or *"What are my reminders?"*

---

## Notification summary

| Event | Email | SMS |
|---|---|---|
| Task assigned to someone else (voice) | ✓ to assignee | ✓ if priority high/urgent + phone set |
| Task marked completed (voice) | ✓ to creator | — |
| Reminder fires (scheduler, not voice) | ✓ to reminder owner | ✓ if phone set |
| Task deadline in ≤24h (scheduler) | ✓ to assignee | ✓ if priority high/urgent + phone set |
| Task overdue (scheduler) | ✓ to assignee | ✓ if priority high/urgent + phone set |

SMS threshold: only `high` and `urgent` priority tasks trigger SMS. Reminders always send SMS if a phone number is set.

---

## Environment variables (Railway — already set)

| Variable             | Purpose                             |
|----------------------|-------------------------------------|
| `RETELL_API_KEY`     | Validates `x-retell-api-key` header |
| `VOICE_JWT_SECRET`   | Signs/verifies voice tokens         |
| `MONGODB_URI`        | Database connection                 |
| `APP_URL`            | Used in notification links          |
| `RAILWAY_PUBLIC_DOMAIN` | Used by MCP server to self-reference |

---

## Backend files to know

| File                                  | What it does                                        |
|---------------------------------------|-----------------------------------------------------|
| `backend/app/routers/voice.py`        | All 10 voice tool endpoints                         |
| `backend/app/routers/mcp_server.py`   | MCP JSON-RPC 2.0 wrapper around voice endpoints     |
| `backend/app/scheduler.py`            | Fires reminder and deadline notifications on a timer |
| `backend/app/services/notifications.py` | Email + SMS dispatch logic                        |
| `backend/app/auth.py`                 | Voice JWT generation and verification               |

---

## Known constraints

- Voice tokens expire in **15 minutes** — one per call session is enough.
- `find_member` uses regex partial match (case-insensitive) — common names may match multiple people; the agent should read back the matched name for confirmation before assigning.
- Task `deadline` must be `YYYY-MM-DD`; reminder `remind_at` must be `YYYY-MM-DDTHH:MM:SS` (UTC). The LLM must resolve relative expressions before calling either tool.
- Reminders are **personal** (scoped to the caller's user ID). Tasks are **org-scoped** (visible to the whole organisation).
- Recurring reminders automatically advance to the next occurrence after firing — the caller does not need to recreate them.
- SMS for reminders fires regardless of priority (unlike tasks which require high/urgent).
