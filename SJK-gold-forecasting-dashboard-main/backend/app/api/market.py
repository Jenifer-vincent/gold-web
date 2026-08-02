import random
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services import market_service, forecast_service, currency_api

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Market Intelligence"])

class SimulateRateRequest(BaseModel):
    rate: float

class CurrencyConvertRequest(BaseModel):
    amount: float
    from_curr: str
    to_curr: str

class ChatRequest(BaseModel):
    message: str

@router.get("/market/live-kpis")
def get_live_kpis():
    try:
        mg = forecast_service.load_gold_data()
        if mg is None:
            raise HTTPException(status_code=500, detail="Historical dataset not loaded")
            
        cur_g = float(mg.iloc[-1])
        prv_g = float(mg.iloc[-2])
        
        pct_22k = (cur_g - prv_g) / prv_g * 100
        
        spot22K_10g = cur_g * 10
        spot24K_10g = spot22K_10g / 0.916
        
        prv22K_10g = prv_g * 10
        prv24K_10g = prv22K_10g / 0.916
        pct_24k = (spot24K_10g - prv24K_10g) / prv24K_10g * 100
        
        return {
            "price_24k": round(spot24K_10g, 0),
            "price_22k": round(spot22K_10g, 0),
            "change_24k": f"{pct_24k:+.2f}%",
            "change_22k": f"{pct_22k:+.2f}%",
            "trend_24k": "up" if pct_24k >= 0 else "down",
            "trend_22k": "up" if pct_22k >= 0 else "down",
            "usd_inr": 83.42,
            "usd_inr_change": "-0.12%",
            "silver_1kg": 92150,
            "silver_change": "+1.24%",
            "bid": round(spot24K_10g - 10, 0),
            "ask": round(spot24K_10g + 10, 0),
            "day_high": round(spot24K_10g + 145, 0),
            "day_low": round(spot24K_10g - 310, 0)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in get_live_kpis")
        raise HTTPException(status_code=500, detail="Failed to fetch live KPIs")

@router.get("/market/insights")
def get_insights():
    try:
        return market_service.get_market_insights()
    except Exception as e:
        logger.exception("Error in get_insights")
        raise HTTPException(status_code=500, detail="Failed to fetch market insights")

@router.get("/market/volume")
def get_market_volume():
    try:
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        random.seed(42)
        return [{"d": d, "v": random.randint(1200, 2000)} for d in days]
    except Exception as e:
        logger.exception("Error in get_market_volume")
        raise HTTPException(status_code=500, detail="Failed to fetch market volume")

@router.get("/economic/indicators")
def get_indicators():
    try:
        mg = forecast_service.load_gold_data()
        spot_g = float(mg.iloc[-1]) if mg is not None else 6859.0
        return market_service.get_economic_indicators(spot_g)
    except Exception as e:
        logger.exception("Error in get_indicators")
        raise HTTPException(status_code=500, detail="Failed to fetch economic indicators")

@router.get("/regional/prices")
def get_regional_prices():
    try:
        mg = forecast_service.load_gold_data()
        spot_g = float(mg.iloc[-1]) if mg is not None else 6859.0
        return {
            "regional": market_service.get_regional_prices(spot_g),
            "global": market_service.get_global_prices(spot_g)
        }
    except Exception as e:
        logger.exception("Error in get_regional_prices")
        raise HTTPException(status_code=500, detail="Failed to fetch regional prices")

@router.post("/market/simulate-interest-rate")
def simulate_rate(req: SimulateRateRequest):
    try:
        mg = forecast_service.load_gold_data()
        spot_g = float(mg.iloc[-1]) if mg is not None else 6859.0
        return market_service.simulate_interest_rate(req.rate, spot_g)
    except Exception as e:
        logger.exception("Error in simulate_rate")
        raise HTTPException(status_code=500, detail="Simulation error")

@router.post("/market/convert")
def convert_curr(req: CurrencyConvertRequest):
    try:
        res = currency_api.convert_currency_with_fallback(req.amount, req.from_curr, req.to_curr)
        return {"converted_amount": round(res, 2)}
    except Exception as e:
        logger.exception("Error in convert_curr")
        raise HTTPException(status_code=500, detail="Currency conversion error")

@router.post("/chat")
def chatbot_chat(req: ChatRequest):
    try:
        if not req.message or not req.message.strip():
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        answer = market_service.get_chatbot_answer(req.message)
        return {"text": answer or "No response available."}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in chatbot_chat")
        raise HTTPException(status_code=500, detail="AI Assistant service error")

class StrategyRequest(BaseModel):
    monthly: float
    horizon: int
    risk: str
    goal: str

@router.post("/market/strategy")
def get_strategy_plan(req: StrategyRequest):
    try:
        cagr = 0.08
        if req.risk == "conservative":
            cagr = 0.075
        elif req.risk == "aggressive":
            cagr = 0.09
            
        vol = "±12%"
        if req.risk == "conservative":
            vol = "±8%"
        elif req.risk == "aggressive":
            vol = "±15%"
            
        monthly_rate = cagr / 12
        months = req.horizon * 12
        
        if monthly_rate > 0:
            corpus = req.monthly * (((1 + monthly_rate)**months - 1) / monthly_rate) * (1 + monthly_rate)
        else:
            corpus = req.monthly * months
            
        if req.risk == "conservative":
            allocs = [
                {"name": "Sovereign Gold Bonds (SGB)", "pct": 55, "color": "oklch(0.78 0.13 82)"},
                {"name": "Gold ETFs", "pct": 25, "color": "oklch(0.7 0.15 200)"},
                {"name": "Physical / Coins", "pct": 15, "color": "oklch(0.72 0.17 155)"},
                {"name": "Digital Gold", "pct": 5, "color": "oklch(0.65 0.18 300)"}
            ]
        elif req.risk == "aggressive":
            allocs = [
                {"name": "Sovereign Gold Bonds (SGB)", "pct": 30, "color": "oklch(0.78 0.13 82)"},
                {"name": "Gold ETFs", "pct": 40, "color": "oklch(0.7 0.15 200)"},
                {"name": "Physical / Coins", "pct": 10, "color": "oklch(0.72 0.17 155)"},
                {"name": "Digital Gold", "pct": 20, "color": "oklch(0.65 0.18 300)"}
            ]
        else:
            allocs = [
                {"name": "Sovereign Gold Bonds (SGB)", "pct": 45, "color": "oklch(0.78 0.13 82)"},
                {"name": "Gold ETFs", "pct": 30, "color": "oklch(0.7 0.15 200)"},
                {"name": "Physical / Coins", "pct": 15, "color": "oklch(0.72 0.17 155)"},
                {"name": "Digital Gold", "pct": 10, "color": "oklch(0.65 0.18 300)"}
            ]
            
        return {
            "projectedCorpus": round(corpus, 0),
            "assumedCagr": f"{cagr*100:.1f}%",
            "volatilityBand": vol,
            "allocations": allocs
        }
    except Exception as e:
        logger.exception("Error in get_strategy_plan")
        raise HTTPException(status_code=500, detail="Strategy calculation error")

