import os
import logging
import httpx

logger = logging.getLogger(__name__)


def _infobip_config() -> tuple[str, str, str] | None:
    """Returns (base_url, api_key, from_number) or None if not configured."""
    base_url = os.getenv("INFOBIP_BASE_URL", "").strip().rstrip("/")
    api_key = os.getenv("INFOBIP_API_KEY", "").strip()
    from_number = os.getenv("INFOBIP_NUMBER", "").strip()
    if base_url and api_key and from_number:
        return base_url, api_key, from_number
    return None


async def send_sms(to: str, message: str) -> bool:
    """Send SMS via Infobip. Returns True on success. Falls back to console log."""
    config = _infobip_config()
    if not config:
        logger.info("[SMS FALLBACK] To: %s | %s", to, message)
        return False

    base_url, api_key, from_number = config
    url = f"https://{base_url}/sms/2/text/advanced"
    payload = {
        "messages": [{
            "from": from_number,
            "destinations": [{"to": to}],
            "text": message,
        }]
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                url,
                json=payload,
                headers={
                    "Authorization": f"App {api_key}",
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
            )
            r.raise_for_status()
            logger.info("SMS sent to %s via Infobip", to)
            return True
    except Exception as e:
        logger.warning("Infobip SMS failed, falling back to log: %s", e)
        logger.info("[SMS FALLBACK] To: %s | %s", to, message)
        return False
