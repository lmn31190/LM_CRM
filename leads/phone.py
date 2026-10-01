"""Normalisation des numéros français. Garder la même logique que src/modules/crm/phone.ts."""

import re


def normalize(raw: str | None) -> str | None:
    """Renvoie le numéro au format E.164 (+33XXXXXXXXX), ou None s'il est vide."""
    if not raw:
        return None
    digits = re.sub(r"[^\d+]", "", raw)
    if not digits:
        return None
    if digits.startswith("00"):
        digits = "+" + digits[2:]
    if digits.startswith("+33"):
        rest = digits[3:]
        if rest.startswith("0"):
            rest = rest[1:]
        return "+33" + rest
    if digits.startswith("0") and len(digits) == 10:
        return "+33" + digits[1:]
    if digits.startswith("33") and len(digits) == 11:
        return "+" + digits
    return digits
