import random
from typing import Dict, Any, List, Optional
from app.services import forecast_service, currency_api

# Predefined QA dictionary from Streamlit app
QA_DATABASE = {
    "trends": [
        ("What is the current trend in gold prices?",
         "The last tracked price is approximately ₹6,800/gram (22K). Gold generally trends upward long-term due to inflation and global uncertainty."),
        ("Why do gold prices fluctuate?",
         "Gold is driven by global demand, USD strength, central bank reserves, and geopolitical stability. In India, import duties and festivals also matter."),
        ("Is now a good time to buy?",
         "For 3–5 year investors, gold remains a reliable hedge. Align purchases with your goals and risk tolerance."),
    ],
    "resale": [
        ("When should I sell my gold?",
         "Sell when the market price exceeds your break-even — purchase price + making charges + wastage + GST adjusted for inflation."),
        ("How is profit defined in gold resale?",
         "Profit = (Current Price × Weight) − Total Purchase Cost. Making charges are NOT recoverable at resale."),
        ("What are making charges?",
         "Craftsmanship fees (8–20%) not refunded at resale. You only recover the raw gold value."),
    ],
    "breakeven": [
        ("What is the break-even point?",
         "When current gold value equals total expenditure including base price, GST, and making charges."),
        ("How long to break even?",
         "With 10–20% making charges, gold must appreciate ~15–25% — typically 3 to 5 years."),
        ("Can I predict my break-even date?",
         "Yes! Use the Forecaster page. SJK model will estimate the break-even month based on historical trends."),
    ],
    "economic": [
        ("How does inflation impact gold?",
         "Gold is a classic inflation hedge — as cost of living rises, gold typically appreciates."),
        ("Effect of interest rates?",
         "Higher rates strengthen currency and reduce gold demand. Lower rates boost gold."),
        ("Do government policies matter?",
         "Yes — import duty, SGB, and GST changes directly impact domestic gold prices."),
    ],
    "festivals": [
        ("Which festivals see highest demand?",
         "Diwali (Dhanteras), Akshaya Tritiya, and Wedding Season (Nov–Feb) see the biggest spikes."),
        ("Should I buy during festivals?",
         "Prices are usually higher during festivals. July–September often offers better rates."),
        ("Is selling during festivals a good idea?",
         "Yes — jewellers offer better exchange rates and buyback schemes during peak demand."),
    ],
    "model": [
        ("How does this app forecast prices?",
         "SARIMA (Seasonal AutoRegressive Integrated Moving Average) trained on historical monthly 22K data."),
        ("Is the forecast 100% accurate?",
         "No — SARIMA is a statistical guide. Supplement with current market research."),
        ("What data powers the prediction?",
         "Historical monthly average 22K gold prices from verified Indian market records."),
    ]
}

MARKET_INSIGHTS = [
    {
        "title": "Fed signals possible rate hold in July",
        "tag": "Macro",
        "time": "8m ago",
        "impact": "Bullish",
        "summary": "Dovish tone from FOMC minutes supports gold above $2,380/oz."
    },
    {
        "title": "RBI adds 8.3 tonnes to reserves in June",
        "tag": "Central Bank",
        "time": "45m ago",
        "impact": "Bullish",
        "summary": "Continued diversification away from USD assets tightens supply."
    },
    {
        "title": "Rupee weakens 12 paise against dollar",
        "tag": "Currency",
        "time": "1h ago",
        "impact": "Bullish",
        "summary": "INR softness lifts landed gold prices by ~₹95 per 10g."
    },
    {
        "title": "MCX August futures OI up 4.2%",
        "tag": "Derivatives",
        "time": "2h ago",
        "impact": "Neutral",
        "summary": "Rising open interest with flat price suggests position building."
    },
    {
        "title": "China PBoC pauses gold buying for third month",
        "tag": "Central Bank",
        "time": "3h ago",
        "impact": "Bearish",
        "summary": "Softer demand from largest buyer weighs on sentiment."
    },
    {
        "title": "India gold ETF inflows hit 12-month high",
        "tag": "Flows",
        "time": "5h ago",
        "impact": "Bullish",
        "summary": "₹726 Cr net inflows into gold ETFs during June."
    }
]

def get_market_insights() -> List[Dict[str, str]]:
    return MARKET_INSIGHTS

def get_economic_indicators(latest_spot_g: float) -> List[Dict[str, str]]:
    return [
        {"name": "India CPI Inflation", "value": "4.87%", "change": "+0.12", "period": "Jun 2026"},
        {"name": "US 10Y Treasury", "value": "4.21%", "change": "-0.04", "period": "Live"},
        {"name": "DXY Dollar Index", "value": "104.28", "change": "-0.18", "period": "Live"},
        {"name": "Brent Crude", "value": "$82.14", "change": "+1.03", "period": "Live"},
        {"name": "RBI Repo Rate", "value": "6.50%", "change": "0.00", "period": "Jun MPC"},
        {"name": "India Gold Import Duty", "value": "6.00%", "change": "0.00", "period": "FY26"}
    ]

def get_regional_prices(latest_spot_g: float) -> List[Dict[str, Any]]:
    # spot is 22K rate per gram
    spot_22k_10g = latest_spot_g * 10
    spot_24k_10g = spot_22k_10g / 0.916 # convert 22K (91.6%) to 24K
    
    cities = [
        {"city": "Mumbai", "premium": 0},
        {"city": "Delhi", "premium": 150},
        {"city": "Chennai", "premium": 390},
        {"city": "Bengaluru", "premium": 60},
        {"city": "Hyderabad", "premium": 30},
        {"city": "Kolkata", "premium": -30},
        {"city": "Ahmedabad", "premium": -110},
        {"city": "Pune", "premium": 10}
    ]
    
    return [
        {
            "city": c["city"],
            "price24": round(spot_24k_10g + c["premium"], 0),
            "price22": round(spot_22k_10g + c["premium"], 0),
            "premium": c["premium"]
        }
        for c in cities
    ]

def get_global_prices(latest_spot_g: float) -> List[Dict[str, Any]]:
    # spot 22K price per gram
    # returns country prices converted to local and INR equivalents
    gd = {
        "UAE": {"p": 510, "c": "AED", "i": 12595},
        "Saudi Arabia": {"p": 520, "c": "SAR", "i": 12578},
        "Qatar": {"p": 507, "c": "QAR", "i": 12618},
        "Kuwait": {"p": 41.66, "c": "KWD", "i": 12358},
        "Singapore": {"p": 184.7, "c": "SGD", "i": 12997},
        "Malaysia": {"p": 585, "c": "MYR", "i": 13078},
        "USA": {"p": 142.5, "c": "USD", "i": 12926},
        "UK": {"p": 101.61, "c": "GBP", "i": 12335},
        "Canada": {"p": 198.5, "c": "CAD", "i": 12939},
        "Australia": {"p": 213.8, "c": "AUD", "i": 12961},
        "Nepal": {"p": 21115, "c": "NPR", "i": 13186}
    }
    
    # Scale dynamic equivalent price based on spot rate
    spot_scale = latest_spot_g / 6859.0 # reference spot
    res = []
    for c, d in gd.items():
        scaled_inr = round(d["i"] * spot_scale, 0)
        # convert INR back to local currency
        local_p = currency_api.convert_currency_with_fallback(scaled_inr, "INR", d["c"])
        res.append({
            "country": c,
            "localPrice": f"{round(local_p, 2)} {d['c']}",
            "inrEquiv": scaled_inr
        })
    return res

def simulate_interest_rate(rate: float, latest_spot_g: float) -> Dict[str, Any]:
    # Simulation formula from Streamlit:
    # sim = cur * (1 - (ir - 5.0) * 0.05)
    # Price is 22K per gram
    sim = latest_spot_g * (1 - (rate - 5.0) * 0.05)
    pct_change = ((sim - latest_spot_g) / latest_spot_g) * 100
    
    # Generate points for chart (rates 1% to 10%)
    rates = [float(r) for r in range(1, 11)]
    prices = [round(latest_spot_g * 10 * (1 - (r - 5.0) * 0.05), 2) for r in rates] # 10g price for React chart
    
    return {
        "projectedPrice": round(sim * 10, 2), # 10g
        "pctChange": round(pct_change, 2),
        "chartData": [{"rate": r, "price": p} for r, p in zip(rates, prices)]
    }

def get_chatbot_answer(query: str) -> str:
    q_lower = query.lower()
    
    # Keyword search to match QA
    for cat, qas in QA_DATABASE.items():
        for q, a in qas:
            # Check if any significant word of the question is in the user query
            words = q.lower().replace("?", "").replace("the", "").replace("what", "").split()
            match_count = sum(1 for w in words if len(w) > 3 and w in q_lower)
            if match_count >= 2 or (len(words) == 1 and words[0] in q_lower):
                return a
                
    # Direct keyword fallbacks
    if "sgb" in q_lower or "sovereign" in q_lower:
        return "Sovereign Gold Bonds (SGB) offer 2.5% annual interest plus gold price appreciation, tax-free at maturity (8 years). They are one of the most cost-effective ways to hold digital gold."
    elif "sip" in q_lower or "investment" in q_lower or "accumulate" in q_lower:
        return "A gold SIP (Systematic Investment Plan) via Gold ETFs or Digital Gold helps you average out purchase costs and reduces timing risk in volatile markets. Recommended allocation is 10-15% of your portfolio."
    elif "22k" in q_lower or "24k" in q_lower:
        return "24K gold is 99.9% pure, ideal for investment coins/bars. 22K gold is 91.6% pure, mixed with alloy metals to make it durable enough for jewellery. Resale value only considers pure gold content."
        
    return "Based on SJK Gold analytics: Gold is showing strong support at current MCX levels. For specific break-even planning, use the Break-even Forecaster page or review our detailed news signals feed."
