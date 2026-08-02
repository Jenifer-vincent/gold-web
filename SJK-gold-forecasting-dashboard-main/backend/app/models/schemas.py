from pydantic import BaseModel, Field
from typing import List, Optional, Any

# Auth schemas
class UserCreate(BaseModel):
    email: str
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True

# Settings schemas
class SettingsUpdate(BaseModel):
    base_currency: Optional[str] = "INR"
    default_city: Optional[str] = "Mumbai"
    alerts_price: Optional[bool] = True
    alerts_forecast: Optional[bool] = True
    alerts_news: Optional[bool] = False

class SettingsResponse(BaseModel):
    base_currency: str
    default_city: str
    alerts_price: bool
    alerts_forecast: bool
    alerts_news: bool

    class Config:
        from_attributes = True

class UserProfileUpdate(BaseModel):
    full_name: str
    email: str
    phone: str

# Investment/Portfolio schemas
class InvestmentCreate(BaseModel):
    asset: str
    grams: float = Field(..., gt=0)
    avg_price: float = Field(..., gt=0)
    date_of_purchase: str
    city: Optional[str] = "Mumbai"
    notes: Optional[str] = None

class InvestmentUpdate(BaseModel):
    asset: Optional[str] = None
    grams: Optional[float] = None
    avg_price: Optional[float] = None
    date_of_purchase: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None

class InvestmentResponse(BaseModel):
    id: int
    asset: str
    grams: float
    avg_price: float
    date_of_purchase: str
    city: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True

# Forecasting schemas
class ForecastRequest(BaseModel):
    grams: float = Field(default=10.0, gt=0)
    buyPrice: float = Field(default=70000.0, gt=0)
    making: float = Field(default=10.0, ge=0, le=50)
    gst: float = Field(default=3.0, ge=0, le=50)
    months: Optional[int] = Field(default=24, ge=1, le=120)

class ForecastChartItem(BaseModel):
    date: str
    actual: Optional[float] = None
    forecast: Optional[float] = None
    upper: Optional[float] = None
    lower: Optional[float] = None

class PLTableItem(BaseModel):
    date: str
    forecast_price: float
    total_value: float
    profit_loss: float
    inflation_adj_pl: float
    status: str

class ForecastResponse(BaseModel):
    allInCost: float
    totalInvested: float
    breakEvenSpotDiffPct: float
    breakEvenPrice: float
    breakEvenMonth: Optional[str] = None
    target5: float
    target10: float
    forecastSeries: List[ForecastChartItem]
    plTable: List[PLTableItem]

# Strategy schemas
class StrategyRequest(BaseModel):
    monthlyInvestment: float = Field(default=10000.0, ge=500)
    horizonYears: int = Field(default=5, ge=1, le=30)
    riskProfile: str = Field(default="balanced") # conservative, balanced, aggressive
    primaryGoal: str = Field(default="wealth")   # wealth, wedding, hedge, retire

class StrategyAllocationItem(BaseModel):
    name: str
    pct: float
    color: str

class StrategyResponse(BaseModel):
    projectedCorpus: float
    assumedCAGR: float
    volatilityBand: str
    recommendedAllocation: List[StrategyAllocationItem]

# Chatbot schemas
class ChatMessage(BaseModel):
    role: str # user or assistant
    text: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    text: str
