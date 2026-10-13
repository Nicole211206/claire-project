import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .limpeza_caucao_sync import loop_automatico
from .routers import hostaway, jarvis, records, root

app = FastAPI(title="claire-dados")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Token"],
)


# Registrado na base Starlette (não fastapi.HTTPException) para também
# capturar o 404 nativo do roteamento, que o Starlette levanta com a classe
# base — fastapi.HTTPException é subclasse dela, então continua coberto.
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc: StarletteHTTPException):
    if isinstance(exc.detail, dict):
        return JSONResponse(exc.detail, status_code=exc.status_code)
    if exc.status_code == 404:
        return JSONResponse({"error": "rota nao encontrada"}, status_code=404)
    return JSONResponse({"error": exc.detail}, status_code=exc.status_code)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    return JSONResponse({"error": str(exc)}, status_code=500)


# API v2 checada antes da API Jarvis, igual ao worker original (não colidem
# mesmo assim, mas mantém a mesma ordem de registro por fidelidade).
app.include_router(records.router, prefix="/api/v2")
app.include_router(jarvis.router, prefix="/api")
app.include_router(root.router)

# hostaway-worker.js era um Worker próprio, sem prefixo — aqui vive junto no
# mesmo processo, sob /hostaway (evita colidir com o /health do claire-dados,
# que exige token; o hostaway original não tem autenticação nenhuma).
app.include_router(hostaway.router, prefix="/hostaway")


# Automação Limpeza & Caução: puxa reservas do Hostaway a cada 30 min e cria
# os cards sozinha (ver app/limpeza_caucao_sync.py).
_tarefas_fundo = set()


@app.on_event("startup")
async def _iniciar_automacoes():
    t = asyncio.create_task(loop_automatico())
    _tarefas_fundo.add(t)
    t.add_done_callback(_tarefas_fundo.discard)
