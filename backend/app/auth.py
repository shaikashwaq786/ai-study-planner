import os
import bcrypt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from . import models
from .database import get_db

SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'studyplanner_secret_key_change_me_12345')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    password_bytes = password.encode('utf-8')[:72]
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')

def authenticate_user(db: Session, username: str, password: str) -> Optional[models.User]:
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> models.User:
    jwt_token = None
    if token:
        jwt_token = token
    elif authorization:
        scheme, _, bearer_token = authorization.partition(" ")
        if scheme.lower() == "bearer" and bearer_token:
            jwt_token = bearer_token

    if not jwt_token:
        raise HTTPException(status_code=401, detail="Missing authorization token")

    payload = decode_access_token(jwt_token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(status_code=401, detail="Token missing username")

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
