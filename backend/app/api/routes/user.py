from fastapi import APIRouter, Header
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class UserProfile(BaseModel):
    id: str
    email: str


class WorkspaceSettings(BaseModel):
    tax_rate: float = 0.18
    theme: str = "dark"
    notifications_enabled: bool = True


class PaymentCard(BaseModel):
    id: str
    brand: Optional[str] = None
    last4: Optional[str] = None
    expiry: Optional[str] = None
    spending_limit: Optional[float] = None


_DEFAULT_PROFILE_EMAIL = "demo@flowiq.ai"
_settings_store = WorkspaceSettings()
_cards_store: List[PaymentCard] = []


def _profile_from_auth(auth_header: Optional[str]) -> UserProfile:
    token = ""
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    user_id = token or "demo-user"
    return UserProfile(id=user_id, email=_DEFAULT_PROFILE_EMAIL)


@router.get("/profile", response_model=UserProfile)
def get_profile(authorization: Optional[str] = Header(default=None)):
    return _profile_from_auth(authorization)


@router.get("/settings", response_model=WorkspaceSettings)
def get_settings():
    return _settings_store


@router.put("/settings", response_model=WorkspaceSettings)
def update_settings(payload: WorkspaceSettings):
    global _settings_store
    _settings_store = payload
    return _settings_store


@router.get("/payment-cards", response_model=List[PaymentCard])
def list_payment_cards():
    return _cards_store
