from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas, models, auth as auth_utils
from ..services.planner import generate_plan
from ..database import get_db

router = APIRouter(prefix="/plan", tags=["plan"])

@router.post("/", response_model=schemas.PlanResponse)
def create_plan(
    request: schemas.PlanRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    if request.available_hours <= 0:
        raise HTTPException(status_code=400, detail="available_hours must be > 0")
    plan = generate_plan(
        db=db,
        user_id=current_user.id,
        available_hours=request.available_hours,
        study_style=request.study_style,
        subject_ids=request.subject_ids,
        topic_ids=request.topic_ids,
        auto_mode=request.auto_mode,
        is_quick_planner=request.is_quick_planner,
        custom_instructions=request.custom_instructions
    )
    return plan



