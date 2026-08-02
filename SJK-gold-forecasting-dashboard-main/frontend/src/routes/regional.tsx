import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { ArrowUpDown, Search } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { REGIONAL_PRICES } from "@/lib/mock-data";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/regional")({
  head: () => ({
    meta: [
      { title: "Regional Comparison — SJK Gold" },
      { name: "description", content: "City-wise gold price comparison across major Indian metros." },
    ],
  }),
  component: RegionalPage,
});

type Key = "city" | "price24" | "price22" | "premium";

function RegionalPage() {
  const [q, setQ] = useState("");
  const [key, setKey] = useState<Key>("price24");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  
  const [activeTab, setActiveTab] = useState("domestic");
  const [regionalPrices, setRegionalPrices] = useState<any[]>(REGIONAL_PRICES);
  const [globalPrices, setGlobalPrices] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get("/regional/prices")
      .then(res => {
        if (res.data && Array.isArray(res.data.regional)) setRegionalPrices(res.data.regional);
        if (res.data && Array.isArray(res.data.global)) setGlobalPrices(res.data.global);
      })
      .catch(err => console.error("Failed to load regional/global prices:", err?.message || err));
  }, []);

  const rows = useMemo(() => {
    return [...regionalPrices]
      .filter((r) => r && r.city && r.city.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (typeof av === "string") return dir === "asc" ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
        return dir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
      });
  }, [regionalPrices, q, key, dir]);

  const globalRows = useMemo(() => {
    return [...globalPrices]
      .filter((r) => r && r.country && r.country.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => {
        return dir === "asc" 
          ? (a.inrEquiv || 0) - (b.inrEquiv || 0) 
          : (b.inrEquiv || 0) - (a.inrEquiv || 0);
      });
  }, [globalPrices, q, dir]);


  const toggle = (k: Key) => {
    if (k === key) setDir(dir === "asc" ? "desc" : "asc");
    else { setKey(k); setDir("desc"); }
  };

  return (
    <>
      <PageHeader
        eyebrow="Geography"
        title="Regional Comparison"
        description="Compare 24K and 22K gold prices across Indian metros, plus premium vs Mumbai benchmark."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <TabsList>
            <TabsTrigger value="domestic">🇮🇳 Domestic Cities</TabsTrigger>
            <TabsTrigger value="global">🌐 Global Equivalencies</TabsTrigger>
          </TabsList>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              placeholder={activeTab === "domestic" ? "Search city…" : "Search country…"} 
              className="h-9 w-56 border-border bg-card pl-9 text-xs" 
            />
          </div>
        </div>

        <TabsContent value="domestic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Premium vs Mumbai (₹ / 10g)</CardTitle>
              <CardDescription>Positive values indicate cities pricing above Mumbai benchmark.</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[280px]">
                <ResponsiveContainer>
                  <BarChart data={regionalPrices} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="oklch(0.32 0.02 260 / 0.4)" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="city" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "oklch(0.22 0.03 262)",
                        border: "1px solid oklch(0.32 0.02 260 / 0.6)",
                        borderRadius: 10,
                        fontSize: 12,
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="premium" radius={[6, 6, 0, 0]}>
                      {regionalPrices.map((r, i) => (
                        <Bar key={i} dataKey="premium" fill={r.premium >= 0 ? "oklch(0.72 0.17 155)" : "oklch(0.65 0.22 25)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">City Prices</CardTitle>
              <CardDescription>Sortable and searchable price table.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      {([
                        ["city", "City"],
                        ["price24", "24K / 10g"],
                        ["price22", "22K / 10g"],
                        ["premium", "vs Mumbai"],
                      ] as const).map(([k, label]) => (
                        <TableHead key={k} className={k === "city" ? "" : "text-right"}>
                          <button
                            onClick={() => toggle(k)}
                            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                          >
                            {label} <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.city} className="border-border">
                        <TableCell className="font-medium">{r.city}</TableCell>
                        <TableCell className="text-mono text-right">₹{r.price24.toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-mono text-right">₹{r.price22.toLocaleString("en-IN")}</TableCell>
                        <TableCell className={`text-mono text-right ${r.premium > 0 ? "text-bull" : r.premium < 0 ? "text-bear" : "text-muted-foreground"}`}>
                          {r.premium > 0 ? "+" : ""}₹{r.premium}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Global Equivalencies vs Indian Benchmark</CardTitle>
              <CardDescription>Gold prices in major markets converted to local currency and INR equivalencies (per 10g, 22K equivalent).</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead>Country / Market</TableHead>
                      <TableHead className="text-right">Local Price (per 10g)</TableHead>
                      <TableHead className="text-right">INR Equivalent (per 10g)</TableHead>
                      <TableHead className="text-right">Price Gap vs Domestic 22K</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {globalRows.map((r) => {
                      const domestic22k = regionalPrices.find(p => p.city === "Mumbai")?.price22 || 68590;
                      const diff = r.inrEquiv - domestic22k;
                      return (
                        <TableRow key={r.country} className="border-border">
                          <TableCell className="font-medium">{r.country}</TableCell>
                          <TableCell className="text-mono text-right">{r.localPrice}</TableCell>
                          <TableCell className="text-mono text-right font-semibold">₹{r.inrEquiv.toLocaleString("en-IN")}</TableCell>
                          <TableCell className={`text-mono text-right ${diff >= 0 ? "text-bull" : "text-bear"}`}>
                            {diff >= 0 ? "+" : ""}₹{diff.toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
