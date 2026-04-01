from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.services.subscription_audit import SubscriptionAuditService
from app.schemas.schemas import SubscriptionAuditResult, SubscriptionResponse

router = APIRouter()

@router.post("/audit", response_model=SubscriptionAuditResult)
async def audit_subscriptions(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    content = await file.read()
    service = SubscriptionAuditService(db)
    try:
        return service.audit_csv(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[SubscriptionResponse])
def get_active_subscriptions(db: Session = Depends(get_db)):
    service = SubscriptionAuditService(db)
    return service.get_all_active()
