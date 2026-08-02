import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Edit2, Trash2, Plus, Loader2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio — SJK Gold" },
      { name: "description", content: "Track your gold holdings across physical, SGB, ETF, and digital gold." },
    ],
  }),
  component: PortfolioPage,
});

const COLORS = ["oklch(0.78 0.13 82)", "oklch(0.7 0.15 200)", "oklch(0.72 0.17 155)", "oklch(0.65 0.18 300)"];

function PortfolioPage() {
  const [holdings, setHoldings] = useState<any[]>([]);
  const [spot22kVal, setSpot22kVal] = useState(68590);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [dialogError, setDialogError] = useState("");

  // Form State
  const [formAsset, setFormAsset] = useState("Sovereign Gold Bond (SGB)");
  const [formGrams, setFormGrams] = useState("");
  const [formAvgPrice, setFormAvgPrice] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formCity, setFormCity] = useState("Mumbai");
  const [formNotes, setFormNotes] = useState("");

  const fetchHoldings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/portfolio/holdings");
      if (res.data && Array.isArray(res.data.holdings)) {
        setHoldings(res.data.holdings);
      }
    } catch (err: any) {
      console.error("Failed to fetch holdings:", err?.message || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    apiClient.get("/market/live-kpis")
      .then(res => {
        if (res.data && typeof res.data.price_22k === "number") {
          setSpot22kVal(res.data.price_22k);
        }
      })
      .catch(err => console.error("Failed to load spot price in portfolio page:", err?.message || err));

    fetchHoldings();
  }, []);


  const openAdd = () => {
    setEditingId(null);
    setFormAsset("Sovereign Gold Bond (SGB)");
    setFormGrams("");
    setFormAvgPrice("");
    setFormDate(new Date().toISOString().substring(0, 10));
    setFormCity("Mumbai");
    setFormNotes("");
    setDialogError("");
    setIsOpen(true);
  };

  const openEdit = (h: any) => {
    setEditingId(h.id);
    setFormAsset(h.asset);
    setFormGrams(h.grams.toString());
    setFormAvgPrice(h.avg_price.toString());
    setFormDate(h.date_of_purchase);
    setFormCity(h.city || "Mumbai");
    setFormNotes(h.notes || "");
    setDialogError("");
    setIsOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this position?")) return;
    try {
      await apiClient.delete(`/portfolio/holdings/${id}`);
      fetchHoldings();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleSubmit = async () => {
    if (!formGrams || Number(formGrams) <= 0) {
      setDialogError("Please enter a valid weight in grams");
      return;
    }
    if (!formAvgPrice || Number(formAvgPrice) <= 0) {
      setDialogError("Please enter a valid price");
      return;
    }
    if (!formDate) {
      setDialogError("Please select a purchase date");
      return;
    }

    setSubmitLoading(true);
    setDialogError("");
    const body = {
      asset: formAsset,
      grams: Number(formGrams),
      avg_price: Number(formAvgPrice),
      date_of_purchase: formDate,
      city: formCity,
      notes: formNotes,
    };

    try {
      if (editingId) {
        await apiClient.put(`/portfolio/holdings/${editingId}`, body);
      } else {
        await apiClient.post("/portfolio/holdings", body);
      }
      setIsOpen(false);
      fetchHoldings();
    } catch (error: any) {
      console.error("Save transaction failed:", error);
      setDialogError("Failed to save transaction. Try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Consolidate individual entries by asset type
  const consolidated = useMemo(() => {
    const assetTypes = [
      "Sovereign Gold Bond (SGB)",
      "Gold ETF",
      "Physical Gold",
      "Digital Gold"
    ];

    const grouped = assetTypes.map(asset => {
      const txns = holdings.filter(h => h.asset === asset);
      const gramsSum = txns.reduce((s, h) => s + h.grams, 0);
      const totalCost = txns.reduce((s, h) => s + (h.avg_price * h.grams) / 10.0, 0);
      const avgPrice = gramsSum > 0 ? (totalCost * 10.0 / gramsSum) : 0;
      const currentPrice = asset === "Sovereign Gold Bond (SGB)" ? spot22kVal * 1.02 : spot22kVal; // small premium on SGBs

      return {
        asset,
        grams: gramsSum,
        avg: avgPrice,
        current: currentPrice,
        alloc: 0
      };
    });

    const totalCurrentVal = grouped.reduce((s, h) => s + (h.current * h.grams) / 10, 0);

    return grouped.map(h => {
      const curVal = (h.current * h.grams) / 10;
      const allocVal = totalCurrentVal > 0 ? Math.round((curVal / totalCurrentVal) * 100) : 0;
      return {
        ...h,
        alloc: allocVal
      };
    });
  }, [holdings, spot22kVal]);

  // Overall KPIs
  const totalGrams = holdings.reduce((s, h) => s + h.grams, 0);
  const invested = holdings.reduce((s, h) => s + (h.avg_price * h.grams) / 10, 0);
  const currentValue = consolidated.reduce((s, h) => s + (h.current * h.grams) / 10, 0);
  const pnl = currentValue - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

  // Pie chart data
  const pieData = useMemo(() => {
    return consolidated.filter(h => h.grams > 0);
  }, [consolidated]);

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Your Gold Holdings"
        description="Consolidated view across all instrument types."
        actions={
          <Button onClick={openAdd} className="gap-2 bg-gold text-gold-foreground hover:bg-gold/90">
            <Plus className="h-4 w-4" /> Add Position
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total gold" value={`${totalGrams.toFixed(2)} g`} />
        <Kpi label="Invested" value={`₹${invested.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} />
        <Kpi label="Current value" value={`₹${currentValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} accent />
        <Kpi
          label="Unrealised P&L"
          value={`${pnl >= 0 ? "+" : ""}₹${pnl.toLocaleString("en-IN", { maximumFractionDigits: 0 })} (${pnlPct.toFixed(2)}%)`}
          trend={pnl >= 0 ? "up" : "down"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Holdings Breakdown</CardTitle>
            <CardDescription>Detailed positions by instrument.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead>Instrument</TableHead>
                    <TableHead className="text-right">Grams</TableHead>
                    <TableHead className="text-right">Avg. price / 10g</TableHead>
                    <TableHead className="text-right">Current / 10g</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consolidated.map((h) => {
                    const p = ((h.current - h.avg) * h.grams) / 10;
                    const pct = h.avg > 0 ? (((h.current - h.avg) / h.avg) * 100) : 0;
                    return (
                      <TableRow key={h.asset} className="border-border">
                        <TableCell className="font-medium">{h.asset}</TableCell>
                        <TableCell className="text-mono text-right">{h.grams.toFixed(2)}</TableCell>
                        <TableCell className="text-mono text-right">₹{Math.round(h.avg).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-mono text-right">₹{Math.round(h.current).toLocaleString("en-IN")}</TableCell>
                        <TableCell className={`text-mono text-right ${p >= 0 ? "text-bull" : "text-bear"}`}>
                          {p >= 0 ? "+" : ""}₹{p.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          <span className="ml-1 text-[11px] opacity-70">({pct.toFixed(2)}%)</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Allocation</CardTitle>
            <CardDescription>Share of portfolio by instrument.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer>
                {pieData.length > 0 ? (
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="grams"
                      nameKey="asset"
                      innerRadius={60}
                      outerRadius={95}
                      strokeWidth={2}
                      stroke="oklch(0.24 0.028 262)"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.22 0.03 262)",
                        border: "1px solid oklch(0.32 0.02 260 / 0.6)",
                        borderRadius: 10,
                        fontSize: 12,
                        color: "#fff",
                      }}
                    />
                  </PieChart>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No holdings to allocate
                  </div>
                )}
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1.5">
              {consolidated.map((h, i) => (
                <div key={h.asset} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
                    {h.asset}
                  </span>
                  <span className="text-mono">{h.alloc}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Transaction Log / Positions</CardTitle>
          <CardDescription>Manage individual gold investment records.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Grams</TableHead>
                  <TableHead className="text-right">Avg Price / 10g</TableHead>
                  <TableHead>Date of Purchase</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holdings.map((h: any) => (
                  <TableRow key={h.id} className="border-border">
                    <TableCell className="font-semibold">{h.asset}</TableCell>
                    <TableCell className="text-mono text-right">{h.grams}g</TableCell>
                    <TableCell className="text-mono text-right">₹{h.avg_price.toLocaleString("en-IN")}</TableCell>
                    <TableCell>{h.date_of_purchase}</TableCell>
                    <TableCell className="text-muted-foreground">{h.city || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground" title={h.notes}>{h.notes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-gold" onClick={() => openEdit(h)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(h.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {holdings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                      No gold positions recorded yet. Click "Add Position" above to add your first.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-navy">{editingId ? "Edit Gold Position" : "Add Gold Position"}</DialogTitle>
            <DialogDescription>
              Enter the transaction parameters to update your portfolio holdings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Asset Instrument</Label>
              <Select value={formAsset} onValueChange={setFormAsset}>
                <SelectTrigger className="border-border bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="Sovereign Gold Bond (SGB)">Sovereign Gold Bond (SGB)</SelectItem>
                  <SelectItem value="Gold ETF">Gold ETF</SelectItem>
                  <SelectItem value="Physical Gold">Physical Gold</SelectItem>
                  <SelectItem value="Digital Gold">Digital Gold</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Quantity (grams)</Label>
                <Input type="number" step="0.01" value={formGrams} onChange={e => setFormGrams(e.target.value)} placeholder="e.g. 10" className="border-border bg-background" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Avg Price (₹ per 10g)</Label>
                <Input type="number" step="1" value={formAvgPrice} onChange={e => setFormAvgPrice(e.target.value)} placeholder="e.g. 74000" className="border-border bg-background" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Purchase Date</Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="border-border bg-background" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">City</Label>
                <Input value={formCity} onChange={e => setFormCity(e.target.value)} placeholder="e.g. Mumbai" className="border-border bg-background" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
              <Textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} placeholder="Enter details..." className="border-border bg-background h-16 resize-none" />
            </div>
            
            {dialogError && <p className="text-xs text-bear">{dialogError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitLoading} className="bg-gold text-gold-foreground hover:bg-gold/90">
              {submitLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Save Changes" : "Add Position"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Kpi({ label, value, accent, trend }: { label: string; value: string; accent?: boolean; trend?: "up" | "down" }) {
  return (
    <Card className={accent ? "border-gold/30 bg-gold/5" : ""}>
      <CardContent className="p-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`mt-2 text-mono text-xl font-semibold ${trend === "up" ? "text-bull" : trend === "down" ? "text-bear" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
