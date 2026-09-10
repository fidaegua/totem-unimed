from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

from config import PORT
from services.hospital_mock import buscar_paciente_por_senha, obter_resumo_geral_pronto_atendimento
from services.kimi_service import gerar_mensagem_acolhimento

app = FastAPI(title="Totem Unimed - Acolhimento e Espera")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")


class ConsultarSenhaRequest(BaseModel):
    senha: str


class TirarDuvidaRequest(BaseModel):
    senha: str
    duvida: str


@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/consultar-senha")
async def consultar_senha(payload: ConsultarSenhaRequest):
    senha = (payload.senha or "").strip()
    if not senha:
        return {"ok": False, "message": "Informe a senha de triagem para consultar o atendimento."}

    paciente = buscar_paciente_por_senha(senha)
    if not paciente:
        return {"ok": False, "message": "Senha não localizada. Verifique o número informado."}

    mensagem = await gerar_mensagem_acolhimento(paciente)
    resumo = obter_resumo_geral_pronto_atendimento()

    return {
        "ok": True,
        "paciente": {
            "nome": paciente["nome_social"],
            "senha": paciente["senha"],
            "classificacao_risco": paciente["classificacao_risco"],
            "cor_hex": paciente["cor_hex"],
            "posicao_fila": paciente["posicao_fila"],
            "tempo_estimado_minutos": paciente["tempo_estimado_minutos"],
            "status_atual": paciente["status_atual"],
        },
        "resumo": resumo,
        "mensagem_acolhimento": mensagem,
    }


@app.post("/api/tirar-duvida")
async def tirar_duvida(payload: TirarDuvidaRequest):
    senha = (payload.senha or "").strip()
    duvida = (payload.duvida or "").strip()

    if not senha:
        return {"ok": False, "message": "Informe a senha para identificar o paciente."}

    paciente = buscar_paciente_por_senha(senha)
    if not paciente:
        return {"ok": False, "message": "Senha não localizada. Verifique o número informado."}

    mensagem = await gerar_mensagem_acolhimento(paciente, duvida)
    return {
        "ok": True,
        "mensagem_acolhimento": mensagem,
        "paciente": {
            "nome": paciente["nome_social"],
            "senha": paciente["senha"],
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=PORT, reload=True)
