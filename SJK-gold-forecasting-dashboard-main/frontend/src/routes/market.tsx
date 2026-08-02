import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { ArrowUpDown, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MARKET_INSIGHTS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/market")({
  head: () => ({
    meta: [
      { title: "Market Intelligence — SJK Gold" },
      { name: "description", content: "Real-time news, macro signals, and sentiment analysis for gold markets." },
    ],
  }),
  component: MarketPage,
});

const NEWS_FALLBACK = [
  ...MARKET_INSIGHTS,
  { title: "China PBoC pauses gold buying for third month", tag: "Central Bank", time: "3h ago", impact: "Bearish", summary: "Softer demand from largest buyer weighs on sentiment." },
  { title: "India gold ETF inflows hit 12-month high", tag: "Flows", time: "5h ago", impact: "Bullish", summary: "₹726 Cr net inflows into gold ETFs during June." },
  { title: "MCX August contract sees 4.2% OI rise", tag: "Derivatives", time: "6h ago", impact: "Neutral", summary: "Balanced buildup, low aggressive positioning." },
  { title: "Fed's Waller: cautious on cutting too early", tag: "Macro", time: "8h ago", impact: "Bearish", summary: "Hawkish tone strengthens dollar temporarily." },
];

type SortKey = "title" | "tag" | "impact";

function MarketPage() {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [news, setNews] = useState<any[]>(NEWS_FALLBACK);

  useEffect(() => {
    apiClient.get("/market/insights")
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setNews(res.data);
        }
      })
      .catch(err => {
        console.error("Failed to load news signals:", err?.message || err);
      });
  }, []);

  const rows = useMemo(() => {
    const filtered = news.filter(
      (n) =>
        (n.title && n.title.toLowerCase().includes(q.toLowerCase())) ||
        (n.tag && n.tag.toLowerCase().includes(q.toLowerCase())),
    );
    return filtered.sort((a, b) => {
      const av = (a[sortKey] || "").toString().toLowerCase();
      const bv = (b[sortKey] || "").toString().toLowerCase();
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [news, q, sortKey, sortDir]);


  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const bullishCount = news.filter((n) => n.impact === "Bullish").length;
  const bearishCount = news.filter((n) => n.impact === "Bearish").length;
  const netSentimentVal = news.length
    ? Math.round(((bullishCount - bearishCount) / news.length) * 100)
    : 0;
  const netSentimentStr = netSentimentVal >= 0 ? `+${netSentimentVal}%` : `${netSentimentVal}%`;

  return (
    <>
      <PageHeader
        eyebrow="Signals"
        title="Market Intelligence"
        description="Curated macro and news signals impacting gold prices, ranked by sentiment."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Bullish signals (24h)", value: bullishCount.toString(), tint: "text-bull" },
          { label: "Bearish signals (24h)", value: bearishCount.toString(), tint: "text-bear" },
          { label: "Net sentiment", value: netSentimentStr, tint: netSentimentVal >= 0 ? "text-bull" : "text-bear" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={`mt-2 text-mono text-2xl font-semibold ${s.tint}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">News & Signal Feed</CardTitle>
            <CardDescription>Searchable, sortable feed of market-moving events.</CardDescription>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search news…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 w-64 border-border bg-background pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  {(["title", "tag", "impact"] as SortKey[]).map((k) => (
                    <TableHead key={k}>
                      <button
                        onClick={() => toggleSort(k)}
                        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                      >
                        {k}
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((n) => (
                  <TableRow key={n.title} className="border-border">
                    <TableCell className="max-w-md">
                      <div className="font-medium">{n.title}</div>
                      <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.summary}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{n.tag}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          n.impact === "Bullish"
                            ? "border-bull/30 bg-bull/10 text-bull"
                            : n.impact === "Bearish"
                              ? "border-bear/30 bg-bear/10 text-bear"
                              : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {n.impact}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-mono text-right text-xs text-muted-foreground">
                      {n.time}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                      No signals match your search.
                      <div className="mt-3">
                        <Button variant="outline" size="sm" onClick={() => setQ("")}>
                          Clear search
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
