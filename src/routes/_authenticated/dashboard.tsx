import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  FileText,
  Upload,
  Plus,
  Loader2,
  FileWarning,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — GuardEngine" }] }),
  component: Dashboard,
});

interface Paper {
  id: string;
  title: string;
  status: string;
  persona: unknown;
  created_at: string;
}

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const { data: papers, isLoading } = useQuery({
    queryKey: ["papers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("papers")
        .select("id, title, status, persona, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Paper[];
    },
  });

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("PDF only", { description: "Please upload a .pdf file." });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large", { description: "Max 25MB." });
      return;
    }
    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not signed in");

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${userId}/${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from("papers")
        .upload(filePath, file, { contentType: "application/pdf" });
      if (upErr) throw upErr;

      const title = file.name.replace(/\.pdf$/i, "");
      const { data: paper, error: insErr } = await supabase
        .from("papers")
        .insert({
          user_id: userId,
          title,
          file_path: filePath,
          status: "processing",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      await queryClient.invalidateQueries({ queryKey: ["papers"] });
      toast.success("Paper uploaded", { description: "Now tell GuardEngine what you're looking for." });
      navigate({ to: "/onboarding/$paperId", params: { paperId: paper.id } });
    } catch (e) {
      toast.error("Upload failed", { description: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setUploading(false);
    }
  }, [navigate, queryClient]);

  async function openPaper(p: Paper) {
    if (!p.persona) {
      navigate({ to: "/onboarding/$paperId", params: { paperId: p.id } });
      return;
    }
    // find or create session
    const { data: existing } = await supabase
      .from("chat_sessions")
      .select("id")
      .eq("paper_id", p.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      navigate({ to: "/chat/$sessionId", params: { sessionId: existing.id } });
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const { data: created, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: userData.user!.id, paper_id: p.id, title: p.title })
      .select("id")
      .single();
    if (error) {
      toast.error("Couldn't open chat", { description: error.message });
      return;
    }
    navigate({ to: "/chat/$sessionId", params: { sessionId: created.id } });
  }

  const sidebar = (
    <div className="flex flex-col gap-1">
      <Button
        onClick={() => inputRef.current?.click()}
        className="mb-3 w-full justify-start"
        disabled={uploading}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Upload new paper
      </Button>
      <div className="px-2 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Your library
      </div>
      {isLoading ? (
        <div className="space-y-2 px-1">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : papers && papers.length > 0 ? (
        papers.map((p) => (
          <button
            key={p.id}
            onClick={() => openPaper(p)}
            className="group flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-sidebar-accent"
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
            <div className="min-w-0 flex-1">
              <div className="truncate">{p.title}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {p.persona ? "ready" : p.status}
              </div>
            </div>
          </button>
        ))
      ) : (
        <div className="px-2 py-6 text-xs text-muted-foreground">
          No papers yet. Drag a PDF in →
        </div>
      )}
    </div>
  );

  return (
    <AppShell sidebar={sidebar}>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your papers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a PDF and chat with it — every answer is verified before you see it.
            </p>
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={cn(
            "relative grid place-items-center rounded-2xl border-2 border-dashed bg-surface/40 px-6 py-16 text-center transition-all",
            dragOver
              ? "border-primary/60 bg-primary/5 ring-glow"
              : "border-border hover:border-primary/40",
          )}
        >
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-primary/40 bg-primary/10 ring-glow">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-5 text-lg font-semibold">Drop a research PDF here</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            We'll index it, ask 4 quick questions to tune the guardrails, then open a verified chat.
          </p>
          <Button
            onClick={() => inputRef.current?.click()}
            className="mt-5"
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Choose PDF"}
          </Button>
        </div>

        {papers && papers.length > 0 && (
          <div className="mt-10">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Recent</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {papers.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  onClick={() => openPaper(p)}
                  className="group flex items-start gap-3 rounded-xl border border-border bg-surface/60 p-4 text-left transition-all hover:border-primary/40 hover:bg-surface"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-background">
                    {p.persona ? (
                      <Sparkles className="h-4 w-4 text-primary" />
                    ) : (
                      <FileWarning className="h-4 w-4 text-warning" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {p.persona ? "Ready to chat" : "Needs onboarding"}
                    </div>
                  </div>
                  <ArrowRight className="mt-2 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              ))}
            </div>
          </div>
        )}

        {!isLoading && papers && papers.length === 0 && (
          <div className="mt-10 rounded-xl border border-border bg-surface/40 p-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="text-primary hover:underline">Read about the pipeline</Link> while you find a PDF.
          </div>
        )}
      </div>
    </AppShell>
  );
}
