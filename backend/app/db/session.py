import logging
import os

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

logger = logging.getLogger(__name__)


def _create_engine_for_uri(database_uri: str):
    connect_args = {}
    if database_uri.startswith("sqlite"):
        connect_args["check_same_thread"] = False
    return create_engine(database_uri, connect_args=connect_args)


def _resolve_engine():
    primary_uri = settings.SQLALCHEMY_DATABASE_URI
    engine_candidate = _create_engine_for_uri(primary_uri)
    strict_db = os.getenv("ALEMBIC_STRICT_DB") == "1"

    if primary_uri.startswith("sqlite"):
        return engine_candidate

    try:
        with engine_candidate.connect() as conn:
            conn.execute(text("SELECT 1"))
        return engine_candidate
    except SQLAlchemyError as exc:
        if strict_db:
            raise
        fallback_uri = "sqlite:///./cashflow.db"
        logger.warning(
            "Primary database unavailable, falling back to local SQLite.",
            extra={"primary_uri": primary_uri, "fallback_uri": fallback_uri, "error": str(exc)},
        )
        return _create_engine_for_uri(fallback_uri)


engine = _resolve_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
