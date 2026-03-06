import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LAB_MARKERS = [
  "hb", "tlc", "platelets", "pti", "inr",
  "total_bilirubin", "direct_bilirubin", "ast", "alt", "alp", "ggt",
  "total_protein", "albumin", "urea", "creatinine", "egfr",
  "sodium", "potassium", "calcium", "magnesium", "phosphorus",
  "uric_acid", "crp", "esr", "ldh", "ammonia",
  "tacrolimus_level", "cyclosporine", "proteinuria",
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { imageBase64, fileType } = await req.json();
    if (!imageBase64) throw new Error("No image data provided");

    const systemPrompt = `You are a medical lab report OCR extractor. Extract numerical lab values from the provided image.
Return ONLY a JSON object with these exact keys (use null for values not found):
${JSON.stringify(LAB_MARKERS)}

Map common names:
- Hemoglobin/Hb/HGB → hb
- WBC/White Blood Cells/TLC → tlc  
- PLT/Platelet Count → platelets
- PT/Prothrombin Time Index → pti
- INR → inr
- Total Bilirubin/T.Bil → total_bilirubin
- Direct Bilirubin/D.Bil → direct_bilirubin
- SGOT/AST → ast
- SGPT/ALT → alt
- ALP/Alkaline Phosphatase → alp
- GGT/Gamma GT → ggt
- Total Protein/TP → total_protein
- Albumin/Alb → albumin
- BUN/Urea → urea
- Creatinine/Cr → creatinine
- eGFR/GFR → egfr
- Na/Sodium → sodium
- K/Potassium → potassium
- Ca/Calcium → calcium
- Mg/Magnesium → magnesium
- P/Phosphorus/Phosphate → phosphorus
- Uric Acid/UA → uric_acid
- CRP/C-Reactive Protein → crp
- ESR/Sed Rate → esr
- LDH/Lactate Dehydrogenase → ldh
- Ammonia/NH3 → ammonia
- FK506/Tacrolimus → tacrolimus_level
- Cyclosporine/CsA → cyclosporine
- Proteinuria/Protein in urine → proteinuria

Return ONLY valid JSON. No markdown, no explanation.`;

    const mediaType = fileType === "pdf" ? "application/pdf" : 
                      fileType === "png" ? "image/png" : "image/jpeg";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all lab values from this report image. Return only JSON." },
              { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content ?? "";
    
    // Parse JSON from response, handling potential markdown wrapping
    let extracted: Record<string, number | null> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Could not parse lab values from image");
    }

    // Ensure all markers present
    const result: Record<string, number | null> = {};
    for (const key of LAB_MARKERS) {
      const val = extracted[key];
      result[key] = typeof val === "number" ? val : null;
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OCR error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
