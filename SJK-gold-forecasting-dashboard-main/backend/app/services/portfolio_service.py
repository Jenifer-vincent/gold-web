import datetime
from sqlalchemy.orm import Session
from app.models.database import Investment
from app.models.schemas import InvestmentCreate, InvestmentUpdate
from app.services import forecast_service

def get_latest_spot_price_10g() -> float:
    mg = forecast_service.load_gold_data()
    if mg is not None:
        return float(mg.iloc[-1]) * 10.0
    return 74820.0  # Fallback MCX Spot Price per 10g

def calculate_holding_period_months(purchase_date_str: str) -> int:
    try:
        # Assuming YYYY-MM-DD format
        p_date = datetime.datetime.strptime(purchase_date_str, "%Y-%m-%d").date()
        today = datetime.date.today()
        delta = today - p_date
        return max(0, delta.days // 30)
    except:
        return 0

def get_user_investments(db: Session, user_id: int):
    return db.query(Investment).filter(Investment.user_id == user_id).all()

def create_investment(db: Session, user_id: int, data: InvestmentCreate) -> Investment:
    db_item = Investment(
        user_id=user_id,
        asset=data.asset,
        grams=data.grams,
        avg_price=data.avg_price,
        date_of_purchase=data.date_of_purchase,
        city=data.city,
        notes=data.notes
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

def update_investment(db: Session, user_id: int, investment_id: int, data: InvestmentUpdate):
    db_item = db.query(Investment).filter(Investment.id == investment_id, Investment.user_id == user_id).first()
    if not db_item:
        return None
    for k, v in data.dict(exclude_unset=True).items():
        setattr(db_item, k, v)
    db.commit()
    db.refresh(db_item)
    return db_item

def delete_investment(db: Session, user_id: int, investment_id: int) -> bool:
    db_item = db.query(Investment).filter(Investment.id == investment_id, Investment.user_id == user_id).first()
    if not db_item:
        return False
    db.delete(db_item)
    db.commit()
    return True
