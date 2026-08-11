from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import schemas, models, auth as auth_utils
from ..database import get_db

router = APIRouter(prefix="/topics", tags=["topics"])

@router.post("/", response_model=schemas.TopicResponse)
def create_topic(topic: schemas.TopicCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    # Verify subject belongs to user
    subject = db.query(models.Subject).filter(models.Subject.id == topic.subject_id, models.Subject.owner_id == current_user.id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found or not owned by user")
    db_topic = models.Topic(name=topic.name, subject_id=topic.subject_id, difficulty=topic.difficulty, priority=topic.priority)
    db.add(db_topic)
    db.commit()
    db.refresh(db_topic)
    return db_topic

@router.get("/", response_model=list[schemas.TopicResponse])
def list_topics(db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    return db.query(models.Topic).join(models.Subject).filter(models.Subject.owner_id == current_user.id).all()

@router.get("/{topic_id}", response_model=schemas.TopicResponse)
def get_topic(topic_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    topic = db.query(models.Topic).join(models.Subject).filter(models.Topic.id == topic_id, models.Subject.owner_id == current_user.id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic

@router.put("/{topic_id}", response_model=schemas.TopicResponse)
def update_topic(topic_id: int, updates: schemas.TopicUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    topic = db.query(models.Topic).join(models.Subject).filter(models.Topic.id == topic_id, models.Subject.owner_id == current_user.id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    if updates.name is not None:
        topic.name = updates.name
    if updates.difficulty is not None:
        topic.difficulty = updates.difficulty
    if updates.priority is not None:
        topic.priority = updates.priority
    if updates.completed is not None:
        topic.completed = updates.completed
    db.commit()
    db.refresh(topic)
    return topic

@router.delete("/{topic_id}", response_model=dict)
def delete_topic(topic_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth_utils.get_current_user)):
    topic = db.query(models.Topic).join(models.Subject).filter(models.Topic.id == topic_id, models.Subject.owner_id == current_user.id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    db.delete(topic)
    db.commit()
    return {"detail": "Topic deleted"}
