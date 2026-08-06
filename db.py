"""
Camada de banco de dados da Mente Mestra.

Guarda conversas e, dentro de cada conversa, os "turnos" (uma mensagem do
usuário + as respostas individuais dos conselheiros + a síntese do chairman
daquele turno). Usa SQLite puro (sem ORM) porque o volume de dados é pequeno
e não precisa de nada além do que o Python já traz.
"""

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

CAMINHO_DB = os.path.join(os.path.dirname(__file__), "mente_mestra.db")


@contextmanager
def conectar():
    conn = sqlite3.connect(CAMINHO_DB)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def iniciar_db():
    with conectar() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS conversas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL,
                criado_em TEXT NOT NULL,
                atualizado_em TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS turnos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversa_id INTEGER NOT NULL,
                ordem INTEGER NOT NULL,
                mensagem_usuario TEXT NOT NULL,
                individuais_json TEXT NOT NULL,
                chairman_json TEXT,
                criado_em TEXT NOT NULL,
                FOREIGN KEY (conversa_id) REFERENCES conversas(id) ON DELETE CASCADE
            )
            """
        )


def _agora() -> str:
    return datetime.now(timezone.utc).isoformat()


def _titulo_a_partir_de(mensagem: str) -> str:
    mensagem = " ".join(mensagem.split())  # normaliza espaços/quebras de linha
    return mensagem[:60] + ("…" if len(mensagem) > 60 else "")


def criar_conversa(primeira_mensagem: str) -> int:
    with conectar() as conn:
        cursor = conn.execute(
            "INSERT INTO conversas (titulo, criado_em, atualizado_em) VALUES (?, ?, ?)",
            (_titulo_a_partir_de(primeira_mensagem), _agora(), _agora()),
        )
        return cursor.lastrowid


def listar_conversas() -> list[dict]:
    with conectar() as conn:
        linhas = conn.execute(
            "SELECT id, titulo, criado_em, atualizado_em FROM conversas ORDER BY atualizado_em DESC"
        ).fetchall()
        return [dict(linha) for linha in linhas]


def obter_conversa(conversa_id: int) -> dict | None:
    with conectar() as conn:
        conversa = conn.execute(
            "SELECT id, titulo, criado_em, atualizado_em FROM conversas WHERE id = ?", (conversa_id,)
        ).fetchone()
        if not conversa:
            return None
        turnos = conn.execute(
            "SELECT ordem, mensagem_usuario, individuais_json, chairman_json FROM turnos "
            "WHERE conversa_id = ? ORDER BY ordem ASC",
            (conversa_id,),
        ).fetchall()
        return {
            **dict(conversa),
            "turnos": [
                {
                    "ordem": t["ordem"],
                    "mensagem_usuario": t["mensagem_usuario"],
                    "individuais": json.loads(t["individuais_json"]),
                    "chairman": json.loads(t["chairman_json"]) if t["chairman_json"] else None,
                }
                for t in turnos
            ],
        }


def obter_turnos_anteriores(conversa_id: int) -> list[dict]:
    """Só os turnos (sem metadados da conversa) — usado para montar o histórico
    que cada IA recebe antes de responder a uma nova mensagem."""
    with conectar() as conn:
        turnos = conn.execute(
            "SELECT mensagem_usuario, individuais_json, chairman_json FROM turnos "
            "WHERE conversa_id = ? ORDER BY ordem ASC",
            (conversa_id,),
        ).fetchall()
        return [
            {
                "mensagem_usuario": t["mensagem_usuario"],
                "individuais": json.loads(t["individuais_json"]),
                "chairman": json.loads(t["chairman_json"]) if t["chairman_json"] else None,
            }
            for t in turnos
        ]


def adicionar_turno(conversa_id: int, mensagem_usuario: str, individuais: dict, chairman: dict | None) -> None:
    with conectar() as conn:
        proxima_ordem = conn.execute(
            "SELECT COALESCE(MAX(ordem), -1) + 1 FROM turnos WHERE conversa_id = ?", (conversa_id,)
        ).fetchone()[0]
        conn.execute(
            "INSERT INTO turnos (conversa_id, ordem, mensagem_usuario, individuais_json, chairman_json, criado_em) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                conversa_id,
                proxima_ordem,
                mensagem_usuario,
                json.dumps(individuais, ensure_ascii=False),
                json.dumps(chairman, ensure_ascii=False) if chairman else None,
                _agora(),
            ),
        )
        conn.execute("UPDATE conversas SET atualizado_em = ? WHERE id = ?", (_agora(), conversa_id))


def excluir_conversa(conversa_id: int) -> None:
    with conectar() as conn:
        conn.execute("DELETE FROM turnos WHERE conversa_id = ?", (conversa_id,))
        conn.execute("DELETE FROM conversas WHERE id = ?", (conversa_id,))
