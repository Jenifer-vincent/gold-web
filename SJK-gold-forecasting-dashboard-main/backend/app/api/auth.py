import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.models.database import get_db, User
from app.models.schemas import UserCreate, UserLogin, Token, UserResponse
from app.services import auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = auth_service.decode_access_token(token)
        if payload is None:
            raise credentials_exception
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        user = auth_service.get_user_by_email(db, email=email)
        if user is None:
            raise credentials_exception
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error decoding token in get_current_user")
        raise credentials_exception

@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    try:
        db_user = auth_service.get_user_by_email(db, email=user_data.email)
        if db_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        user = auth_service.create_user(db, user_data)
        access_token = auth_service.create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error during user registration")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Registration failed")

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    try:
        user = auth_service.get_user_by_email(db, email=login_data.email)
        if not user:
            # Auto-signup for new users to prevent friction
            user = auth_service.create_user(
                db, 
                UserCreate(
                    email=login_data.email, 
                    password=login_data.password,
                    full_name=login_data.email.split('@')[0].title()
                )
            )
        elif not auth_service.verify_password(login_data.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token = auth_service.create_access_token(data={"sub": user.email})
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error during user login")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Login failed")

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

