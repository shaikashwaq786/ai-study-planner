from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

# User schemas
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(...)
    password: str = Field(..., min_length=6)

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Subject schemas
class SubjectBase(BaseModel):
    name: str

class SubjectCreate(SubjectBase):
    pass

class SubjectResponse(SubjectBase):
    id: int
    owner_id: int

    class Config:
        from_attributes = True

# Topic schemas
class TopicBase(BaseModel):
    name: str
    difficulty: int = 1
    priority: int = 1
    completed: bool = False

class TopicCreate(TopicBase):
    subject_id: int

class TopicUpdate(BaseModel):
    name: Optional[str] = None
    difficulty: Optional[int] = None
    priority: Optional[int] = None
    completed: Optional[bool] = None

class TopicResponse(TopicBase):
    id: int
    subject_id: int

    class Config:
        from_attributes = True

# Exam / Academic Calendar schemas
class ExamBase(BaseModel):
    title: str
    date: datetime
    event_type: Optional[str] = "exam"  # 'exam', 'assignment', 'quiz', 'project'
    notes: Optional[str] = None

class ExamCreate(ExamBase):
    subject_id: int

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[datetime] = None
    event_type: Optional[str] = None
    notes: Optional[str] = None
    subject_id: Optional[int] = None

class ExamResponse(ExamBase):
    id: int
    owner_id: int
    subject_id: int

    class Config:
        from_attributes = True

# Study session schemas
class StudySessionBase(BaseModel):
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = 0
    subject_name: Optional[str] = None
    topic_name: Optional[str] = None
    notes: Optional[str] = None

class StudySessionCreate(StudySessionBase):
    pass

class StudySessionResponse(StudySessionBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# Planner schemas
class PlanItem(BaseModel):
    subject: str
    topic: str
    scheduled_start: str
    scheduled_end: str
    duration_hours: float
    priority_score: float
    reason: str
    study_strategy: str = "Active Recall & Practice Problems"
    pomodoros: int = 2

class PlanResponse(BaseModel):
    plan: List[PlanItem]
    total_hours: float
    study_style: str
    ai_summary: str

    class Config:
        from_attributes = True

class PlanRequest(BaseModel):
    available_hours: float = Field(..., gt=0)
    study_style: str = "Pomodoro (25/5)"
    subject_ids: Optional[List[int]] = None
    topic_ids: Optional[List[int]] = None
    auto_mode: Optional[bool] = False
    is_quick_planner: Optional[bool] = False
    custom_instructions: Optional[str] = None



