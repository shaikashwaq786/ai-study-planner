from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from sqlalchemy.orm import Session
from .. import schemas, models, auth as auth_utils
from ..database import get_db
from ..services.syllabus_analyzer import analyze_and_create_syllabus

router = APIRouter(prefix="/subjects", tags=["subjects"])

@router.post("/analyze-syllabus")
async def analyze_syllabus(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    result = analyze_and_create_syllabus(
        db=db,
        user_id=current_user.id,
        file_bytes=file_bytes,
        filename=file.filename,
        content_type=file.content_type or "application/pdf"
    )
    return result

@router.post("/", response_model=schemas.SubjectResponse)
def create_subject(subject: schemas.SubjectCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    db_subject = models.Subject(name=subject.name, owner_id=current_user.id)
    db.add(db_subject)
    db.commit()
    db.refresh(db_subject)
    return db_subject

@router.get("/", response_model=list[schemas.SubjectResponse])
def list_subjects(db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    return db.query(models.Subject).filter(models.Subject.owner_id == current_user.id).all()

@router.get("/{subject_id}", response_model=schemas.SubjectResponse)
def get_subject(subject_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id, models.Subject.owner_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    return subject

@router.delete("/{subject_id}", response_model=dict)
def delete_subject(subject_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id, models.Subject.owner_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(subject)
    db.commit()
    return {"detail": "Subject deleted"}
