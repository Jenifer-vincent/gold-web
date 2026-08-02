import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Filter,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FORECAST_SERIES,
  KPIS,
  LIVE_PRICE,
  MARKET_INSIGHTS,
  RECENT_INVESTMENTS,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SJK Gold Forecasting" },
      {
        name: "description",
        content:
          "Live gold prices, forecasts, and portfolio insights for Indian gold investors.",
      },
    ],
  }),
  component: DashboardPage,
});

const TOOLTIP_STYLE = {
  contentStyle: {
    background: "oklch(0.22 0.03 262)",
    border: "1px solid oklch(0.32 0.02 260 / 0.6)",
    borderRadius: 10,
    fontSize: 12,
    color: "#fff",
  },
  labelStyle: { color: "#9ca3af", fontSize: 11 },
  cursor: { stroke: "oklch(0.78 0.13 82 / 0.4)", strokeWidth: 1 },
};

function KpiCard({
  label,
  value,
  delta,
  trend,
  sub,
}: (typeof KPIS)[number]) {
  const up = trend === "up";
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="text-mono text-2xl font-semibold tracking-tight">{value}</div>
          <div
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
              up ? "bg-bull/10 text-bull" : "bg-bear/10 text-bear",
            )}
          >
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {delta}
          </div>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const [range, setRange] = useState("1M");
  const [liveData, setLiveData] = useState<any>(null);
  const [forecastSeriesData, setForecastSeriesData] = useState<any>(FORECAST_SERIES);
  const [insightsData, setInsightsData] = useState<any>(MARKET_INSIGHTS);
  const [volumeData, setVolumeData] = useState<any>([]);
  const [recentInvestmentsData, setRecentInvestmentsData] = useState<any>([]);
  const [loading, setLoading] = useState(true);

  // Shadow variables
  const LIVE_PRICE_SHADOW = liveData ? {
    price: liveData.price_24k,
    currency: "INR",
    unit: "10g / 24K",
    change: Math.round(liveData.price_24k * parseFloat(liveData.change_24k) / 100),
    changePct: parseFloat(liveData.change_24k),
    updatedAt: "Live • MCX",
    bid: liveData.bid,
    ask: liveData.ask,
    dayHigh: liveData.day_high,
    dayLow: liveData.day_low,
  } : LIVE_PRICE;

  const KPIS_SHADOW = liveData ? [
    { label: "24K Gold (10g)", value: `₹${liveData.price_24k.toLocaleString("en-IN")}`, delta: liveData.change_24k, trend: liveData.trend_24k, sub: "MCX Spot" },
    { label: "22K Gold (10g)", value: `₹${liveData.price_22k.toLocaleString("en-IN")}`, delta: liveData.change_22k, trend: liveData.trend_22k, sub: "Retail Avg." },
    { label: "USD/INR", value: liveData.usd_inr.toString(), delta: liveData.usd_inr_change, trend: "down" as const, sub: "Interbank" },
    { label: "Silver (1kg)", value: `₹${liveData.silver_1kg.toLocaleString("en-IN")}`, delta: liveData.silver_change, trend: "up" as const, sub: "MCX Spot" },
  ] : KPIS;

  useEffect(() => {
    const fetchData = async () => {
      const results = await Promise.allSettled([
        apiClient.get("/market/live-kpis"),
        apiClient.get("/market/insights"),
        apiClient.get("/market/volume"),
        apiClient.get("/portfolio/holdings"),
        apiClient.post("/forecast/calculate", {
          grams: 10,
          buyPrice: 70000,
          making: 10,
          gst: 3,
          months: 24,
        }),
      ]);

      // 1. Live KPIs
      if (results[0].status === "fulfilled" && results[0].value?.data) {
        setLiveData(results[0].value.data);
      } else if (results[0].status === "rejected") {
        console.error("Dashboard Live KPIs failed:", results[0].reason);
      }

      // 2. Insights
      if (results[1].status === "fulfilled" && Array.isArray(results[1].value?.data)) {
        setInsightsData(results[1].value.data);
      } else if (results[1].status === "rejected") {
        console.error("Dashboard Insights failed:", results[1].reason);
      }

      // 3. Volume
      if (results[2].status === "fulfilled" && Array.isArray(results[2].value?.data)) {
        setVolumeData(results[2].value.data);
      } else if (results[2].status === "rejected") {
        console.error("Dashboard Volume failed:", results[2].reason);
      }

      // 4. Holdings / Recent Investments
      if (results[3].status === "fulfilled" && results[3].value?.data?.holdings) {
        const formattedInvestments = results[3].value.data.holdings.map((h: any) => ({
          id: `TXN-${h.id}`,
          date: h.date_of_purchase,
          type: "Buy",
          grams: h.grams,
          price: h.avg_price,
          city: h.city || "Mumbai",
        })).slice(0, 5);
        if (formattedInvestments.length > 0) {
          setRecentInvestmentsData(formattedInvestments);
        }
      } else if (results[3].status === "rejected") {
        console.error("Dashboard Holdings failed:", results[3].reason);
      }

      // 5. Forecast Series
      if (results[4].status === "fulfilled" && Array.isArray(results[4].value?.data?.forecastSeries)) {
        setForecastSeriesData(results[4].value.data.forecastSeries.slice(0, 30));
      } else if (results[4].status === "rejected") {
        console.error("Dashboard Forecast failed:", results[4].reason);
      }

      setLoading(false);
    };

    fetchData();
  }, []);


  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Gold Market Dashboard"
        description="Live pricing, forecasts, and macro drivers for Indian gold investors."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" /> Filters
            </Button>
            <Button size="sm" className="gap-2 bg-gold text-gold-foreground hover:bg-gold/90">
              <Download className="h-4 w-4" /> Export
            </Button>
          </>
        }
      />

      {/* Live price + KPIs */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_2fr]">
        <Card className="overflow-hidden border-gold/30 bg-linear-to-br from-card via-card to-gold/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Live Spot • {LIVE_PRICE_SHADOW.unit}
              </div>
              <Badge className="border-bull/30 bg-bull/10 text-bull" variant="outline">
                <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-bull" />
                {LIVE_PRICE_SHADOW.updatedAt}
              </Badge>
            </div>
            <div className="mt-4 flex items-end gap-3">
              <div className="text-mono text-4xl font-bold tracking-tight sm:text-5xl">
                ₹{LIVE_PRICE_SHADOW.price.toLocaleString("en-IN")}
              </div>
              <div className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-bull">
                <ArrowUpRight className="h-4 w-4" />
                {LIVE_PRICE_SHADOW.change >= 0 ? "+" : ""}₹{LIVE_PRICE_SHADOW.change} ({LIVE_PRICE_SHADOW.changePct}%)
              </div>
            </div>
            <div className="mt-5 grid grid-cols-4 gap-3 border-t border-border pt-4 text-mono">
              {[
                { k: "Bid", v: LIVE_PRICE_SHADOW.bid },
                { k: "Ask", v: LIVE_PRICE_SHADOW.ask },
                { k: "High", v: LIVE_PRICE_SHADOW.dayHigh },
                { k: "Low", v: LIVE_PRICE_SHADOW.dayLow },
              ].map((s) => (
                <div key={s.k}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.k}
                  </div>
                  <div className="mt-1 text-sm font-semibold">
                    ₹{s.v.toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {KPIS_SHADOW.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      </div>

      {/* Forecast chart */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-gold" strokeWidth={1.75} />
              30-Day Price Forecast
            </CardTitle>
            <CardDescription>
              Actual MCX spot vs SJK model forecast with 95% confidence band.
            </CardDescription>
          </div>
          <Tabs value={range} onValueChange={setRange}>
            <TabsList>
              {["1W", "1M", "3M", "1Y"].map((r) => (
                <TabsTrigger key={r} value={r}>
                  {r}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pl-0">
          <div className="h-[340px] w-full">
            <ResponsiveContainer>
              <AreaChart data={forecastSeriesData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="actual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.13 82)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.78 0.13 82)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.15 200)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="oklch(0.7 0.15 200)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.32 0.02 260 / 0.4)" strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="date" stroke="#6b7280" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  stroke="#6b7280"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  domain={["dataMin - 2000", "dataMax + 2000"]}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v) => (typeof v === "number" ? `₹${v.toLocaleString("en-IN")}` : "—")} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} iconType="circle" />
                <Area type="monotone" dataKey="upper" stroke="none" fill="url(#band)" name="Confidence" />
                <Area type="monotone" dataKey="lower" stroke="none" fill="oklch(0.18 0.03 260)" />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="oklch(0.78 0.13 82)"
                  strokeWidth={2.2}
                  fill="url(#actual)"
                  name="Actual"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke="oklch(0.7 0.15 200)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  name="Forecast"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Insights + Volume */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-gold" strokeWidth={1.75} />
              Market Intelligence
            </CardTitle>
            <CardDescription>Latest signals impacting Indian gold prices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {insightsData.map((i: any) => (
              <div
                key={i.title}
                className="group flex cursor-pointer items-start gap-4 rounded-xl border border-border bg-background/40 p-4 transition-colors hover:border-gold/40 hover:bg-accent/30"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold">
                  <TrendingUp className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {i.tag}
                    </span>
                    <span className="text-[10px] text-muted-foreground">• {i.time}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "ml-auto text-[10px]",
                        i.impact === "Bullish"
                          ? "border-bull/30 bg-bull/10 text-bull"
                          : i.impact === "Bearish"
                            ? "border-bear/30 bg-bear/10 text-bear"
                            : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {i.impact}
                    </Badge>
                  </div>
                  <h4 className="mt-1 truncate text-sm font-semibold group-hover:text-gold">
                    {i.title}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.summary}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">MCX Volume (7D)</CardTitle>
            <CardDescription>Daily traded volume in kilograms.</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[280px]">
              <ResponsiveContainer>
                <BarChart
                  data={volumeData.length ? volumeData : Array.from({ length: 7 }).map((_, i) => ({
                    d: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
                    v: Math.round(1200 + Math.random() * 800),
                  }))}
                  margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid stroke="oklch(0.32 0.02 260 / 0.4)" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="d" stroke="#6b7280" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis stroke="#6b7280" tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="v" fill="oklch(0.78 0.13 82)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent investments */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Recent Investments</CardTitle>
            <CardDescription>Last 5 transactions across your accounts.</CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            View all
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Txn ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Grams</TableHead>
                  <TableHead className="text-right">Price / 10g</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvestmentsData.map((t: any) => (
                  <TableRow key={t.id} className="border-border">
                    <TableCell className="text-mono text-xs text-muted-foreground">
                      {t.id}
                    </TableCell>
                    <TableCell>{t.date}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          t.type === "Buy"
                            ? "border-bull/30 bg-bull/10 text-bull"
                            : "border-bear/30 bg-bear/10 text-bear",
                        )}
                      >
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-mono text-right">{t.grams}g</TableCell>
                    <TableCell className="text-mono text-right">
                      ₹{t.price.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.city}</TableCell>
                    <TableCell className="text-mono text-right font-semibold">
                      ₹{((t.price * t.grams) / 10).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
