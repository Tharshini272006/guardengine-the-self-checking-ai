import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DotField } from "@/components/DotField";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding/$paperId")({
  head: () => ({ meta: [{ title: "Tune your assistant — GuardEngine" }] }),
  component: Onboarding,
});

interface Question {
  key: "goal" | "depth" | "background" | "priority_sections";
  prompt: string;
  options: string[];
}

const QUESTIONS: Question[] = [
  {
    key: "goal",
    prompt: "What's your goal with this paper?",
    options: ["Extract results", "Understand concepts", "Implementation details"],
  },
  {
    key: "depth",
    prompt: "How deep should answers go?",
    options: ["Quick summary", "Detailed", "Technical precision"],
  },
  {
    key: "background",
    prompt: "What's your background?",
    options: ["Beginner", "Intermediate", "Expert"],
  },
  {
    key: "priority_sections",
    prompt: "Which sections matter most?",
    options: ["Abstract", "Methodology", "Results", "All"],
  },
];

function Onboarding() {
  const { paperId } = Route.useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [paperTitle, setPaperTitle] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("papers")
        .select("title, persona")
        .eq("id", paperId)
        .maybeSingle();
      if (error || !data) {
        toast.error("Paper not found");
        navigate({ to: "/dashboard" });
        return;
      }
      setPaperTitle(data.title);
      if (data.persona) {
        // already onboarded — skip to chat
        const { data: session } = await supabase
          .from("chat_sessions")
          .select("id")
          .eq("paper_id", paperId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (session) {
          navigate({ to: "/chat/$sessionId", params: { sessionId: session.id } });
        }
      }
    })();
  }, [paperId, navigate]);

  const messages = useMemo(() => {
    const out: { who: "ai" | "you"; text: string }[] = [
      {
        who: "ai",
        text: `Got it — "${paperTitle || "your paper"}" is uploading. Four quick questions to tune the guardrails.`,
      },
    ];
    for (let i = 0; i <= step && i < QUESTIONS.length; i++) {
      out.push({ who: "ai", text: QUESTIONS[i].prompt });
      const a = answers[QUESTIONS[i].key];
      if (a) out.push({ who: "you", text: a });
    }
    return out;
  }, [step, answers, paperTitle]);

  async function pick(opt: string) {
    const q = QUESTIONS[step];
    const next = { ...answers, [q.key]: opt };
    setAnswers(next);

    if (step < QUESTIONS.length - 1) {
      setTimeout(() => setStep(step + 1), 280);
      return;
    }

    // finished
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user!.id;

    const { error: upErr } = await supabase
      .from("papers")
      .update({ persona: next, status: "ready" })
      .eq("id", paperId);
    if (upErr) {
      setSaving(false);
      toast.error("Couldn't save preferences", { description: upErr.message });
      return;
    }
    const { data: session, error: sErr } = await supabase
      .from("chat_sessions")
      .insert({ user_id: userId, paper_id: paperId, title: paperTitle || "Chat" })
      .select("id")
      .single();
    setSaving(false);
    if (sErr) {
      toast.error("Couldn't start chat", { description: sErr.message });
      return;
    }
    navigate({ to: "/chat/$sessionId", params: { sessionId: session.id } });
  }

  const currentQ = QUESTIONS[step];

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <DotField baseOpacity={0.15} />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8 sm:py-12">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg border border-primary/40 bg-primary/10 ring-glow">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">Tune your assistant</div>
            <div className="text-xs text-muted-foreground">{step + 1} of {QUESTIONS.length}</div>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-surface/50 p-4 backdrop-blur sm:p-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                m.who === "ai"
                  ? "border border-border bg-background/80 text-foreground"
                  : "ml-auto bg-primary text-primary-foreground",
              )}
            >
              {m.text}
            </div>
          ))}
          {saving && (
            <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving preferences…
            </div>
          )}
        </div>

        {!saving && currentQ && !answers[currentQ.key] && (
          <div className="mt-4 flex flex-wrap gap-2">
            {currentQ.options.map((opt) => (
              <Button
                key={opt}
                variant="outline"
                onClick={() => pick(opt)}
                className="rounded-full"
              >
                {opt}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
