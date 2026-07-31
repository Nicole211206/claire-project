import random
import string
import time
from datetime import datetime, timezone


def now_ms() -> int:
    return int(time.time() * 1000)


def iso_now() -> str:
    """Equivalente a `new Date().toISOString()` do JS (UTC, milissegundos, sufixo Z)."""
    now = datetime.now(timezone.utc)
    return now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z"


def today_iso() -> str:
    """Equivalente a `new Date().toISOString().split('T')[0]` (data UTC, YYYY-MM-DD)."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def hour_key_now() -> str:
    """Equivalente a `new Date().toISOString().substring(0,13)` — ex.: '2026-07-16T14'."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H")


def rand_suffix(n: int = 6) -> str:
    """Equivalente a `Math.random().toString(36).slice(2,8)`."""
    alphabet = string.digits + string.ascii_lowercase
    return "".join(random.choices(alphabet, k=n))


def to_number(v) -> float:
    """Aproxima o `Number(v)` do JS: não numérico ou ausente -> 0."""
    if v is None:
        return 0
    if isinstance(v, bool):
        return 1 if v else 0
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0


def json_merge_patch(target, patch):
    """RFC 7396 — mesma semântica do `json_patch()` nativo do SQLite/D1."""
    if not isinstance(patch, dict):
        return patch
    if not isinstance(target, dict):
        target = {}
    result = dict(target)
    for k, v in patch.items():
        if v is None:
            result.pop(k, None)
        elif isinstance(v, dict):
            result[k] = json_merge_patch(result.get(k), v)
        else:
            result[k] = v
    return result
