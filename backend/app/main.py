from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .routers import auth, subjects, topics, exams, sessions, planner

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(title='AI Study Planner API', version='1.0.0')

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(topics.router)
app.include_router(exams.router)
app.include_router(sessions.router)
app.include_router(planner.router)

@app.get('/')
def root():
    return {"message": "AI Study Planner API is running", "status": "online"}
