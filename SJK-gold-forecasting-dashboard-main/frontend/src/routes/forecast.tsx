import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Loader2, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FORECAST_SERIES } from "@/lib/mock-data";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/forecast")({
  head: () => ({
    meta: [
      { title: "Break-even Forecast — SJK Gold" },
      { name: "description", content: "Model your gold break-even price with realistic charges and forecast projections." },
    ],
  }),
  component: ForecastPage,
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
};

function ForecastPage() {
  const [grams, setGrams] = useState("20");
  const [buyPrice, setBuyPrice] = useState("74210");
  const [making, setMaking] = useState("3");
  const [gst, setGst] = useState("3");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [currentSpot, setCurrentSpot] = useState(74820);

  // Dynamic values returned from API
  const [results, setResults] = useState<any>({
    allInCost: 78720,
    totalInvested: 157440,
    breakEvenSpotDiffPct: -4.95,
    breakEvenPrice: 78720,
    breakEvenMonth: "Beyond horizon",
    target5: 82656,
    target10: 86592,
    forecastSeries: FORECAST_SERIES,
    plTable: []
  });

  const [calcError, setCalcError] = useState("");

  const runCalculation = async (g: string, p: string, m: string, t: string) => {
    setLoading(true);
    setCalcError("");
    try {
      const res = await apiClient.post("/forecast/calculate", {
        grams: Number(g),
        buyPrice: Number(p),
        making: Number(m),
        gst: Number(t),
        months: 24
      });
      if (res.data && res.data.allInCost) {
        setResults(res.data);
      } else {
        setCalcError("Invalid calculation response from backend.");
      }
    } catch (err: any) {
      console.error("Forecast calculation failed:", err?.message || err);
      setCalcError("Calculation failed. Showing cached forecast projections.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient.get("/market/live-kpis")
      .then(res => {
        if (res.data && typeof res.data.price_24k === "number") {
          setCurrentSpot(res.data.price_24k);
        }
      })
      .catch(err => console.error("Failed to load spot price in forecast page:", err?.message || err));

    runCalculation(grams, buyPrice, making, gst);
  }, []);


  const g = Number(grams) || 0;
  const p = Number(buyPrice) || 0;
  const m = Number(making) || 0;
  const t = Number(gst) || 0;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!g || g <= 0) e.grams = "Enter grams greater than 0";
    if (!p || p <= 0) e.price = "Enter a valid buy price";
    if (m < 0 || m > 30) e.making = "Making charges must be 0–30%";
    if (t < 0 || t > 30) e.gst = "GST must be 0–30%";
    return e;
  };

  const onCalculate = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    runCalculation(grams, buyPrice, making, gst);
  };

  return (
    <>
      <PageHeader
        eyebrow="Planning"
        title="Break-even Forecast"
        description="Model true cost of ownership including making, GST, and projected forecast targets."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Inputs</CardTitle>
            <CardDescription>Enter your purchase details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Quantity (grams)" error={errors.grams}>
              <Input
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 20"
              />
            </Field>
            <Field label="Buy price (₹ / 10g)" error={errors.price}>
              <Input
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 74210"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Making %" error={errors.making}>
                <Input value={making} onChange={(e) => setMaking(e.target.value)} inputMode="decimal" />
              </Field>
              <Field label="GST %" error={errors.gst}>
                <Input value={gst} onChange={(e) => setGst(e.target.value)} inputMode="decimal" />
              </Field>
            </div>
            <Button
              onClick={onCalculate}
              disabled={loading}
              className="w-full bg-gold text-gold-foreground hover:bg-gold/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calculating…
                </>
              ) : (
                "Recalculate Forecast"
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="All-in cost (10g)" value={`₹${results.allInCost.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} accent />
            <Stat label="Total invested" value={`₹${results.totalInvested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
            <Stat
              label="Break-even vs spot"
              value={`${results.breakEvenSpotDiffPct.toFixed(2)}%`}
              trend={currentSpot >= results.breakEvenPrice ? "up" : "down"}
            />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-gold" strokeWidth={1.75} />
                  Forecast vs Break-even
                </CardTitle>
                <CardDescription>Projected price path with your break-even reference line. Target Month: <b className="text-gold font-semibold">{results.breakEvenMonth}</b></CardDescription>
              </div>
              <Badge variant="outline" className="border-gold/30 bg-gold/10 text-gold">
                95% CI
              </Badge>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[360px]">
                <ResponsiveContainer>
                  <AreaChart data={results.forecastSeries} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.78 0.13 82)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="oklch(0.78 0.13 82)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="oklch(0.32 0.02 260 / 0.4)" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={["dataMin - 1500", "dataMax + 1500"]}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: 11, color: "#9ca3af" }} iconType="circle" />
                    <Area type="monotone" dataKey="upper" stroke="none" fill="oklch(0.7 0.15 200 / 0.2)" name="Confidence Upper" />
                    <Area type="monotone" dataKey="lower" stroke="none" fill="oklch(0.18 0.03 260)" name="Confidence Lower" />
                    <Area type="monotone" dataKey="actual" stroke="oklch(0.78 0.13 82)" strokeWidth={2} fill="url(#fc)" name="Actual" dot={false} />
                    <Line type="monotone" dataKey="forecast" stroke="oklch(0.7 0.15 200)" strokeWidth={2} strokeDasharray="5 4" name="Forecast" dot={false} />
                    <ReferenceLine y={results.breakEvenPrice} stroke="oklch(0.65 0.22 25)" strokeDasharray="4 4" label={{ value: "Break-even", fill: "#f87171", fontSize: 11, position: "insideTopRight" }} />
                    <ReferenceLine y={results.target5} stroke="oklch(0.72 0.17 155)" strokeDasharray="4 4" label={{ value: "+5% target", fill: "#4ade80", fontSize: 11, position: "insideTopRight" }} />
                    <ReferenceLine y={results.target10} stroke="oklch(0.72 0.17 155)" strokeDasharray="4 4" label={{ value: "+10% target", fill: "#4ade80", fontSize: 11, position: "insideTopRight" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {results.plTable && results.plTable.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Detailed Month-by-Month Forecast Table</CardTitle>
            <CardDescription>Break-even tracking, profit/loss projections, and inflation adjustments.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Forecasted Price (₹/10g)</TableHead>
                    <TableHead className="text-right">Total Value (₹)</TableHead>
                    <TableHead className="text-right">Profit / Loss (₹)</TableHead>
                    <TableHead className="text-right">Inflation Adj. P/L (₹)</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.plTable.map((row: any) => (
                    <TableRow key={row.date} className="border-border">
                      <TableCell className="font-medium">{row.date}</TableCell>
                      <TableCell className="text-mono text-right">₹{row.forecast_price.toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-mono text-right">₹{row.total_value.toLocaleString("en-IN")}</TableCell>
                      <TableCell className={cn(
                        "text-mono text-right font-semibold",
                        row.profit_loss >= 0 ? "text-bull" : "text-bear"
                      )}>
                        {row.profit_loss >= 0 ? "+" : ""}₹{row.profit_loss.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className={cn(
                        "text-mono text-right",
                        row.inflation_adj_pl >= 0 ? "text-bull" : "text-bear"
                      )}>
                        {row.inflation_adj_pl >= 0 ? "+" : ""}₹{row.inflation_adj_pl.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            row.status === "Profit"
                              ? "border-bull/30 bg-bull/10 text-bull"
                              : row.status === "Loss"
                                ? "border-bear/30 bg-bear/10 text-bear"
                                : "border-gold/30 bg-gold/10 text-gold",
                          )}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="mt-1 text-[11px] text-bear">{error}</p>}
    </div>
  );
}

function Stat({ label, value, accent, trend }: { label: string; value: string; accent?: boolean; trend?: "up" | "down" }) {
  return (
    <Card className={accent ? "border-gold/30 bg-gold/5" : ""}>
      <CardContent className="p-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-2 text-mono text-xl font-semibold ${trend === "up" ? "text-bull" : trend === "down" ? "text-bear" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
