import { createFileRoute, Link } from "@tanstack/react-router";
import { DotField } from "@/components/DotField";
import { Button } from "@/components/ui/button";
import { ShieldCheck, GitBranch, Activity, CheckCircle2, XCircle, RotateCcw, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GuardEngine — Autonomous Runtime Guardrails for RAG" },
      { name: "description", content: "AI that checks itself before it speaks. Upload research papers and chat with an AI whose every answer is verified for faithfulness, relevancy, and grounding." },
      { property: "og:title", content: "GuardEngine — Autonomous Runtime Guardrails for RAG" },
      { property: "og:description", content: "AI that checks itself before it speaks." },
    ],
  }),
  component: Landing,
});

const PIPELINE = [
  { label: "Query", icon: GitBranch },
  { label: "Validate", icon: ShieldCheck },
  { label: "Retrieve", icon: Activity },
  { label: "Generate", icon: GitBranch },
  { label: "Judge", icon: ShieldCheck },
  { label: "Router", icon: GitBranch },
  { label: "Answer", icon: CheckCircle2 },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <DotField />
      <div className="relative z-10">
        <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg border border-primary/40 bg-primary/10 ring-glow">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold tracking-tight">GuardEngine</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
            <Button asChild size="sm">
              <Link to="/login">Try Live Demo</Link>
            </Button>
          </nav>
        </header>

        <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Runtime guardrails for Retrieval-Augmented Generation
          </div>
          <h1 className="mt-6 text-balance text-5xl font-semibold tracking-tight sm:text-7xl">
            AI that <span className="text-gradient">checks itself</span><br className="hidden sm:block" /> before it speaks.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            Upload research papers and chat with an AI whose every answer is judged for
            faithfulness, relevancy, and grounding — and silently retried until it passes.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Button asChild size="lg" className="ring-glow">
              <Link to="/login">
                Try Live Demo <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#pipeline">See how it works</a>
            </Button>
          </div>
        </section>

        <section id="pipeline" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="rounded-2xl border border-border bg-surface/50 p-6 backdrop-blur sm:p-10 ring-glow-soft">
            <h2 className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
              The verification pipeline
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {PIPELINE.map((s, i) => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-2">
                    <div className="grid h-12 w-12 place-items-center rounded-xl border border-primary/30 bg-primary/10">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-foreground/90">{s.label}</span>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className="h-px w-6 bg-gradient-to-r from-primary/50 to-accent/40 sm:w-10" />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-success/30 bg-success/10 p-4">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" /> <span className="text-sm font-medium">PASS</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">All scores ≥ 0.7 — answer is shown to the user.</p>
              </div>
              <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
                <div className="flex items-center gap-2 text-warning">
                  <RotateCcw className="h-4 w-4" /> <span className="text-sm font-medium">RETRY</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Query is silently rewritten and re-judged.</p>
              </div>
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" /> <span className="text-sm font-medium">FAIL</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">User sees the failure reason — never a hallucination.</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} GuardEngine · Verification grid for trustworthy AI
        </footer>
      </div>
    </div>
  );
}
