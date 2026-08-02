from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, ForeignKey, Date
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import os
from app.utils.config import DATABASE_URL

# Connect arguments check for sqlite
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)

    investments = relationship("Investment", back_populates="owner", cascade="all, delete-orphan")
    settings = relationship("Settings", back_populates="owner", uselist=False, cascade="all, delete-orphan")

class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    asset = Column(String, nullable=False)          # e.g., "24K Physical Gold"
    grams = Column(Float, nullable=False)
    avg_price = Column(Float, nullable=False)        # purchase price per gram
    date_of_purchase = Column(String, nullable=False)# ISO format or string
    city = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    owner = relationship("User", back_populates="investments")

class Settings(Base):
    __tablename__ = "settings"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    base_currency = Column(String, default="INR")
    default_city = Column(String, default="Mumbai")
    alerts_price = Column(Boolean, default=True)
    alerts_forecast = Column(Boolean, default=True)
    alerts_news = Column(Boolean, default=False)

    owner = relationship("User", back_populates="settings")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
