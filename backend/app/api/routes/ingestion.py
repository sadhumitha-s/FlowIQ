from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.domain import FinancialItem, ItemType
from app.schemas.schemas import OCRIngestionResponse
from app.services.clustering import cluster_obligation
from app.services.ocr_ingestion import OCRDependencyError, parse_financial_document
from app.services.vision_invoice import VisionServiceError

router = APIRouter()


@router.post("/ocr", response_model=OCRIngestionResponse)
async def ingest_ocr_document(
    file: UploadFile = File(...),
    default_item_type: ItemType = Form(default=ItemType.payable),
    db: Session = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image uploads are supported.")

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    try:
        parsed_items = parse_financial_document(payload, default_item_type=default_item_type)
    except OCRDependencyError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except VisionServiceError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    if not parsed_items:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No financial line-items were detected in the document.",
        )

    created_items: list[FinancialItem] = []
    for parsed in parsed_items:
        item = FinancialItem(**parsed)
        if item.item_type == ItemType.payable and (not item.category or item.category.value == "unassigned"):
            item.category = cluster_obligation(item)
        db.add(item)
        created_items.append(item)

    db.commit()
    for item in created_items:
        db.refresh(item)

    return OCRIngestionResponse(created_count=len(created_items), items=created_items)
