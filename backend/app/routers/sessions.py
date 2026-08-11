from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas, models, auth as auth_utils
from ..database import get_db

router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.post("/", response_model=schemas.StudySessionResponse)
def create_session(session: schemas.StudySessionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    db_session = models.StudySession(
        start_time=session.start_time,
        end_time=session.end_time,
        duration_minutes=session.duration_minutes,
        subject_name=session.subject_name,
        topic_name=session.topic_name,
        notes=session.notes,
        user_id=current_user.id
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@router.get("/", response_model=list[schemas.StudySessionResponse])
def list_sessions(db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    return db.query(models.StudySession).filter(models.StudySession.user_id == current_user.id).all()

@router.get("/{session_id}", response_model=schemas.StudySessionResponse)
def get_session(session_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    sess = db.query(models.StudySession).filter(models.StudySession.id == session_id, models.StudySession.user_id == current_user.id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return sess

@router.delete("/{session_id}", response_model=dict)
def delete_session(session_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    sess = db.query(models.StudySession).filter(models.StudySession.id == session_id, models.StudySession.user_id == current_user.id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    db.delete(sess)
    db.commit()
    return {"detail": "Session deleted"}
