import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import logoUrl from "@/assets/logo.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — SJK Gold Forecasting" },
      { name: "description", content: "Sign in to your SJK Gold Forecasting account." },
    ],
  }),
});

import { apiClient } from "@/lib/api-client";

function LoginPage() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitError, setSubmitError] = useState("");

  const navigate = Route.useNavigate();

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const emailError = touched.email && !emailValid;
  const passwordError = touched.password && !passwordValid;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Login button clicked");

    setTouched({ email: true, password: true });

    if (!emailValid || !passwordValid) return;

    setLoading(true);
    setSubmitError("");

    try {
      console.log("Sending login request...");

      const response = await apiClient.post("/auth/login", {
        email,
        password,
      });

      console.log("Login response:", response.data);

      const token = response.data.access_token;

      console.log("Token:", token);

      window.localStorage.setItem("token", token);

      console.log("Token saved");

      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      const me = await apiClient.get("/auth/me");

      console.log("User:", me.data);

      window.localStorage.setItem("user_email", me.data.email);
      window.localStorage.setItem(
        "user_name",
        me.data.full_name ?? me.data.email
      );

      console.log("Redirecting...");

      navigate({
        to: "/",
        replace: true,
      });

    } catch (err: any) {

      console.error("FULL ERROR");

      console.error(err);

      console.error(err.response);

      console.error(err.response?.data);

      setSubmitError(
        err.response?.data?.detail ??
        err.message ??
        "Unknown error"
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between bg-navy text-navy-foreground p-10 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
        <div className="relative flex items-center gap-3">
          <img src={logoUrl} alt="SJK" width={44} height={44} className="h-11 w-11" />
          <div>
            <div className="text-lg font-bold">SJK Gold</div>
            <div className="text-[11px] uppercase tracking-widest text-white/60">
              Forecasting Suite
            </div>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <h1 className="text-4xl font-bold leading-tight text-white">
            Data-driven gold intelligence for Indian investors.
          </h1>
          <p className="text-white/70 leading-relaxed">
            Track MCX prices, run break-even forecasts, and plan multi-city strategies —
            all from one professional dashboard.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Stat icon={TrendingUp} label="Forecast accuracy" value="94.2%" />
            <Stat icon={ShieldCheck} label="Trusted investors" value="12,400+" />
          </div>
        </div>

        <div className="relative text-xs text-white/50">
          © {new Date().getFullYear()} SJK Gold Forecasting. All rights reserved.
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <img src={logoUrl} alt="SJK" width={40} height={40} className="h-10 w-10" />
            <div className="text-lg font-bold text-navy">SJK Gold Forecasting</div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-navy">Welcome back</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to continue to your dashboard.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-5" noValidate>
            {submitError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive font-medium border border-destructive/20">
                {submitError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-navy">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                aria-invalid={emailError}
                className={emailError ? "border-destructive focus-visible:ring-destructive/40" : "focus-visible:ring-gold/40"}
              />
              {emailError && (
                <p className="text-xs text-destructive">Please enter a valid email address.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-navy">Password</Label>
                <a href="#" className="text-xs font-medium text-gold hover:underline">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  aria-invalid={passwordError}
                  className={passwordError ? "border-destructive pr-10 focus-visible:ring-destructive/40" : "pr-10 focus-visible:ring-gold/40"}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-navy"
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs text-destructive">Password must be at least 6 characters.</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label htmlFor="remember" className="text-sm text-muted-foreground font-normal">
                Keep me signed in for 30 days
              </Label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gold text-gold-foreground font-semibold hover:bg-gold/90 shadow-sm transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              New to SJK?{" "}
              <Link to="/" className="font-medium text-gold hover:underline">
                Explore the dashboard
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof TrendingUp; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <Icon className="h-4 w-4 text-gold" />
      <div className="mt-2 text-xl font-bold text-white">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-white/60">{label}</div>
    </div>
  );
}
