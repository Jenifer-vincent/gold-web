import os
import pandas as pd
import numpy as np
import datetime
import joblib
from typing import Optional, Dict, Any, List
from app.models.schemas import ForecastRequest, ForecastResponse, ForecastChartItem, PLTableItem

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
CSV_PATH = os.path.join(DATA_DIR, "GoldRate_Historydata.csv")
PKL_PATH = os.path.join(DATA_DIR, "sarima_gold_model.pkl")

# Cached objects
_gold_data = None
_sarima_model = None

def load_gold_data() -> Optional[pd.Series]:
    global _gold_data
    if _gold_data is not None:
        return _gold_data

    if not os.path.exists(CSV_PATH):
        print(f"Error: Dataset not found at {CSV_PATH}")
        return None
    try:
        df = pd.read_csv(CSV_PATH)
        df["Date"] = pd.to_datetime(
            df["Date"].astype(str).str.strip().str.replace("-", "/"),
            dayfirst=True, errors="coerce"
        )
        df.set_index("Date", inplace=True)
        if "22K Rate" in df.columns:
            df["22K Rate"] = pd.to_numeric(
                df["22K Rate"].astype(str).str.replace(",", ""), errors="coerce"
            )
            df.dropna(subset=["22K Rate"], inplace=True)
            # Resample to monthly mean
            try:
                _gold_data = df["22K Rate"].resample("ME").mean()
            except Exception:
                _gold_data = df["22K Rate"].resample("M").mean()
            return _gold_data
        return None
    except Exception as e:
        print(f"Error loading gold dataset: {e}")
        return None

def load_sarima_model() -> Optional[Any]:
    global _sarima_model
    if _sarima_model is not None:
        return _sarima_model

    if not os.path.exists(PKL_PATH):
        print(f"Error: Model not found at {PKL_PATH}")
        return None
    try:
        _sarima_model = joblib.load(PKL_PATH)
        return _sarima_model
    except Exception as e:
        print(f"Error loading SARIMA model: {e}")
        return None

def calculate_forecast(req: ForecastRequest) -> ForecastResponse:
    mg = load_gold_data()
    sm = load_sarima_model()

    if mg is None or sm is None:
        # Fallback to realistic values if files are somehow missing (though we verified they exist)
        raise ValueError("GoldRate_Historydata.csv or sarima_gold_model.pkl not found")

    grams = req.grams
    buy_price = req.buyPrice
    making = req.making
    gst = req.gst
    months = req.months

    # Streamlit formula:
    # tc = bp * gw * (1 + mkp / 100 + wsp / 100 + gst / 100)
    # wait, frontend formula has `making` and `gst` separate as:
    # allIn = p * (1 + m / 100) * (1 + t / 100)
    # totalCost = (allIn * g) / 10;
    # Let's align with the frontend calculations to prevent discrepancies!
    all_in_cost_10g = buy_price * (1 + making / 100) * (1 + gst / 100)
    total_cost = (all_in_cost_10g * grams) / 10
    break_even_price = all_in_cost_10g # per 10g
    break_even_price_per_g = break_even_price / 10.0

    current_spot_per_g = float(mg.iloc[-1])
    current_spot_10g = current_spot_per_g * 10.0

    # Break-even spot diff pct vs 24K spot or 22K spot
    # spot price is per gram, break_even is per 10g
    # breakEven vs spot % in frontend: (currentSpot - breakEven) / breakEven * 100
    # here breakEven is allIn (per 10g), currentSpot is 74820 (which is 10g rate).
    # So let's return percentage comparison based on 10g rates.
    break_even_spot_diff_pct = ((current_spot_10g - break_even_price) / break_even_price) * 100

    # Run SARIMA model prediction
    fct = sm.get_forecast(steps=months)
    pm = fct.predicted_mean.astype(float)
    
    # Try to extract confidence intervals from statsmodels
    try:
        conf_df = fct.conf_int()
        lower_series = conf_df.iloc[:, 0].astype(float)
        upper_series = conf_df.iloc[:, 1].astype(float)
    except:
        # Fallback buffers
        lower_series = pm - 150.0
        upper_series = pm + 180.0

    # Find break-even month (predicted price per gram * 10 >= break_even_price_per_g * 10)
    # or pm >= break_even_price_per_g
    be_month_dt = None
    for d, val in pm.items():
        if val >= break_even_price_per_g:
            be_month_dt = d
            break

    be_month_str = be_month_dt.strftime('%b %Y') if be_month_dt else "Beyond horizon"

    # Targets
    target5 = break_even_price * 1.05
    target10 = break_even_price * 1.1

    # Build forecastSeries for chart
    # Historical data (last 30 months)
    hist_series = mg.tail(30)
    forecast_series: List[ForecastChartItem] = []

    for idx, val in hist_series.items():
        # date in DD-MMM format for Recharts
        date_str = idx.strftime("%d %b")
        forecast_series.append(ForecastChartItem(
            date=date_str,
            actual=round(float(val) * 10, 2), # React charts use 10g prices
            forecast=None,
            upper=None,
            lower=None
        ))

    # Forecast data
    for idx, val in pm.items():
        date_str = idx.strftime("%d %b")
        forecast_series.append(ForecastChartItem(
            date=date_str,
            actual=None,
            forecast=round(val * 10, 2),
            upper=round(upper_series.loc[idx] * 10, 2),
            lower=round(lower_series.loc[idx] * 10, 2)
        ))

    # Build Detailed Table Items
    pl_table: List[PLTableItem] = []
    
    # CPI / Inflation Adjustment parameters (from Streamlit page defaults)
    inflation_rate = 5.0 # 5% annual
    cpi_adjustment = 5.0 # 5% CPI
    
    for i, (idx, val) in enumerate(pm.items()):
        # forecasted price per 10g
        fc_price_10g = val * 10.0
        total_value = fc_price_10g * grams / 10.0
        pl = total_value - total_cost
        
        # Inflation factor: monthly calculation
        months_elapsed = i + 1
        inf_factor = (1 + inflation_rate / 100.0) ** (months_elapsed / 12.0)
        inflation_adj_pl = pl / inf_factor
        
        # Status calculation matching streamlit:
        # if v<tc: return "Loss"
        # elif abs(v-tc)<=tc*0.02: return "Near Break-even"
        # return "Profit"
        if total_value < total_cost:
            status = "Loss"
        elif abs(total_value - total_cost) <= total_cost * 0.02:
            status = "Near Break-even"
        else:
            status = "Profit"

        pl_table.append(PLTableItem(
            date=idx.strftime("%b %Y"),
            forecast_price=round(fc_price_10g, 2),
            total_value=round(total_value, 2),
            profit_loss=round(pl, 2),
            inflation_adj_pl=round(inflation_adj_pl, 2),
            status=status
        ))

    return ForecastResponse(
        allInCost=round(all_in_cost_10g, 2),
        totalInvested=round(total_cost, 2),
        breakEvenSpotDiffPct=round(break_even_spot_diff_pct, 2),
        breakEvenPrice=round(break_even_price, 2),
        breakEvenMonth=be_month_str,
        target5=round(target5, 2),
        target10=round(target10, 2),
        forecastSeries=forecast_series,
        plTable=pl_table
    )
