import os
import logging
from logging.handlers import RotatingFileHandler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.database import init_db
from app.api import auth, forecast, portfolio, settings, market
# Setup logging directories
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
os.makedirs(log_dir, exist_ok=True)

# Base Logger configuration
formatter = logging.Formatter("[%(asctime)s] %(levelname)s [%(name)s] - %(message)s")

# API log handler
api_handler = RotatingFileHandler(os.path.join(log_dir, "api.log"), maxBytes=1048576 * 5, backupCount=3)
api_handler.setFormatter(formatter)
api_handler.setLevel(logging.INFO)

# Error log handler
error_handler = RotatingFileHandler(os.path.join(log_dir, "error.log"), maxBytes=1048576 * 5, backupCount=3)
error_handler.setFormatter(formatter)
error_handler.setLevel(logging.ERROR)

# Setup root logger
root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.addHandler(api_handler)
root_logger.addHandler(error_handler)

# Init SQLAlchemy database on startup
init_db()

app = FastAPI(
    title="SJK Gold Forecasting API",
    description="REST API backend replacing Streamlit for the SJK Gold Forecasting Dashboard.",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:8080",
    "http://localhost:8081",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(forecast.router, prefix="/api/v1")
app.include_router(portfolio.router, prefix="/api/v1")
app.include_router(settings.router, prefix="/api/v1")
app.include_router(market.router, prefix="/api/v1")

@app.get("/")
def read_root():
    logging.info("Root endpoint hit")
    return {
        "status": "online",
        "message": "SJK Gold Forecasting API v1.0.0 is running",
        "endpoints": [
            "/api/v1/auth",
            "/api/v1/forecast",
            "/api/v1/portfolio",
            "/api/v1/settings",
            "/api/v1/market"
        ]
    }
