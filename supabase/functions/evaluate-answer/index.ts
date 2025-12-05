import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionId, questionText, studentAnswer, answerId, documentUrl } = await req.json();
    console.log(`Evaluating answer for question: ${questionId}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if question references figures/charts/tables
    const hasFigure = questionText.toLowerCase().includes("[see figure") || 
                      questionText.toLowerCase().includes("figure") ||
                      questionText.toLowerCase().includes("chart") ||
                      questionText.toLowerCase().includes("graph") ||
                      questionText.toLowerCase().includes("diagram") ||
                      questionText.toLowerCase().includes("table");

    // Build messages for AI - use multimodal if we have a document with figures
    const messages: any[] = [
      {
        role: "system",
        content: `You are an expert math teacher evaluating student answers. 

Your task:
1. Determine if the student's answer is CORRECT or INCORRECT
2. Provide brief, encouraging feedback WITHOUT revealing the full solution

Rules:
- Be encouraging but honest
- If incorrect, give a hint about where they went wrong
- Do NOT give away the answer
- Keep feedback to 1-2 sentences max
- If the question references a figure, chart, graph, or table, and you can see the document, use that visual information to evaluate the answer

Respond in this exact JSON format:
{
  "isCorrect": true or false,
  "feedback": "Your brief feedback here"
}`
      }
    ];

    // If there's a document with figures, use multimodal approach
    if (hasFigure && documentUrl) {
      console.log("Using multimodal evaluation with document:", documentUrl);
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Question: ${questionText}

Student's Answer: ${studentAnswer}

The question may reference a figure, chart, or table from the document. Please look at the attached document to understand the visual context when evaluating the answer.

Evaluate this answer and respond with JSON only.`
          },
          {
            type: "image_url",
            image_url: {
              url: documentUrl
            }
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: `Question: ${questionText}

Student's Answer: ${studentAnswer}

Evaluate this answer and respond with JSON only.`
      });
    }

    // Use Gemini for evaluation (supports multimodal)
    const evaluationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!evaluationResponse.ok) {
      const errorText = await evaluationResponse.text();
      console.error("Evaluation API error:", evaluationResponse.status, errorText);
      
      if (evaluationResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (evaluationResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Evaluation API error: ${evaluationResponse.status}`);
    }

    const evalData = await evaluationResponse.json();
    const responseText = evalData.choices?.[0]?.message?.content || "";
    console.log("Evaluation response:", responseText);

    // Parse the evaluation result
    let evaluation = { isCorrect: false, feedback: "Unable to evaluate answer." };
    try {
      let cleanedText = responseText.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.slice(7);
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.slice(0, -3);
      }
      evaluation = JSON.parse(cleanedText.trim());
    } catch (parseError) {
      console.error("Failed to parse evaluation:", parseError);
    }

    // Update the student answer with evaluation results
    const { error: updateError } = await supabase
      .from("student_answers")
      .update({
        is_correct: evaluation.isCorrect,
        feedback: evaluation.feedback,
      })
      .eq("id", answerId);

    if (updateError) {
      console.error("Error updating answer:", updateError);
      throw updateError;
    }

    console.log("Answer evaluated successfully");

    return new Response(
      JSON.stringify({
        success: true,
        isCorrect: evaluation.isCorrect,
        feedback: evaluation.feedback,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in evaluate-answer function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
