import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.models.database import get_db, User
from app.models.schemas import InvestmentCreate, InvestmentUpdate, InvestmentResponse
from app.api.auth import get_current_user
from app.services import portfolio_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])

@router.get("/holdings")
def get_holdings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        investments = portfolio_service.get_user_investments(db, current_user.id)
        spot_price_10g = portfolio_service.get_latest_spot_price_10g()
        
        total_grams = sum(inv.grams for inv in investments)
        total_invested = sum((inv.avg_price * inv.grams) / 10.0 for inv in investments)
        total_current = sum((spot_price_10g * inv.grams) / 10.0 for inv in investments)
        
        pnl = total_current - total_invested
        pnl_pct = (pnl / total_invested * 100) if total_invested > 0 else 0.0
        
        alloc_map: Dict[str, float] = {}
        for inv in investments:
            alloc_map[inv.asset] = alloc_map.get(inv.asset, 0.0) + inv.grams
            
        allocations = []
        for asset, grams in alloc_map.items():
            asset_value = (spot_price_10g * grams) / 10.0
            pct = (asset_value / total_current * 100) if total_current > 0 else 0.0
            allocations.append({
                "asset": asset,
                "grams": round(grams, 2),
                "value": round(asset_value, 2),
                "alloc": round(pct, 1)
            })
            
        holdings_res = [
            InvestmentResponse(
                id=inv.id,
                asset=inv.asset,
                grams=inv.grams,
                avg_price=inv.avg_price,
                date_of_purchase=inv.date_of_purchase,
                city=inv.city,
                notes=inv.notes
            )
            for inv in investments
        ]
        
        return {
            "holdings": holdings_res,
            "summary": {
                "totalGrams": round(total_grams, 2),
                "investedValue": round(total_invested, 2),
                "currentValue": round(total_current, 2),
                "unrealisedPL": round(pnl, 2),
                "unrealisedPLPct": round(pnl_pct, 2)
            },
            "allocations": allocations
        }
    except Exception as e:
        logger.exception("Error in get_holdings")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch portfolio holdings")

@router.post("/holdings", response_model=InvestmentResponse)
def create_holding(data: InvestmentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        return portfolio_service.create_investment(db, current_user.id, data)
    except Exception as e:
        logger.exception("Error in create_holding")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create investment holding")

@router.put("/holdings/{id}", response_model=InvestmentResponse)
def update_holding(id: int, data: InvestmentUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        res = portfolio_service.update_investment(db, current_user.id, id, data)
        if not res:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment position not found")
        return res
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error in update_holding for id {id}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update investment holding")

@router.delete("/holdings/{id}")
def delete_holding(id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        success = portfolio_service.delete_investment(db, current_user.id, id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment position not found")
        return {"message": "Holding deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error in delete_holding for id {id}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete investment holding")

