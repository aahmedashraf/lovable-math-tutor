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

    // Check if document is a PDF (Gemini vision API doesn't support PDFs directly)
    const isPdf = documentUrl?.toLowerCase().endsWith('.pdf');
    
    // For PDF documents with figure-based questions, we cannot grade accurately
    const cannotGradeAccurately = hasFigure && isPdf;

    // Build messages for AI
    const messages: any[] = [
      {
        role: "system",
        content: cannotGradeAccurately 
          ? `You are an expert math teacher providing feedback on student answers.

IMPORTANT: This question references a figure/chart/table/graph that you CANNOT see (it's in a PDF document).

Your task:
1. Review the student's methodology and approach based on what you can understand from the question text
2. Provide encouraging, helpful feedback WITHOUT marking as right or wrong
3. Comment on whether the approach/format seems reasonable
4. Remind the student to verify their answer against the figure in the original document

Rules:
- Do NOT mark as correct or incorrect since you cannot verify against the figure
- Be supportive and constructive
- Focus on the problem-solving approach
- Keep feedback to 2-3 sentences

Respond in this exact JSON format:
{
  "cannotGrade": true,
  "feedback": "Your feedback here. Remember to tell them to check their answer against the figure in the original document."
}`
          : `You are an expert math teacher evaluating student answers. 

Your task:
1. Determine if the student's answer is CORRECT or INCORRECT
2. Provide brief, encouraging feedback WITHOUT revealing the full solution

Rules:
- Be encouraging but honest
- If incorrect, give a hint about where they went wrong
- Do NOT give away the answer
- Keep feedback to 1-2 sentences max

Respond in this exact JSON format:
{
  "isCorrect": true or false,
  "feedback": "Your brief feedback here"
}`
      }
    ];

    // Only use multimodal for non-PDF image documents that have figures
    if (hasFigure && documentUrl && !isPdf) {
      console.log("Using multimodal evaluation with image document:", documentUrl);
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Question: ${questionText}

Student's Answer: ${studentAnswer}

The question may reference a figure, chart, or table from the document. Please look at the attached image to understand the visual context when evaluating the answer.

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
      console.log(cannotGradeAccurately 
        ? "Using lenient evaluation (PDF with figures - cannot grade accurately)" 
        : "Using text-only evaluation");
      messages.push({
        role: "user",
        content: `Question: ${questionText}

Student's Answer: ${studentAnswer}
${cannotGradeAccurately ? "\nNote: This question references a figure/chart/table from a PDF document that you cannot see. Provide helpful feedback on their approach without marking right or wrong." : ""}

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
    let evaluation: { isCorrect?: boolean; cannotGrade?: boolean; feedback: string } = { 
      feedback: "Unable to evaluate answer." 
    };
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

    // Determine the final result
    const isCorrect = evaluation.cannotGrade ? null : (evaluation.isCorrect ?? false);

    // Update the student answer with evaluation results
    const { error: updateError } = await supabase
      .from("student_answers")
      .update({
        is_correct: isCorrect,
        feedback: evaluation.feedback,
      })
      .eq("id", answerId);

    if (updateError) {
      console.error("Error updating answer:", updateError);
      throw updateError;
    }

    console.log("Answer evaluated successfully", evaluation.cannotGrade ? "(cannot grade - figure reference)" : "");

    return new Response(
      JSON.stringify({
        success: true,
        isCorrect: isCorrect,
        cannotGrade: evaluation.cannotGrade || false,
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
