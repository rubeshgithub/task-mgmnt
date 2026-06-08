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
