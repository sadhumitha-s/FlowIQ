from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.domain import FinancialItem, ItemType
from app.schemas.schemas import FinancialItemCreate, FinancialItemResponse
from app.services.clustering import cluster_obligation

router = APIRouter()

@router.get("/", response_model=List[FinancialItemResponse])
def get_payables(db: Session = Depends(get_db)):
    return db.query(FinancialItem).filter(FinancialItem.item_type == ItemType.payable).all()

@router.post("/", response_model=FinancialItemResponse)
def create_payable(item_in: FinancialItemCreate, db: Session = Depends(get_db)):
    item = FinancialItem(**item_in.model_dump())
    item.item_type = ItemType.payable
    
    # Auto cluster if not provided
    if not item.category or item.category.value == "unassigned":
        item.category = cluster_obligation(item)
        
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_payable(item_id: int, db: Session = Depends(get_db)):
    item = db.query(FinancialItem).filter(FinancialItem.id == item_id).first()
    if item:
        db.delete(item)
        db.commit()
    return {"status": "ok"}
