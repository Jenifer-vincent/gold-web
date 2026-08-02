import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Target, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/strategy")({
  head: () => ({
    meta: [
      { title: "Strategy Planner — SJK Gold" },
      { name: "description", content: "Plan your gold allocation with SIP, lump-sum, and horizon-based strategies." },
    ],
  }),
  component: StrategyPage,
});

function StrategyPage() {
  const [monthly, setMonthly] = useState("15000");
  const [horizon, setHorizon] = useState([7]);
  const [risk, setRisk] = useState("balanced");
  const [goal, setGoal] = useState("wealth");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [strategyResult, setStrategyResult] = useState<any>({
    projectedCorpus: 1512000,
    assumedCagr: "8.0%",
    volatilityBand: "±12%",
    allocations: [
      { name: "Sovereign Gold Bonds (SGB)", pct: 45, color: "oklch(0.78 0.13 82)" },
      { name: "Gold ETFs", pct: 30, color: "oklch(0.7 0.15 200)" },
      { name: "Physical / Coins", pct: 15, color: "oklch(0.72 0.17 155)" },
      { name: "Digital Gold", pct: 10, color: "oklch(0.65 0.18 300)" },
    ]
  });

  const runSimulation = async (mVal: string, hVal: number, rVal: string, gVal: string) => {
    setLoading(true);
    try {
      const res = await apiClient.post("/market/strategy", {
        monthly: Number(mVal),
        horizon: hVal,
        risk: rVal,
        goal: gVal
      });
      if (res.data && typeof res.data.projectedCorpus === "number") {
        setStrategyResult(res.data);
      }
    } catch (err: any) {
      console.error("Strategy calculation failed:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    runSimulation(monthly, horizon[0], risk, goal);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const m = Number(monthly);
    if (!m || m < 500) errs.monthly = "Minimum SIP is ₹500";
    if (m > 500000) errs.monthly = "For SIP over ₹5,00,000 contact advisory";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    runSimulation(monthly, horizon[0], risk, goal);
  };

  return (
    <>
      <PageHeader
        eyebrow="Planner"
        title="Strategy Planner"
        description="Design a rules-based gold accumulation strategy aligned to your risk and horizon."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <form onSubmit={submit}>
            <CardHeader>
              <CardTitle className="text-base">Plan Parameters</CardTitle>
              <CardDescription>Adjust inputs to preview allocation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Monthly investment (₹)
                </Label>
                <Input
                  value={monthly}
                  onChange={(e) => setMonthly(e.target.value)}
                  inputMode="numeric"
                  placeholder="e.g. 15000"
                />
                {errors.monthly && <p className="mt-1 text-[11px] text-bear">{errors.monthly}</p>}
              </div>

              <div>
                <Label className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
                  Investment horizon <span className="text-mono text-foreground">{horizon[0]} yrs</span>
                </Label>
                <Slider min={1} max={20} step={1} value={horizon} onValueChange={setHorizon} />
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Risk profile</Label>
                <Select value={risk} onValueChange={setRisk}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Primary goal</Label>
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wealth">Wealth creation</SelectItem>
                    <SelectItem value="wedding">Wedding / gifting</SelectItem>
                    <SelectItem value="hedge">Inflation hedge</SelectItem>
                    <SelectItem value="retire">Retirement</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-gold text-gold-foreground hover:bg-gold/90">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</> : "Generate Strategy"}
              </Button>
            </CardContent>
          </form>
        </Card>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: Target, label: "Projected corpus", value: `₹${strategyResult.projectedCorpus.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` },
              { icon: TrendingUp, label: "Assumed CAGR", value: strategyResult.assumedCagr },
              { icon: ShieldCheck, label: "Volatility band", value: strategyResult.volatilityBand },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-5">
                  <s.icon className="h-4 w-4 text-gold" strokeWidth={1.75} />
                  <div className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                  <div className="mt-1 text-mono text-xl font-semibold">{s.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommended Allocation</CardTitle>
              <CardDescription>Split by instrument type, aligned to your risk profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {strategyResult.allocations.map((a: any) => (
                <div key={a.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{a.name}</span>
                    <span className="text-mono font-semibold">{a.pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full transition-all" style={{ width: `${a.pct}%`, background: a.color }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
