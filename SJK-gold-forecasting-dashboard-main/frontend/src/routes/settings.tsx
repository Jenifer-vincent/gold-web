import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SJK Gold" },
      { name: "description", content: "Manage your SJK Gold Forecasting account, alerts, and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [name, setName] = useState("Rahul Shah");
  const [email, setEmail] = useState("rahul.shah@sjkgold.example");
  const [phone, setPhone] = useState("+91 98200 12345");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const [alerts, setAlerts] = useState({ price: true, forecast: true, news: false });
  const [currency, setCurrency] = useState("INR");
  const [city, setCity] = useState("Mumbai");

  useEffect(() => {
    apiClient.get("/auth/me")
      .then(res => {
        if (res.data) {
          setName(res.data.full_name || "");
          setEmail(res.data.email || "");
          setPhone(res.data.phone || "");
        }
      })
      .catch(err => console.error("Profile load failed:", err?.message || err));

    apiClient.get("/settings")
      .then(res => {
        if (res.data) {
          if (res.data.base_currency) setCurrency(res.data.base_currency);
          if (res.data.default_city) setCity(res.data.default_city);
          setAlerts({
            price: Boolean(res.data.alerts_price),
            forecast: Boolean(res.data.alerts_forecast),
            news: Boolean(res.data.alerts_news)
          });
        }
      })
      .catch(err => console.error("Settings load failed:", err?.message || err));
  }, []);


  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
    if (phone && !/^[\d\s+-]{8,}$/.test(phone)) errs.phone = "Enter a valid phone";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const pRes = await apiClient.put("/settings/profile", {
        full_name: name,
        email: email,
        phone: phone
      });
      localStorage.setItem("user_name", pRes.data.full_name);
      localStorage.setItem("user_email", pRes.data.email);

      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } catch (error: any) {
      console.error("Profile save failed:", error);
      if (error.response && error.response.data && error.response.data.detail) {
        setErrors({ email: error.response.data.detail });
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (curr: string, ct: string) => {
    try {
      await apiClient.put("/settings/preferences", {
        base_currency: curr,
        default_city: ct
      });
    } catch (err) {
      console.error("Preferences save failed:", err);
    }
  };

  const handleAlertChange = async (k: "price" | "forecast" | "news", val: boolean) => {
    const nextAlerts = { ...alerts, [k]: val };
    setAlerts(nextAlerts);
    try {
      await apiClient.put("/settings/alerts", {
        alerts_price: nextAlerts.price,
        alerts_forecast: nextAlerts.forecast,
        alerts_news: nextAlerts.news
      });
    } catch (err) {
      console.error("Alerts save failed:", err);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Account" title="Settings" description="Manage profile, preferences, and alerts." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <form onSubmit={save}>
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription>Basic account information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Full name" error={errors.name}>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Email" error={errors.email}>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Phone" error={errors.phone}>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={loading} className="bg-gold text-gold-foreground hover:bg-gold/90">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : "Save changes"}
                </Button>
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
                {saved && <span className="text-xs text-bull">Saved ✓</span>}
              </div>
            </CardContent>
          </form>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferences</CardTitle>
            <CardDescription>Localisation and display settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Base currency</Label>
              <Select value={currency} onValueChange={(v) => { setCurrency(v); updatePreference(v, city); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">₹ Indian Rupee (INR)</SelectItem>
                  <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                  <SelectItem value="AED">د.إ UAE Dirham (AED)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">Default city (pricing)</Label>
              <Select value={city} onValueChange={(v) => { setCity(v); updatePreference(currency, v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Mumbai", "Delhi", "Chennai", "Bengaluru", "Hyderabad", "Kolkata"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Alerts</CardTitle>
            <CardDescription>Notification preferences.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {([
              ["price", "Price alerts", "Notify when 24K spot crosses your thresholds."],
              ["forecast", "Forecast updates", "Weekly forecast digest every Monday."],
              ["news", "Market news", "Breaking news alerts throughout the day."],
            ] as const).map(([k, t, d]) => (
              <div key={k} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{t}</div>
                  <div className="text-xs text-muted-foreground">{d}</div>
                </div>
                <Switch
                  checked={alerts[k]}
                  onCheckedChange={(v) => handleAlertChange(k, v)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
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
