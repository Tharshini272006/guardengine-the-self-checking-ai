import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { GuardBadge } from "@/components/GuardBadge";
import { PipelineAnimation } from "@/components/PipelineAnimation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Send, FileText, ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$sessionId")({
  head: () => ({ meta: [{ title: "Chat — GuardEngine" }] }),
  component: ChatPage,
});

interface DBMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  faithfulness_score: number | null;
  relevancy_score: number | null;
  context_precision_score: number | null;
  retry_count: number;
  status: string | null;
  created_at: string;
}

interface Telemetry {
  query_history: Array<{ stage: string; query: string }> | null;
  failure_reasons: Array<{ stage: string; reason: string }> | null;
  latency_ms: number | null;
}

interface UIMessage extends DBMessage {
  telemetry?: Telemetry;
  pending?: boolean;
}

function ChatPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [paper, setPaper] = useState<{ id: string; title: string } | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: session, error } = await supabase
        .from("chat_sessions")
        .select("id, paper_id, papers ( id, title )")
        .eq("id", sessionId)
        .maybeSingle();
      if (error || !session) {
        toast.error("Session not found");
        navigate({ to: "/dashboard" });
        return;
      }
      const p = (session as { papers: { id: string; title: string } | null }).papers;
      if (p) setPaper(p);

      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

      const list = (msgs ?? []) as DBMessage[];
      const telIds = list.filter((m) => m.role === "assistant").map((m) => m.id);
      let tel: Record<string, Telemetry> = {};
      if (telIds.length) {
        const { data: tels } = await supabase
          .from("query_telemetry")
          .select("message_id, query_history, failure_reasons, latency_ms")
          .in("message_id", telIds);
        tel = Object.fromEntries(
          (tels ?? []).map((t) => [t.message_id as string, {
            query_history: t.query_history as Telemetry["query_history"],
            failure_reasons: t.failure_reasons as Telemetry["failure_reasons"],
            latency_ms: t.latency_ms,
          }]),
        );
      }
      setMessages(list.map((m) => ({ ...m, telemetry: tel[m.id] })));
      setLoading(false);
    })();
  }, [sessionId, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  async function send() {
    const q = input.trim();
    if (!q || !paper || sending) return;
    setInput("");

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user!.id;

    // Insert user message
    const { data: userMsg, error: uErr } = await supabase
      .from("messages")
      .insert({ session_id: sessionId, role: "user", content: q, status: "sent" })
      .select("*")
      .single();
    if (uErr) {
      toast.error("Couldn't send", { description: uErr.message });
      return;
    }
    setMessages((m) => [...m, userMsg as DBMessage]);

    // Pending assistant bubble
    const pendingId = `pending-${Date.now()}`;
    setMessages((m) => [
      ...m,
      {
        id: pendingId,
        role: "assistant",
        content: "",
        faithfulness_score: null,
        relevancy_score: null,
        context_precision_score: null,
        retry_count: 0,
        status: "pending",
        created_at: new Date().toISOString(),
        pending: true,
      },
    ]);
    setSending(true);

    try {
      const { data: result, error } = await supabase.functions.invoke("process-query", {
        body: { session_id: sessionId, query: q, paper_id: paper.id },
      });
      if (error) throw error;

      const r = result as {
        answer: string;
        faithfulness_score: number;
        relevancy_score: number;
        context_precision_score: number;
        retry_count: number;
        status: string;
        query_history: Array<{ stage: string; query: string }>;
        failure_reasons: Array<{ stage: string; reason: string }>;
        latency_ms: number;
      };

      const { data: aMsg, error: iErr } = await supabase
        .from("messages")
        .insert({
          session_id: sessionId,
          role: "assistant",
          content: r.answer,
          faithfulness_score: r.faithfulness_score,
          relevancy_score: r.relevancy_score,
          context_precision_score: r.context_precision_score,
          retry_count: r.retry_count,
          status: r.status,
        })
        .select("*")
        .single();
      if (iErr) throw iErr;

      await supabase.from("query_telemetry").insert({
        message_id: (aMsg as DBMessage).id,
        query_history: r.query_history,
        failure_reasons: r.failure_reasons,
        latency_ms: r.latency_ms,
      });

      setMessages((m) =>
        m.filter((x) => x.id !== pendingId).concat({
          ...(aMsg as DBMessage),
          telemetry: {
            query_history: r.query_history,
            failure_reasons: r.failure_reasons,
            latency_ms: r.latency_ms,
          },
        }),
      );
    } catch (e) {
      setMessages((m) =>
        m.map((x) =>
          x.id === pendingId
            ? { ...x, pending: false, status: "failed", content: e instanceof Error ? e.message : "Pipeline error" }
            : x,
        ),
      );
      toast.error("Pipeline error", { description: e instanceof Error ? e.message : "Unknown" });
    } finally {
      setSending(false);
    }
  }

  const sidebar = (
    <div className="flex flex-col gap-2">
      <Button variant="ghost" size="sm" className="justify-start" onClick={() => navigate({ to: "/dashboard" })}>
        <ArrowLeft className="h-4 w-4" /> All papers
      </Button>
      <div className="mt-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <FileText className="h-3.5 w-3.5" /> Active paper
        </div>
        <div className="mt-1 text-sm font-medium leading-tight">{paper?.title ?? "—"}</div>
      </div>
      <div className="mt-3 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 text-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Guardrails active
        </div>
        <p className="mt-1.5 leading-relaxed">
          Every answer is judged for faithfulness, relevancy, and context precision before it reaches you.
        </p>
      </div>
    </div>
  );

  return (
    <AppShell sidebar={sidebar}>
      <div className="mx-auto flex h-[calc(100vh-3.5rem)] max-w-3xl flex-col px-4 sm:px-8">
        <div className="flex-1 overflow-y-auto py-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-3/4" />
              <Skeleton className="ml-auto h-12 w-1/2" />
              <Skeleton className="h-20 w-3/4" />
            </div>
          ) : messages.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div className="max-w-sm">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-primary/40 bg-primary/10 ring-glow">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h2 className="mt-4 text-lg font-semibold">Ask your first question</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try: "What are the main results?" or "Summarize the methodology."
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((m) => (
                <MessageRow key={m.id} m={m} />
              ))}
              {sending && (
                <div className="rounded-2xl border border-border bg-surface/60 p-4">
                  <PipelineAnimation running />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/80 px-4 py-3 backdrop-blur-xl sm:-mx-8 sm:px-8">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface/70 p-2 focus-within:border-primary/40 focus-within:ring-glow">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask the paper anything…"
              rows={1}
              className="min-h-9 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              disabled={sending}
            />
            <Button onClick={send} disabled={!input.trim() || sending} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MessageRow({ m }: { m: UIMessage }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {m.content}
        </div>
      </div>
    );
  }
  const failed = m.status === "failed";
  return (
    <div className="space-y-2">
      <div
        className={cn(
          "max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-relaxed",
          failed
            ? "border-destructive/40 bg-destructive/10 text-foreground"
            : "border-border bg-surface/80 text-foreground",
        )}
      >
        {m.pending ? (
          <div className="text-muted-foreground"><PipelineAnimation running /></div>
        ) : (
          <div className="whitespace-pre-wrap">{m.content}</div>
        )}
      </div>
      {!m.pending && (
        <div className="flex items-center gap-2">
          <GuardBadge
            faithfulness={m.faithfulness_score}
            relevancy={m.relevancy_score}
            precision={m.context_precision_score}
            retryCount={m.retry_count}
            status={m.status}
          />
        </div>
      )}
      {!m.pending && m.telemetry && (
        <Collapsible>
          <CollapsibleTrigger className="group inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
            Show reasoning
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-3 rounded-xl border border-border bg-background/60 p-3 text-xs">
              <div>
                <div className="mb-1 font-medium text-foreground/80">Query history</div>
                <div className="space-y-1">
                  {(m.telemetry.query_history ?? []).map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="w-20 shrink-0 text-muted-foreground">{h.stage}</span>
                      <span className="text-foreground/90">{h.query}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Metric label="Faithfulness" value={m.faithfulness_score} />
                <Metric label="Relevancy" value={m.relevancy_score} />
                <Metric label="Precision" value={m.context_precision_score} />
              </div>
              {(m.telemetry.failure_reasons ?? []).length > 0 && (
                <div>
                  <div className="mb-1 font-medium text-warning">Failure reasons</div>
                  <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
                    {m.telemetry.failure_reasons!.map((f, i) => (
                      <li key={i}><span className="text-foreground/80">{f.stage}:</span> {f.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              {m.telemetry.latency_ms != null && (
                <div className="text-muted-foreground">Latency: {m.telemetry.latency_ms}ms</div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  const good = v >= 0.7;
  return (
    <div className="rounded-lg border border-border bg-background/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 font-mono text-sm", good ? "text-success" : "text-warning")}>
        {v.toFixed(2)}
      </div>
    </div>
  );
}
