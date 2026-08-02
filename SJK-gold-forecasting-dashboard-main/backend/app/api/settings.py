import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.models.database import get_db, User, Settings
from app.models.schemas import SettingsResponse, SettingsUpdate, UserProfileUpdate, UserResponse
from app.api.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=SettingsResponse)
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        settings = db.query(Settings).filter(Settings.user_id == current_user.id).first()
        if not settings:
            settings = Settings(user_id=current_user.id)
            db.add(settings)
            db.commit()
            db.refresh(settings)
        return settings
    except Exception as e:
        logger.exception("Error in get_settings")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch settings")

@router.put("/profile", response_model=UserResponse)
def update_profile(data: UserProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        if data.email.lower().strip() != current_user.email:
            taken = db.query(User).filter(User.email == data.email.lower().strip()).first()
            if taken:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already taken")
                
        current_user.full_name = data.full_name
        current_user.email = data.email.lower().strip()
        current_user.phone = data.phone
        db.commit()
        db.refresh(current_user)
        return current_user
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in update_profile")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update profile")

@router.put("/preferences", response_model=SettingsResponse)
def update_preferences(data: SettingsUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        settings = db.query(Settings).filter(Settings.user_id == current_user.id).first()
        if not settings:
            settings = Settings(user_id=current_user.id)
            db.add(settings)
            
        if data.base_currency is not None:
            settings.base_currency = data.base_currency
        if data.default_city is not None:
            settings.default_city = data.default_city
            
        db.commit()
        db.refresh(settings)
        return settings
    except Exception as e:
        logger.exception("Error in update_preferences")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update preferences")

@router.put("/alerts", response_model=SettingsResponse)
def update_alerts(data: SettingsUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        settings = db.query(Settings).filter(Settings.user_id == current_user.id).first()
        if not settings:
            settings = Settings(user_id=current_user.id)
            db.add(settings)
            
        if data.alerts_price is not None:
            settings.alerts_price = data.alerts_price
        if data.alerts_forecast is not None:
            settings.alerts_forecast = data.alerts_forecast
        if data.alerts_news is not None:
            settings.alerts_news = data.alerts_news
            
        db.commit()
        db.refresh(settings)
        return settings
    except Exception as e:
        logger.exception("Error in update_alerts")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update alerts")

