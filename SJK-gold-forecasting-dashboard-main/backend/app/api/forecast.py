import logging
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.schemas import ForecastRequest, ForecastResponse
from app.services import forecast_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/forecast", tags=["Forecasting"])

@router.post("/calculate", response_model=ForecastResponse)
def calculate(req: ForecastRequest):
    try:
        return forecast_service.calculate_forecast(req)
    except ValueError as e:
        logger.warning(f"Validation error in forecast calculate: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception("Forecasting calculation exception")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Forecasting service error"
        )

