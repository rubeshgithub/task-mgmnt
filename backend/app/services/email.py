import os
import logging
import boto3
from botocore.exceptions import BotoCoreError, ClientError

logger = logging.getLogger(__name__)

_ses = None
FROM_EMAIL = ""


def _get_ses():
    global _ses, FROM_EMAIL
    if _ses is None:
        key = os.getenv("AWS_ACCESS_KEY_ID")
        secret = os.getenv("AWS_SECRET_ACCESS_KEY")
        region = os.getenv("AWS_REGION", "us-east-1")
        FROM_EMAIL = os.getenv("AWS_SES_FROM_EMAIL", "")
        if key and secret:
            _ses = boto3.client(
                "ses",
                aws_access_key_id=key,
                aws_secret_access_key=secret,
                region_name=region,
            )
    return _ses


def _html_wrapper(heading: str, body: str, meta: str | None, cta_label: str | None, cta_url: str | None) -> str:
    cta_block = ""
    if cta_label and cta_url:
        cta_block = f"""
        <a href="{cta_url}" style="display:inline-block;margin:20px 0 0;padding:12px 28px;
           background:#1A55E3;color:#fff;border-radius:8px;text-decoration:none;
           font-weight:600;font-size:15px">{cta_label}</a>"""
    meta_block = f'<p style="color:#6b7280;font-size:13px;margin:12px 0 0">{meta}</p>' if meta else ""
    return f"""
    <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;
                max-width:520px;margin:0 auto;padding:32px 24px;color:#111827">
      <h2 style="font-size:20px;font-weight:700;margin:0 0 16px;color:#1A55E3">{heading}</h2>
      <div style="font-size:15px;line-height:1.6">{body}</div>
      {meta_block}
      {cta_block}
      <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px;margin:0">
        You're receiving this because you're a member of a TaskFlow workspace.
      </p>
    </div>
    """


async def _send(to: str, subject: str, html: str, text: str):
    ses = _get_ses()
    from_email = os.getenv("AWS_SES_FROM_EMAIL", "")
    if not ses or not from_email:
        logger.info("[EMAIL FALLBACK] To: %s | Subject: %s", to, subject)
        return
    try:
        ses.send_email(
            Source=from_email,
            Destination={"ToAddresses": [to]},
            Message={
                "Subject": {"Data": subject, "Charset": "UTF-8"},
                "Body": {
                    "Html": {"Data": html, "Charset": "UTF-8"},
                    "Text": {"Data": text, "Charset": "UTF-8"},
                },
            },
        )
        logger.info("Email sent to %s: %s", to, subject)
    except (BotoCoreError, ClientError) as e:
        logger.warning("SES failed: %s — falling back to log", e)
        logger.info("[EMAIL FALLBACK] To: %s | Subject: %s", to, subject)


async def send_invitation_email(to_email: str, org_name: str, invite_url: str, invited_by: str):
    subject = f"You're invited to join {org_name} on TaskFlow"
    html = _html_wrapper(
        heading="You've been invited!",
        body=f"<b>{invited_by}</b> has invited you to join the workspace <b>{org_name}</b>.<br>"
             f"Click below to create your account and get started.",
        meta="This invitation expires in 7 days.",
        cta_label=f"Join {org_name}",
        cta_url=invite_url,
    )
    text = f"{invited_by} invited you to join {org_name} on TaskFlow. Accept here: {invite_url} (expires in 7 days)"
    await _send(to_email, subject, html, text)


async def send_digest_email(
    to: str,
    first_name: str,
    overdue: list[dict],
    due_today: list[dict],
    due_tomorrow: list[dict],
    reminders_today: list[dict],
    app_url: str,
):
    total = len(overdue) + len(due_today) + len(due_tomorrow) + len(reminders_today)
    if total == 0:
        return

    def _section(color: str, emoji: str, label: str, items: list[dict], note_key: str = "note") -> str:
        if not items:
            return ""
        rows = "".join(
            f'<li style="margin:6px 0;font-size:14px;color:#374151">'
            f'{item["title"]}'
            f'{"<span style=\'color:#9ca3af;font-size:12px\'> — " + item[note_key] + "</span>" if item.get(note_key) else ""}'
            f'</li>'
            for item in items
        )
        return f"""
        <div style="margin:20px 0">
          <p style="margin:0 0 6px;font-weight:700;font-size:13px;text-transform:uppercase;
                    letter-spacing:.05em;color:{color}">{emoji} {label} ({len(items)})</p>
          <ul style="margin:0;padding-left:18px">{rows}</ul>
        </div>"""

    sections = (
        _section("#dc2626", "🔴", "Overdue", overdue)
        + _section("#2563eb", "📅", "Due Today", due_today)
        + _section("#d97706", "🗓️", "Due Tomorrow", due_tomorrow)
        + _section("#059669", "⏰", "Reminders Today", reminders_today)
    )

    html = f"""
    <div style="font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;
                max-width:560px;margin:0 auto;padding:32px 24px;color:#111827">
      <h2 style="font-size:20px;font-weight:700;margin:0 0 4px;color:#1A55E3">Good morning, {first_name}! 👋</h2>
      <p style="color:#6b7280;font-size:14px;margin:0 0 24px">Here's your daily briefing from IppoAssist.</p>
      {sections}
      <div style="margin-top:28px">
        <a href="{app_url}/tasks" style="display:inline-block;padding:11px 24px;
           background:#1A55E3;color:#fff;border-radius:8px;text-decoration:none;
           font-weight:600;font-size:14px;margin-right:8px">Open Tasks</a>
        <a href="{app_url}/reminders" style="display:inline-block;padding:11px 24px;
           background:#f3f4f6;color:#374151;border-radius:8px;text-decoration:none;
           font-weight:600;font-size:14px">Reminders</a>
      </div>
      <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px;margin:0">
        IppoAssist daily digest · You're receiving this as a member of your workspace.
      </p>
    </div>"""

    parts = []
    if overdue:
        parts.append(f"{len(overdue)} overdue")
    if due_today:
        parts.append(f"{len(due_today)} due today")
    if due_tomorrow:
        parts.append(f"{len(due_tomorrow)} due tomorrow")
    if reminders_today:
        parts.append(f"{len(reminders_today)} reminder{'s' if len(reminders_today) > 1 else ''} today")
    text = f"Good morning {first_name}! Your IppoAssist briefing: {', '.join(parts)}. Open the app for details: {app_url}"

    await _send(to, "Your daily IppoAssist briefing", html, text)


async def send_task_email(
    to: str,
    subject: str,
    heading: str,
    body: str,
    meta: str | None,
    cta_label: str | None,
    cta_url: str | None,
):
    html = _html_wrapper(heading=heading, body=body, meta=meta, cta_label=cta_label, cta_url=cta_url)
    import re
    text = re.sub(r"<[^>]+>", "", body) + (f"\n{meta}" if meta else "") + (f"\n{cta_url}" if cta_url else "")
    await _send(to, subject, html, text)
