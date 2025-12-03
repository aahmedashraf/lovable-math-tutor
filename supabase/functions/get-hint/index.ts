import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionText, previousHints = [] } = await req.json();
    console.log(`Getting hint for question, previous hints count: ${previousHints.length}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const previousHintsContext = previousHints.length > 0
      ? `\n\nPrevious hints already given:\n${previousHints.map((h: string, i: number) => `${i + 1}. ${h}`).join('\n')}`
      : "";

    // Use LLM to generate a hint
    const hintResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a helpful math tutor providing hints to students.

Your task:
1. Provide a helpful hint that guides the student toward solving the problem
2. Do NOT give away the final answer
3. Focus on the approach, method, or first steps
4. Be encouraging and supportive
5. If previous hints were given, provide a NEW, more specific hint

Rules:
- Keep hints concise (1-3 sentences)
- Suggest what concept or formula to consider
- Point out what to look for or identify first
- Never reveal the complete solution${previousHintsContext}`
          },
          {
            role: "user",
            content: `Question: ${questionText}

Please provide a helpful hint (without giving the answer) to help me approach this problem.`
          }
        ],
      }),
    });

    if (!hintResponse.ok) {
      const errorText = await hintResponse.text();
      console.error("Hint API error:", hintResponse.status, errorText);
      
      if (hintResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (hintResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Hint API error: ${hintResponse.status}`);
    }

    const hintData = await hintResponse.json();
    const hint = hintData.choices?.[0]?.message?.content || "Try breaking down the problem into smaller steps.";
    console.log("Hint generated:", hint);

    return new Response(
      JSON.stringify({
        success: true,
        hint: hint.trim(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-hint function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
