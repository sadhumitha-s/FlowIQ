from fastapi import APIRouter
from app.api.routes import accounts, payables, receivables, engine, ingestion, user, core

api_router = APIRouter()
api_router.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
api_router.include_router(payables.router, prefix="/payables", tags=["Payables"])
api_router.include_router(receivables.router, prefix="/receivables", tags=["Receivables"])
api_router.include_router(ingestion.router, prefix="/ingestion", tags=["Ingestion"])
api_router.include_router(engine.router, prefix="/engine", tags=["Engine"])
api_router.include_router(user.router, prefix="/user", tags=["User"])
api_router.include_router(core.router, prefix="/core", tags=["Core"])
