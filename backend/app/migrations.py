"""Ajustes incrementais de schema para bancos ja existentes."""

import logging

from sqlalchemy import inspect, text

logger = logging.getLogger(__name__)


def ensure_schema_upgrades(engine) -> None:
    """Adiciona colunas novas quando create_all nao altera tabelas existentes."""
    inspector = inspect(engine)
    if not inspector.has_table("users"):
        return

    user_cols = {col["name"] for col in inspector.get_columns("users")}
    if "preferences" not in user_cols:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN preferences JSON NULL"))
        logger.info("Coluna users.preferences adicionada automaticamente.")
