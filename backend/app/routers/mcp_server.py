"""
MCP (Model Context Protocol) server — exposes voice tools so Claude
can be used as the Custom LLM brain inside Retell AI.

Protocol: JSON-RPC 2.0 over HTTP POST /api/mcp
"""
import os
import httpx
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/mcp", tags=["mcp"])

# On Railway the app talks to itself via the internal service URL
_self = os.getenv("RAILWAY_PUBLIC_DOMAIN", "")
BASE = f"https://{_self}/api/voice" if _self else "http://localhost:8000/api/voice"

MCP_TOOLS = [
    {
        "name": "verify_user",
        "description": "Authenticate the caller by email and voice PIN. Must be called first. Returns a voice_token for subsequent calls.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "email":  {"type": "string", "description": "Caller's email address"},
                "pin":    {"type": "string", "description": "Caller's 4-6 digit voice PIN"},
            },
            "required": ["email", "pin"],
        },
    },
    {
        "name": "create_task",
        "description": "Create a new task on behalf of the authenticated caller.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "voice_token":    {"type": "string", "description": "Token returned by verify_user"},
                "title":          {"type": "string", "description": "Task title"},
                "description":    {"type": "string", "description": "Task description"},
                "deadline":       {"type": "string", "description": "Deadline as ISO date string (YYYY-MM-DD). Resolve relative dates like 'next Friday' before calling."},
                "priority":       {"type": "string", "enum": ["low", "medium", "high", "urgent"]},
                "assignee_name":  {"type": "string", "description": "Full or partial name of the team member to assign to. Omit to assign to caller."},
            },
            "required": ["voice_token", "title", "deadline"],
        },
    },
    {
        "name": "update_task_status",
        "description": "Update the status of a task by its title (partial match).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "voice_token": {"type": "string"},
                "task_title":  {"type": "string", "description": "Full or partial task title to search for"},
                "new_status":  {"type": "string", "enum": ["started", "in_progress", "completed", "on_hold"]},
            },
            "required": ["voice_token", "task_title", "new_status"],
        },
    },
    {
        "name": "list_my_tasks",
        "description": "List the caller's open tasks. Returns up to 10 tasks sorted by deadline.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "voice_token": {"type": "string"},
            },
            "required": ["voice_token"],
        },
    },
    {
        "name": "find_member",
        "description": "Look up a team member by name to confirm who to assign a task to.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "voice_token": {"type": "string"},
                "name":        {"type": "string", "description": "Full or partial name to search"},
            },
            "required": ["voice_token", "name"],
        },
    },
    {
        "name": "update_task_details",
        "description": "Edit the title, description, deadline, or priority of an existing task found by partial title match. All fields except voice_token and task_title are optional — only include what needs to change.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "voice_token": {"type": "string"},
                "task_title":  {"type": "string", "description": "Full or partial title of the task to find"},
                "new_title":   {"type": "string", "description": "Replacement title for the task"},
                "description": {"type": "string", "description": "New description text"},
                "deadline":    {"type": "string", "description": "New deadline as ISO date YYYY-MM-DD"},
                "priority":    {"type": "string", "enum": ["low", "medium", "high", "urgent"]},
            },
            "required": ["voice_token", "task_title"],
        },
    },
    {
        "name": "start_note_session",
        "description": "Flag this call to be saved as a meeting note. Call this immediately when the user says anything like 'take notes', 'record this call', 'save this conversation', or 'capture this meeting'.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "voice_token": {"type": "string"},
            },
            "required": ["voice_token"],
        },
    },
    {
        "name": "create_reminder",
        "description": "Create a personal reminder for the authenticated caller. Resolve relative times like 'tomorrow at 3pm' to an ISO datetime before calling.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "voice_token":  {"type": "string"},
                "title":        {"type": "string", "description": "Short reminder title"},
                "description":  {"type": "string", "description": "Optional details"},
                "remind_at":    {"type": "string", "description": "Reminder datetime as ISO string YYYY-MM-DDTHH:MM:SS (UTC). Resolve relative times before calling."},
                "category":     {"type": "string", "enum": ["personal", "work", "health", "other"]},
                "recurrence":   {"type": "string", "enum": ["daily", "weekly", "monthly"], "description": "Repeat frequency — omit for one-off reminders"},
            },
            "required": ["voice_token", "title"],
        },
    },
    {
        "name": "list_reminders",
        "description": "List the caller's pending reminders, up to 10, sorted by remind_at.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "voice_token": {"type": "string"},
            },
            "required": ["voice_token"],
        },
    },
    {
        "name": "complete_reminder",
        "description": "Mark a pending reminder as completed, found by partial title match.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "voice_token":      {"type": "string"},
                "reminder_title":   {"type": "string", "description": "Full or partial title of the reminder to complete"},
            },
            "required": ["voice_token", "reminder_title"],
        },
    },
    {
        "name": "update_reminder",
        "description": "Update the title, remind_at time, or recurrence of a pending reminder found by partial title match. Only include fields that need to change. Pass recurrence='none' to remove recurrence.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "voice_token":    {"type": "string"},
                "reminder_title": {"type": "string", "description": "Full or partial title of the reminder to find"},
                "new_title":      {"type": "string", "description": "Replacement title"},
                "remind_at":      {"type": "string", "description": "New datetime as ISO string YYYY-MM-DDTHH:MM:SS (UTC)"},
                "recurrence":     {"type": "string", "description": "New repeat frequency: 'daily', 'weekly', 'monthly', or 'none' to remove"},
            },
            "required": ["voice_token", "reminder_title"],
        },
    },
]

TOOL_ROUTES = {
    "verify_user":         "/verify-user",
    "create_task":         "/create-task",
    "update_task_status":  "/update-task",
    "list_my_tasks":       "/list-tasks",
    "find_member":         "/find-member",
    "update_task_details": "/update-task-details",
    "start_note_session":  "/start-note-session",
    "create_reminder":     "/create-reminder",
    "list_reminders":      "/list-reminders",
    "complete_reminder":   "/complete-reminder",
    "update_reminder":     "/update-reminder",
}


@router.post("")
async def mcp_endpoint(request: Request):
    body = await request.json()
    method = body.get("method")
    req_id = body.get("id")
    params = body.get("params", {})

    # ── initialize ────────────────────────────────────────────────────────────
    if method == "initialize":
        return JSONResponse({
            "jsonrpc": "2.0", "id": req_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "taskflow-voice", "version": "1.0.0"},
            },
        })

    # ── tools/list ────────────────────────────────────────────────────────────
    if method == "tools/list":
        return JSONResponse({
            "jsonrpc": "2.0", "id": req_id,
            "result": {"tools": MCP_TOOLS},
        })

    # ── tools/call ────────────────────────────────────────────────────────────
    if method == "tools/call":
        tool_name = params.get("name")
        arguments = dict(params.get("arguments", {}))
        # Inject call_id from Retell's _meta so verify_user can store the session mapping
        call_id = params.get("_meta", {}).get("call_id", "")
        if call_id and tool_name == "verify_user":
            arguments["call_id"] = call_id
        route = TOOL_ROUTES.get(tool_name)

        if not route:
            return JSONResponse({
                "jsonrpc": "2.0", "id": req_id,
                "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"},
            })

        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{BASE}{route}", json=arguments, timeout=10)
            data = resp.json()

        return JSONResponse({
            "jsonrpc": "2.0", "id": req_id,
            "result": {
                "content": [{"type": "text", "text": str(data.get("result", ""))}],
                "isError": False,
                "_meta": {k: v for k, v in data.items() if k != "result"},
            },
        })

    # ── unknown method ────────────────────────────────────────────────────────
    return JSONResponse({
        "jsonrpc": "2.0", "id": req_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"},
    }, status_code=400)
