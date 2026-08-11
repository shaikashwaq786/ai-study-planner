from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas, models, auth as auth_utils
from ..database import get_db

router = APIRouter(prefix="/exams", tags=["exams"])

@router.post("/", response_model=schemas.ExamResponse)
def create_exam(exam: schemas.ExamCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    # Verify subject belongs to user
    subject = db.query(models.Subject).filter(models.Subject.id == exam.subject_id, models.Subject.owner_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found or not owned by user")
    db_exam = models.Exam(
        title=exam.title,
        date=exam.date,
        event_type=exam.event_type or "exam",
        subject_id=exam.subject_id,
        owner_id=current_user.id,
        notes=exam.notes
    )
    db.add(db_exam)
    db.commit()
    db.refresh(db_exam)
    return db_exam

@router.get("/", response_model=list[schemas.ExamResponse])
def list_exams(db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    return db.query(models.Exam).filter(models.Exam.owner_id == current_user.id).all()

@router.get("/{exam_id}", response_model=schemas.ExamResponse)
def get_exam(exam_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id, models.Exam.owner_id == current_user.id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam

@router.put("/{exam_id}", response_model=schemas.ExamResponse)
def update_exam(exam_id: int, updates: schemas.ExamUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id, models.Exam.owner_id == current_user.id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    if updates.title is not None:
        exam.title = updates.title
    if updates.date is not None:
        exam.date = updates.date
    if updates.event_type is not None:
        exam.event_type = updates.event_type
    if updates.notes is not None:
        exam.notes = updates.notes

    if updates.subject_id is not None:
        # Verify new subject belongs to user
        new_subject = db.query(models.Subject).filter(models.Subject.id == updates.subject_id, models.Subject.owner_id == current_user.id).first()
        if not new_subject:
            raise HTTPException(status_code=404, detail="New subject not found or not owned by user")
        exam.subject_id = updates.subject_id
    db.commit()
    db.refresh(exam)
    return exam

@router.delete("/{exam_id}", response_model=dict)
def delete_exam(exam_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id, models.Exam.owner_id == current_user.id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    db.delete(exam)
    db.commit()
    return {"detail": "Exam deleted"}
