import { createFileRoute } from "@tanstack/react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ECONOMIC_INDICATORS } from "@/lib/mock-data";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/economic")({
  head: () => ({
    meta: [
      { title: "Economic Analysis — SJK Gold" },
      { name: "description", content: "Key macroeconomic indicators influencing gold prices in India." },
    ],
  }),
  component: EconomicPage,
});

const CPI = Array.from({ length: 12 }).map((_, i) => ({
  m: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"][i],
  cpi: 5.2 - i * 0.05 + Math.sin(i / 2) * 0.3,
  gold: 62000 + i * 1050 + Math.cos(i / 2) * 500,
}));

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

function EconomicPage() {
  const [indicators, setIndicators] = useState<any[]>(ECONOMIC_INDICATORS);
  const [simRate, setSimRate] = useState([5]);
  const [simResults, setSimResults] = useState<any>({
    projectedPrice: 74820,
    pctChange: 0,
    chartData: []
  });

  useEffect(() => {
    apiClient.get("/economic/indicators")
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setIndicators(res.data);
        }
      })
      .catch(err => console.error("Failed to load economic indicators:", err?.message || err));
  }, []);

  useEffect(() => {
    apiClient.post("/market/simulate-interest-rate", { rate: simRate[0] })
      .then(res => {
        if (res.data && typeof res.data.projectedPrice === "number") {
          setSimResults(res.data);
        }
      })
      .catch(err => console.error("Simulation failed:", err?.message || err));
  }, [simRate]);


  return (
    <>
      <PageHeader
        eyebrow="Macro"
        title="Economic Analysis"
        description="Key macro indicators — inflation, rates, currency, and commodities — that drive gold."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {indicators.map((i) => {
          const chg = parseFloat(i.change);
          return (
            <Card key={i.name}>
              <CardContent className="p-5">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{i.name}</div>
                <div className="mt-2 flex items-end justify-between">
                  <div className="text-mono text-2xl font-semibold">{i.value}</div>
                  <div
                    className={`text-mono text-xs font-semibold ${
                      chg > 0 ? "text-bull" : chg < 0 ? "text-bear" : "text-muted-foreground"
                    }`}
                  >
                    {chg > 0 ? "+" : ""}
                    {i.change}
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{i.period}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">India CPI vs Gold Price (12M)</CardTitle>
            <CardDescription>Inverse USD strength and rising CPI historically support gold.</CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px]">
              <ResponsiveContainer>
                <LineChart data={CPI} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="oklch(0.32 0.02 260 / 0.4)" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="m" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="l" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                  <YAxis yAxisId="r" orientation="right" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line yAxisId="l" type="monotone" dataKey="cpi" name="CPI %" stroke="oklch(0.7 0.15 200)" strokeWidth={2} dot={false} />
                  <Line yAxisId="r" type="monotone" dataKey="gold" name="Gold ₹/10g" stroke="oklch(0.78 0.13 82)" strokeWidth={2.2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interest Rate Sensitivity Simulator</CardTitle>
            <CardDescription>Drag the RBI Repo rate to simulate gold price changes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-secondary/30 p-4 border border-border">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-muted-foreground">Repo Rate:</span>
                <span className="text-foreground font-mono text-lg font-bold">{simRate[0]}%</span>
              </div>
              <Slider min={1} max={10} step={0.25} value={simRate} onValueChange={setSimRate} className="mt-3" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-card border border-border text-center">
                <span className="text-xs uppercase text-muted-foreground block">Projected Gold Price</span>
                <span className="text-xl font-bold text-navy mt-1 block">₹{Math.round(simResults.projectedPrice).toLocaleString("en-IN")}</span>
              </div>
              <div className="p-4 rounded-lg bg-card border border-border text-center">
                <span className="text-xs uppercase text-muted-foreground block">Price Impact</span>
                <span className={`text-xl font-bold mt-1 block ${simResults.pctChange >= 0 ? "text-bull" : "text-bear"}`}>
                  {simResults.pctChange >= 0 ? "+" : ""}{simResults.pctChange.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="h-[180px] w-full mt-4">
              <ResponsiveContainer>
                <LineChart data={simResults.chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="oklch(0.32 0.02 260 / 0.4)" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="rate" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line type="monotone" dataKey="price" name="Gold Price (10g)" stroke="oklch(0.78 0.13 82)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
