import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  LineChart,
  Newspaper,
  Landmark,
  Target,
  Wallet,
  MapPin,
  Sparkles,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import logoUrl from "@/assets/logo.png";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/forecast", label: "Break-even Forecast", icon: LineChart },
  { to: "/market", label: "Market Intelligence", icon: Newspaper },
  { to: "/economic", label: "Economic Analysis", icon: Landmark },
  { to: "/strategy", label: "Strategy Planner", icon: Target },
  { to: "/portfolio", label: "Portfolio", icon: Wallet },
  { to: "/regional", label: "Regional Comparison", icon: MapPin },
  { to: "/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

import { useEffect } from "react";
import { apiClient } from "@/lib/api-client";

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  const [liveKpi, setLiveKpi] = useState<any>({
    price_24k: 74820,
    price_22k: 68590,
    change_24k: "+0.38%",
    change_22k: "+0.32%",
    trend_24k: "up",
    trend_22k: "up"
  });

  const [userName, setUserName] = useState("Rahul Shah");

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      const storedName = localStorage.getItem("user_name");
      if (storedName) {
        setUserName(storedName);
      }
    }
  }, []);

  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "RS";

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token || pathname.startsWith("/login")) return;

    // Load cached KPI if available to prevent flash/layout break
    const cached = localStorage.getItem("cached_live_kpis");
    if (cached) {
      try {
        setLiveKpi(JSON.parse(cached));
      } catch (e) {
        // ignore parse error
      }
    }

    apiClient
      .get("/market/live-kpis")
      .then((res) => {
        if (res.data) {
          setLiveKpi(res.data);
          localStorage.setItem("cached_live_kpis", JSON.stringify(res.data));
        }
      })
      .catch((err) => {
        console.error("Failed to load spot KPIs in layout:", err?.message || err);
      });
  }, [pathname]);


  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // Hide chrome on auth routes
  if (pathname.startsWith("/login")) {
    return <>{children}</>;
  }

  const sidebarWidth = collapsed ? "lg:w-20" : "lg:w-64";
  const mainPad = collapsed ? "lg:pl-20" : "lg:pl-64";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {open && (
        <div
          className="fixed inset-0 z-40 bg-navy/40 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm transition-all duration-200",
          sidebarWidth,
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center gap-2.5 border-b border-sidebar-border px-4",
            collapsed && "lg:justify-center lg:px-2",
          )}
        >
          <img
            src={logoUrl}
            alt="SJK Gold Forecasting"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-navy">SJK Gold</div>
              <div className="truncate text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Forecasting Suite
              </div>
            </div>
          )}
          <button
            className="ml-auto rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {!collapsed && (
            <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Workspace
            </div>
          )}
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active =
                item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium outline-none transition-all duration-150",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      "focus-visible:ring-2 focus-visible:ring-ring",
                      active
                        ? "bg-sidebar-accent text-navy"
                        : "text-sidebar-foreground/75",
                      collapsed && "lg:justify-center lg:px-2",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-gold" />
                    )}
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        active ? "text-gold" : "text-muted-foreground group-hover:text-navy",
                      )}
                      strokeWidth={1.9}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {!collapsed ? (
            <div className="rounded-lg border border-border bg-secondary/60 p-3">
              <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-bull" />
                Market Open • MCX
              </div>
              <div className="mt-1.5 text-mono text-lg font-bold text-navy">
                ₹{liveKpi.price_24k.toLocaleString("en-IN")}
              </div>
              <div className={cn(
                "text-[11px] font-medium",
                liveKpi.trend_24k === "up" ? "text-bull" : "text-bear"
              )}>
                24K / 10g • {liveKpi.change_24k}
              </div>
            </div>
          ) : (
            <div className="grid place-items-center">
              <span className="h-2 w-2 rounded-full bg-bull" />
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="mt-3 hidden w-full items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-gold/50 hover:text-navy lg:flex"
          >
            {collapsed ? (
              <ChevronsRight className="h-3.5 w-3.5" />
            ) : (
              <>
                <ChevronsLeft className="h-3.5 w-3.5" /> Collapse
              </>
            )}
          </button>
        </div>
      </aside>

      <div className={cn("transition-all duration-200", mainPad)}>
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 sm:px-6">
            <button
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-navy lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search markets, cities, strategies…"
                className="h-10 max-w-md border-border bg-card pl-9 text-sm placeholder:text-muted-foreground/70 focus-visible:ring-gold/40"
              />
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <Badge
                variant="outline"
                className="hidden border-bull/30 bg-bull/10 text-bull sm:inline-flex"
              >
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-bull" /> Live
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:bg-accent hover:text-navy"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" strokeWidth={1.9} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold ring-2 ring-background" />
              </Button>
              <button
                onClick={handleLogout}
                title="Click to logout"
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-left transition-colors hover:border-destructive/50"
              >
                <div className="grid h-7 w-7 place-items-center rounded-md bg-gold/15 text-xs font-bold text-gold">
                  {userInitials}
                </div>
                <div className="hidden min-w-0 sm:block">
                  <div className="truncate text-xs font-semibold leading-tight text-navy">
                    {userName}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">Logout</div>
                </div>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
