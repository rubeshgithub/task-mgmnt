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

## The 5 voice tools

All tool endpoints require the header:
```
x-retell-api-key: <RETELL_API_KEY>
```

### 1. `verify_user`
**POST** `/api/voice/verify-user`

```json
{ "email": "user@example.com", "pin": "1234" }
```

Response:
```json
{ "result": "Verified. voice_token=eyJ...", "voice_token": "eyJ..." }
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

- `task_title`: partial match to find the task (same as `update_task_status`)
- All other fields are optional — only include what needs to change
- `priority`: one of `low`, `medium`, `high`, `urgent`
- `deadline`: ISO date `YYYY-MM-DD` — LLM must resolve relative dates before calling

---

## MCP server (Custom LLM path)

If using Claude as the Custom LLM brain inside Retell, point Retell to:

```
POST https://task-mgmnt-production.up.railway.app/api/mcp
```

It handles:
- `initialize` — returns server capabilities
- `tools/list` — returns all 5 tool schemas
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
You are a voice assistant for TaskFlow, a task management system.

Your job:
1. Greet the caller and ask for their email and PIN to verify them.
2. Once verified, help them create tasks, update task status, or list their open tasks.
3. Always call verify_user first. Never perform task operations without a valid voice_token.
4. When creating a task, confirm the title, deadline, and assignee before calling create_task.
5. For deadlines, convert what the caller says ("next Monday", "end of week") into YYYY-MM-DD format before calling the tool.
6. Keep responses short — this is a phone call.
7. After completing an action, ask if there is anything else you can help with.

Tool call order: verify_user → (optional) find_member → create_task / update_task_status / update_task_details / list_my_tasks

Use update_task_status to change workflow state (started, in_progress, completed, on_hold).
Use update_task_details to change title, description, deadline, or priority. Only pass the fields that need to change.
```

### Step 3 — Add the 5 custom tools

In Retell → Agent → Tools, add each tool with these settings:

| Tool name              | Method | URL                                                                             |
|------------------------|--------|---------------------------------------------------------------------------------|
| `verify_user`          | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/verify-user`           |
| `create_task`          | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/create-task`           |
| `update_task_status`   | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/update-task`           |
| `update_task_details`  | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/update-task-details`   |
| `list_my_tasks`        | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/list-tasks`            |
| `find_member`          | POST   | `https://task-mgmnt-production.up.railway.app/api/voice/find-member`           |

For each tool, add the request header:
```
x-retell-api-key: key_c2f009e83a4ebd857569cd0ca470
```

Use the JSON schemas defined in the MCP server (`/api/mcp` → `tools/list`) as the tool input schemas.

### Step 4 — Assign a phone number

In Retell → Phone Numbers → **Import** or **Buy** a number, then assign it to the agent.

### Step 5 — Test the call

1. Make sure a user account exists in the web app with a voice PIN set (Settings → Voice PIN).
2. Call the Retell number.
3. Say: "Hi, my email is user@example.com and my PIN is 1234"
4. Ask to create a task or list your tasks.

---

## Environment variables (Railway — already set)

| Variable           | Purpose                              |
|--------------------|--------------------------------------|
| `RETELL_API_KEY`   | Validates `x-retell-api-key` header  |
| `VOICE_JWT_SECRET` | Signs/verifies voice tokens          |
| `MONGODB_URI`      | Database connection                  |
| `APP_URL`          | Used in notification links           |

---

## Backend files to know

| File                              | What it does                                      |
|-----------------------------------|---------------------------------------------------|
| `backend/app/routers/voice.py`    | 5 voice tool endpoints                            |
| `backend/app/routers/mcp_server.py` | MCP JSON-RPC 2.0 wrapper around voice endpoints |
| `backend/app/auth.py`             | `create_token(scope="voice")` for voice JWTs      |

---

## Known constraints

- Voice tokens expire in **15 minutes** — one per call session is enough.
- `find_member` uses regex partial match (case-insensitive) — common names may match multiple people; the agent should read back the matched name for confirmation.
- Task deadline must be provided as `YYYY-MM-DD`; the LLM must resolve relative dates before calling `create_task`.
- SMS notifications fire for `urgent`/`high` priority tasks when an assignee has a phone number set.
