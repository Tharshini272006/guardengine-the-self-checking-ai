// Mock RAG verification pipeline.
// Replace this with the real FastAPI + LangGraph backend later — the
// request/response shape is documented in `process-query/README.md`.

interface RequestBody {
  session_id?: string;
  query?: string;
  paper_id?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function rand(min: number, max: number) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const query = body.query ?? "";

    // Pretend we ran a pipeline
    await new Promise((r) => setTimeout(r, 2000));

    const retry = Math.random() < 0.25 ? 1 : 0;
    const faithfulness = retry ? rand(0.72, 0.9) : rand(0.85, 0.97);
    const relevancy = retry ? rand(0.7, 0.88) : rand(0.82, 0.96);
    const precision = rand(0.7, 0.95);

    const history: Array<{ stage: string; query: string }> = [
      { stage: "original", query },
    ];
    const failures: Array<{ stage: string; reason: string }> = [];
    if (retry) {
      history.push({
        stage: "rewrite_1",
        query: `${query} (clarified: focus on key results and quantitative findings)`,
      });
      failures.push({
        stage: "judge",
        reason: "First-pass answer lacked grounded citations; retried with reformulated query.",
      });
    }

    const answer =
      `Based on the paper, here's what I found regarding "${query}":\n\n` +
      `This is a mocked response from the placeholder GuardEngine edge function. ` +
      `Connect your FastAPI + LangGraph backend to replace this with the real verified pipeline output. ` +
      (retry
        ? `The initial draft was rejected by the judge step, so a refined query was issued and re-verified.`
        : `All guardrail checks passed on the first attempt.`);

    return new Response(
      JSON.stringify({
        answer,
        faithfulness_score: faithfulness,
        relevancy_score: relevancy,
        context_precision_score: precision,
        retry_count: retry,
        status: "verified",
        query_history: history,
        failure_reasons: failures,
        latency_ms: 2000 + Math.round(Math.random() * 400),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
