// Realistic placeholder data for SJK Gold Forecasting.

export const LIVE_PRICE = {
  price: 74820,
  currency: "INR",
  unit: "10g / 24K",
  change: 285,
  changePct: 0.38,
  updatedAt: "Live • 12:42 IST",
  bid: 74810,
  ask: 74830,
  dayHigh: 74965,
  dayLow: 74510,
};

export const KPIS = [
  { label: "24K Gold (10g)", value: "₹74,820", delta: "+0.38%", trend: "up" as const, sub: "MCX Spot" },
  { label: "22K Gold (10g)", value: "₹68,590", delta: "+0.32%", trend: "up" as const, sub: "Retail Avg." },
  { label: "USD/INR", value: "83.42", delta: "-0.12%", trend: "down" as const, sub: "Interbank" },
  { label: "Silver (1kg)", value: "₹92,150", delta: "+1.24%", trend: "up" as const, sub: "MCX Spot" },
];

export const FORECAST_SERIES = Array.from({ length: 30 }).map((_, i) => {
  const base = 72000 + i * 120;
  const noise = Math.sin(i / 3) * 400 + Math.cos(i / 5) * 260;
  const actual = i <= 18 ? Math.round(base + noise) : null;
  const forecast = i >= 15 ? Math.round(base + noise + i * 30) : null;
  const upper = forecast ? forecast + 850 : null;
  const lower = forecast ? forecast - 780 : null;
  const day = new Date();
  day.setDate(day.getDate() - (29 - i));
  return {
    date: day.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    actual,
    forecast,
    upper,
    lower,
  };
});

export const MARKET_INSIGHTS = [
  {
    title: "Fed signals possible rate hold in July",
    tag: "Macro",
    time: "8m ago",
    impact: "Bullish",
    summary: "Dovish tone from FOMC minutes supports gold above $2,380/oz.",
  },
  {
    title: "RBI adds 8.3 tonnes to reserves in June",
    tag: "Central Bank",
    time: "45m ago",
    impact: "Bullish",
    summary: "Continued diversification away from USD assets tightens supply.",
  },
  {
    title: "Rupee weakens 12 paise against dollar",
    tag: "Currency",
    time: "1h ago",
    impact: "Bullish",
    summary: "INR softness lifts landed gold prices by ~₹95 per 10g.",
  },
  {
    title: "MCX August futures OI up 4.2%",
    tag: "Derivatives",
    time: "2h ago",
    impact: "Neutral",
    summary: "Rising open interest with flat price suggests position building.",
  },
];

export const RECENT_INVESTMENTS = [
  { id: "TXN-10428", date: "12 Jul 2026", type: "Buy", grams: 20, price: 74210, city: "Mumbai" },
  { id: "TXN-10391", date: "28 Jun 2026", type: "Buy", grams: 10, price: 73540, city: "Chennai" },
  { id: "TXN-10322", date: "05 Jun 2026", type: "Sell", grams: 5, price: 72110, city: "Delhi" },
  { id: "TXN-10287", date: "18 May 2026", type: "Buy", grams: 15, price: 71360, city: "Bengaluru" },
  { id: "TXN-10241", date: "02 May 2026", type: "Buy", grams: 25, price: 70920, city: "Hyderabad" },
];

export const PORTFOLIO_HOLDINGS = [
  { asset: "24K Physical Gold", grams: 55, avg: 71980, current: 74820, alloc: 62 },
  { asset: "Sovereign Gold Bond '31", grams: 20, avg: 68520, current: 74820, alloc: 22 },
  { asset: "Gold ETF (GOLDBEES)", grams: 12, avg: 72440, current: 74820, alloc: 12 },
  { asset: "Digital Gold", grams: 4, avg: 73100, current: 74820, alloc: 4 },
];

export const REGIONAL_PRICES = [
  { city: "Mumbai", price24: 74820, price22: 68590, premium: 0 },
  { city: "Delhi", price24: 74970, price22: 68720, premium: 150 },
  { city: "Chennai", price24: 75210, price22: 68950, premium: 390 },
  { city: "Bengaluru", price24: 74880, price22: 68640, premium: 60 },
  { city: "Hyderabad", price24: 74850, price22: 68610, premium: 30 },
  { city: "Kolkata", price24: 74790, price22: 68560, premium: -30 },
  { city: "Ahmedabad", price24: 74710, price22: 68490, premium: -110 },
  { city: "Pune", price24: 74830, price22: 68600, premium: 10 },
];

export const ECONOMIC_INDICATORS = [
  { name: "India CPI Inflation", value: "4.87%", change: "+0.12", period: "Jun 2026" },
  { name: "US 10Y Treasury", value: "4.21%", change: "-0.04", period: "Live" },
  { name: "DXY Dollar Index", value: "104.28", change: "-0.18", period: "Live" },
  { name: "Brent Crude", value: "$82.14", change: "+1.03", period: "Live" },
  { name: "RBI Repo Rate", value: "6.50%", change: "0.00", period: "Jun MPC" },
  { name: "India Gold Import Duty", value: "6.00%", change: "0.00", period: "FY26" },
];

export const AI_CHAT_SEED = [
  {
    role: "assistant" as const,
    text: "Hi, I'm your SJK gold strategy assistant. Ask me about break-even prices, allocation, or macro drivers.",
  },
  {
    role: "user" as const,
    text: "What's my break-even if I bought 20g at ₹74,210?",
  },
  {
    role: "assistant" as const,
    text: "With 3% making + 3% GST, your all-in cost is roughly ₹78,681 per 10g. You'll break even when 24K MCX spot crosses ₹78,700.",
  },
];
