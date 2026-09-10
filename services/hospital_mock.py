from __future__ import annotations

from typing import Optional

PACIENTES_MOCK = [
    {
        "senha": "VD-104",
        "nome_social": "João Miguel",
        "classificacao_risco": "Verde",
        "cor_hex": "#2ecc71",
        "posicao_fila": 4,
        "tempo_estimado_minutos": 45,
        "status_atual": "Aguardando Médico",
        "casos_urgentes_no_momento": 2,
    },
    {
        "senha": "AM-202",
        "nome_social": "Maria Eduarda",
        "classificacao_risco": "Amarelo",
        "cor_hex": "#f1c40f",
        "posicao_fila": 2,
        "tempo_estimado_minutos": 25,
        "status_atual": "Aguardando Exame de Sangue",
        "casos_urgentes_no_momento": 3,
    },
    {
        "senha": "AZ-015",
        "nome_social": "Lucas Henrique",
        "classificacao_risco": "Azul",
        "cor_hex": "#3498db",
        "posicao_fila": 7,
        "tempo_estimado_minutos": 60,
        "status_atual": "Aguardando Laudo de Raio-X",
        "casos_urgentes_no_momento": 1,
    },
    {
        "senha": "LA-318",
        "nome_social": "Ana Beatriz",
        "classificacao_risco": "Laranja",
        "cor_hex": "#f39c12",
        "posicao_fila": 1,
        "tempo_estimado_minutos": 15,
        "status_atual": "Em atendimento",
        "casos_urgentes_no_momento": 4,
    },
    {
        "senha": "VR-437",
        "nome_social": "Rafael Costa",
        "classificacao_risco": "Vermelho",
        "cor_hex": "#e74c3c",
        "posicao_fila": 1,
        "tempo_estimado_minutos": 5,
        "status_atual": "Em atendimento",
        "casos_urgentes_no_momento": 5,
    },
]


def buscar_paciente_por_senha(senha: str) -> Optional[dict]:
    """Busca um paciente pelo código informado na triagem."""
    codigo = (senha or "").strip().upper()
    for paciente in PACIENTES_MOCK:
        if paciente["senha"].upper() == codigo:
            return paciente.copy()
    return None


def obter_resumo_geral_pronto_atendimento() -> dict:
    """Retorna dados agregados do pronto atendimento para contextualizar a fila."""
    total_pacientes = len(PACIENTES_MOCK)
    classificacoes = {"Vermelho": 0, "Laranja": 0, "Amarelo": 0, "Verde": 0, "Azul": 0}
    tempo_total = 0

    for paciente in PACIENTES_MOCK:
        classificacoes[paciente["classificacao_risco"]] = classificacoes.get(paciente["classificacao_risco"], 0) + 1
        tempo_total += paciente["tempo_estimado_minutos"]

    return {
        "total_pacientes": total_pacientes,
        "classificacoes": classificacoes,
        "tempo_medio_estimado": round(tempo_total / total_pacientes, 0) if total_pacientes else 0,
        "pacientes_aguardando": sum(1 for p in PACIENTES_MOCK if p["status_atual"] != "Em atendimento"),
    }
