import requests
from typing import Dict, Any, Optional

def convert_currency(amount: float, from_curr: str, to_curr: str) -> Optional[float]:
    if from_curr == to_curr:
        return amount
    try:
        url = f"https://api.frankfurter.app/latest?amount={amount}&from={from_curr}&to={to_curr}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if "rates" in data and to_curr in data["rates"]:
                return float(data["rates"][to_curr])
        return None
    except Exception as e:
        print(f"Currency API error: {e}")
        return None

# Fallback conversion rates if Frankfurter is down
FALLBACK_RATES: Dict[str, float] = {
    "USD": 0.012,  # 1 INR = 0.012 USD
    "EUR": 0.011,
    "GBP": 0.0096,
    "JPY": 1.90,
    "AED": 0.044,
    "SAR": 0.045,
    "QAR": 0.044,
    "KWD": 0.0037,
    "SGD": 0.016,
    "MYR": 0.057,
    "CAD": 0.0165,
    "AUD": 0.018,
    "NPR": 1.60,
    "INR": 1.0
}

def convert_currency_with_fallback(amount: float, from_curr: str, to_curr: str) -> float:
    res = convert_currency(amount, from_curr, to_curr)
    if res is not None:
        return res
        
    # Convert through INR as a bridge if API is offline
    if from_curr != "INR":
        # from_curr to INR
        rate_from = FALLBACK_RATES.get(from_curr, 1.0)
        inr_amt = amount / rate_from
    else:
        inr_amt = amount
        
    rate_to = FALLBACK_RATES.get(to_curr, 1.0)
    return inr_amt * rate_to
