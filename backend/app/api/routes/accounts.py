from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.domain import CashBalance
from app.schemas.schemas import CashBalanceCreate, CashBalanceResponse

router = APIRouter()

@router.get("/", response_model=CashBalanceResponse)
def get_balance(db: Session = Depends(get_db)):
    balance = db.query(CashBalance).first()
    if not balance:
        balance = CashBalance(amount=0.0)
        db.add(balance)
        db.commit()
        db.refresh(balance)
    return balance

@router.post("/", response_model=CashBalanceResponse)
def update_balance(cash_in: CashBalanceCreate, db: Session = Depends(get_db)):
    balance = db.query(CashBalance).first()
    if not balance:
        balance = CashBalance(amount=cash_in.amount)
        db.add(balance)
    else:
        balance.amount = cash_in.amount
    db.commit()
    db.refresh(balance)
    return balance
