import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AI_CHAT_SEED } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — SJK Gold" },
      { name: "description", content: "Conversational AI assistant for gold strategy and break-even analysis." },
    ],
  }),
  component: AssistantPage,
});

const SUGGESTIONS = [
  "What's the best time to buy SGBs?",
  "Compare 22K vs 24K for investment",
  "How does USD/INR affect gold?",
  "Suggest a 5-year SIP plan",
];

function AssistantPage() {
  const [msgs, setMsgs] = useState(AI_CHAT_SEED);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [userName, setUserName] = useState("Rahul Shah");

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("user_name");
      if (stored) setUserName(stored);
    }
  }, []);

  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase() || "RS";

  const send = async () => {
    const t = text.trim();
    if (!t) { setErr("Please enter a message"); return; }
    if (t.length > 500) { setErr("Message too long (500 chars max)"); return; }
    setErr("");
    
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setText("");
    setLoading(true);

    let attempts = 0;
    let success = false;
    let replyText = "";

    while (attempts < 2 && !success) {
      try {
        attempts++;
        const res = await apiClient.post("/chat", { message: t });
        if (res.data && typeof res.data.text === "string" && res.data.text.trim()) {
          replyText = res.data.text;
          success = true;
        } else {
          replyText = "Received empty response from assistant.";
          success = true;
        }
      } catch (error: any) {
        console.error(`Chat attempt ${attempts} failed:`, error?.message || error);
        if (attempts >= 2) {
          replyText = "Sorry, I am having trouble connecting to the SJK advisory backend. Please verify your connection and try again.";
        } else {
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }

    setMsgs((m) => [
      ...m,
      {
        role: "assistant",
        text: replyText,
      },
    ]);
    setLoading(false);
  };


  return (
    <>
      <PageHeader
        eyebrow="Assistant"
        title="AI Gold Advisor"
        description="Ask questions about pricing, strategy, taxation, and macro drivers."
      />

      <Card className="flex h-[calc(100vh-14rem)] min-h-[520px] flex-col">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-gold" strokeWidth={1.75} /> SJK Assistant
          </CardTitle>
          <CardDescription>Powered by SJK Gold analytics models. Placeholder responses.</CardDescription>
        </CardHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          {msgs.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold">
                  <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-gold text-gold-foreground"
                    : "bg-accent/50 text-foreground",
                )}
              >
                {m.text}
              </div>
              {m.role === "user" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-semibold">
                  {userInitials}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold/15 text-gold">
                <Sparkles className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="rounded-xl bg-accent/50 px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                      style={{ animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setText(s)}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-gold/40 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="Ask about break-even, SGBs, allocation…"
              rows={2}
              className="resize-none border-border bg-background"
            />
            <Button onClick={send} disabled={loading} className="h-auto bg-gold text-gold-foreground hover:bg-gold/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {err && <p className="mt-2 text-[11px] text-bear">{err}</p>}
        </div>
      </Card>
    </>
  );
}
