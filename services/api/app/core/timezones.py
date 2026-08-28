from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


MAX_TIMEZONE_LENGTH = 64


def normalize_iana_timezone(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("Informe um fuso horário IANA válido.")

    normalized = value.strip()
    if not normalized:
        raise ValueError("Informe um fuso horário IANA válido.")
    if len(normalized) > MAX_TIMEZONE_LENGTH:
        raise ValueError("O fuso horário deve possuir no máximo 64 caracteres.")

    try:
        ZoneInfo(normalized)
    except (ZoneInfoNotFoundError, ValueError) as error:
        raise ValueError("Informe um fuso horário IANA válido.") from error

    return normalized
