import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId, fileUrl, filename } = await req.json();
    console.log(`Processing document: ${filename}, ID: ${documentId}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the file content
    console.log(`Fetching file from: ${fileUrl}`);
    const fileResponse = await fetch(fileUrl);
    
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    const fileBlob = await fileResponse.blob();
    const base64Content = await blobToBase64(fileBlob);
    
    console.log(`File fetched, size: ${fileBlob.size} bytes`);

    // Use Gemini vision model for OCR with the image
    const ocrResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `You are an expert OCR system specialized in extracting math questions from exam papers and worksheets.

Your task: Extract ALL math questions from the provided document image(s) with EXTREME precision.

Return a JSON array with this exact format:
[
  {"number": "1a", "text": "Full question text here"},
  {"number": "1b", "text": "Next sub-question..."},
  {"number": "2", "text": "Question 2..."}
]

CRITICAL RULES FOR ACCURACY:

1. QUESTION NUMBERING:
   - Use the EXACT numbering from the document (e.g., "1", "1a", "1b", "2i", "2ii", "3(i)", "3(ii)")
   - Each sub-question (a, b, c OR i, ii, iii OR (i), (ii), (iii)) MUST be a SEPARATE entry
   - DO NOT combine sub-questions into one entry
   - DO NOT include the question number inside the question text

2. MATHEMATICAL NOTATION - BE EXTREMELY CAREFUL:
   - Powers: Use ^ notation (e.g., x^2, 10^5, y^(-3))
   - Fractions: Use / notation (e.g., 3/4, x/y)
   - Square roots: sqrt(x)
   - Negative numbers: Preserve negative signs EXACTLY (e.g., -6, not 6)
   - Inequalities: Use exact symbols (<=, >=, <, >, ≤, ≥)
   - Vectors: Use column notation like (x, y) or describe as "vector with components x and y"
   - Exponents: Double-check the exact value (10^5 is NOT the same as 10^7)

3. TABLES, CHARTS, FIGURES, AND DIAGRAMS:
   - If a question references a table, chart, graph, or diagram, include "[See figure in original document]" at the START of the question
   - Describe the key data from tables in the question text (e.g., "The table shows: Row 1: Male, Europe: 8, Africa: 5...")
   - For bar charts/graphs, describe the visible values

4. TEXT ACCURACY:
   - Copy text EXACTLY as written - do not paraphrase
   - Preserve all given information (measurements, values, names)
   - Include any context provided before the actual question

5. COMMON ERRORS TO AVOID:
   - Do NOT change negative numbers to positive
   - Do NOT change exponent values
   - Do NOT merge separate sub-questions
   - Do NOT include question numbers in the question text itself
   - Do NOT skip questions with images/diagrams - describe what's needed instead

ONLY return valid JSON, no other text or markdown.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract all math questions from this document. Each sub-question (a/b/c or i/ii/iii) must be separate. Be EXTREMELY careful with negative signs, exponents, and inequality symbols. Return ONLY a JSON array."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${fileBlob.type};base64,${base64Content}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!ocrResponse.ok) {
      const errorText = await ocrResponse.text();
      console.error("OCR API error:", ocrResponse.status, errorText);
      
      if (ocrResponse.status === 429) {
        await supabase.from("documents").update({ status: "failed" }).eq("id", documentId);
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`OCR API error: ${ocrResponse.status}`);
    }

    const ocrData = await ocrResponse.json();
    const extractedText = ocrData.choices?.[0]?.message?.content || "[]";
    console.log("OCR response:", extractedText);

    // Parse the extracted questions
    let questions: Array<{ number: string; text: string }> = [];
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedText = extractedText.trim();
      if (cleanedText.startsWith("```json")) {
        cleanedText = cleanedText.slice(7);
      } else if (cleanedText.startsWith("```")) {
        cleanedText = cleanedText.slice(3);
      }
      if (cleanedText.endsWith("```")) {
        cleanedText = cleanedText.slice(0, -3);
      }
      questions = JSON.parse(cleanedText.trim());
    } catch (parseError) {
      console.error("Failed to parse OCR response:", parseError);
      questions = [];
    }

    console.log(`Extracted ${questions.length} questions`);

    // Insert questions into database
    if (questions.length > 0) {
      const questionRows = questions.map((q) => ({
        document_id: documentId,
        question_number: q.number,
        question_text: q.text,
      }));

      const { error: insertError } = await supabase
        .from("questions")
        .insert(questionRows);

      if (insertError) {
        console.error("Error inserting questions:", insertError);
        throw insertError;
      }
    }

    // Update document status to completed
    const { error: updateError } = await supabase
      .from("documents")
      .update({ status: "completed" })
      .eq("id", documentId);

    if (updateError) {
      console.error("Error updating document status:", updateError);
      throw updateError;
    }

    console.log("Document processing completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        questionsCount: questions.length,
        questions: questions 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-document function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
