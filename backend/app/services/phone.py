import phonenumbers
from phonenumbers import geocoder, NumberParseException


def validate_canadian_phone(raw: str) -> str | None:
    """
    Parse and validate a Canadian phone number.
    Accepts formats: +16135551234, 6135551234, (613) 555-1234, 613-555-1234
    Returns E.164 format (+1XXXXXXXXXX) or None if invalid.
    """
    try:
        # Try parsing with CA as default region so bare 10-digit numbers work
        parsed = phonenumbers.parse(raw, "CA")
    except NumberParseException:
        return None

    if not phonenumbers.is_valid_number(parsed):
        return None

    # Must be country code +1
    if parsed.country_code != 1:
        return None

    # Confirm it's actually a Canadian number (not a US number with +1)
    region = geocoder.region_code_for_number(parsed)
    if region != "CA":
        return None

    return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)


def is_canadian_mobile(raw: str) -> tuple[bool, str]:
    """
    Returns (is_valid, e164_or_error_message).
    Use this in API validation to give a clear error to the user.
    """
    e164 = validate_canadian_phone(raw)
    if e164 is None:
        return False, "Must be a valid Canadian mobile number (e.g. +1 613 555 1234)"
    return True, e164
