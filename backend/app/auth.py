from fastapi import HTTPException, Request

from .config import settings


def auth_dependency(request: Request) -> str:
    """Réplica da autenticação por token compartilhado do worker original:
    ?token=XXX ou header X-Token. Sem CLAIRE_TOKEN configurado, não checa nada."""
    token = request.query_params.get("token") or request.headers.get("X-Token") or ""
    if settings.claire_token and token != settings.claire_token:
        raise HTTPException(status_code=401, detail={"error": "nao autorizado"})
    return token
