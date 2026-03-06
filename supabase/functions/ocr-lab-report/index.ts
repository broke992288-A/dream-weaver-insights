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

    const systemPrompt = `You are an expert medical laboratory report OCR system. Your job is to extract lab values from report images with high accuracy.

STEP 1 — LAYOUT DETECTION:
Identify the report layout: table-based (columns: Test Name | Result | Unit | Reference Range) or free-form text. Parse accordingly.

STEP 2 — MULTILINGUAL TEST NAME NORMALIZATION:
Recognize test names in English, Russian, and Uzbek. Map them to canonical keys:

Hemoglobin / Гемоглобин / Gemoglobin / Hb / HGB → hb
WBC / Лейкоциты / Лейкоцитлар / TLC → tlc
Platelets / Тромбоциты / Тромбоцитлар / PLT → platelets
PTI / ПТИ / Протромбин индекси → pti
INR / МНО → inr
Total Bilirubin / Общий билирубин / Умумий билирубин / T.Bil → total_bilirubin
Direct Bilirubin / Прямой билирубин / Тўғридан-тўғри билирубин / D.Bil → direct_bilirubin
AST / SGOT / АСТ / АСАТ → ast
ALT / SGPT / АЛТ / АЛАТ → alt
ALP / Alkaline Phosphatase / ЩФ / Ишқорий фосфатаза → alp
GGT / Gamma GT / ГГТ → ggt
Total Protein / Общий белок / Умумий оқсил / TP → total_protein
Albumin / Альбумин / Alb → albumin
Urea / BUN / Мочевина / Сийдик кислотаси → urea
Creatinine / Креатинин / Cr → creatinine
eGFR / GFR / СКФ → egfr
Sodium / Натрий / Na → sodium
Potassium / Калий / K → potassium
Calcium / Кальций / Ca → calcium
Magnesium / Магний / Mg → magnesium
Phosphorus / Фосфор / Phosphate / P → phosphorus
Uric Acid / Мочевая кислота / UA → uric_acid
CRP / C-Reactive Protein / СРБ → crp
ESR / СОЭ / ЭЧТ / Sed Rate → esr
LDH / ЛДГ / Lactate Dehydrogenase → ldh
Ammonia / Аммиак / NH3 → ammonia
Tacrolimus / FK506 / Такролимус → tacrolimus_level
Cyclosporine / Циклоспорин / CsA → cyclosporine
Proteinuria / Протеинурия / Protein in urine → proteinuria

STEP 3 — VALUE EXTRACTION:
- Extract the numeric result value for each detected test
- If a value has units like µmol/L, mg/dL, etc., note the unit
- Convert to standard units when possible (e.g. creatinine in µmol/L → divide by 88.4 for mg/dL)

STEP 4 — CONFIDENCE SCORING:
For each extracted value, assign a confidence score (0-100):
- 95-100: Clear, unambiguous value
- 80-94: Readable but slightly unclear (e.g. faint print, minor smudge)
- 60-79: Partially readable, may need verification
- <60: Very unclear, likely incorrect

Use the tool "extract_lab_values" to return results.`;

    const mediaType = fileType === "pdf" ? "application/pdf" :
                      fileType === "png" ? "image/png" : "image/jpeg";

    // Build per-marker properties for tool calling schema
    const markerProperties: Record<string, any> = {};
    for (const key of LAB_MARKERS) {
      markerProperties[key] = {
        type: "object",
        properties: {
          value: { type: ["number", "null"], description: "Extracted numeric value or null if not found" },
          confidence: { type: "number", description: "Confidence score 0-100" },
          original_text: { type: "string", description: "Original text as seen in report" },
        },
        required: ["value", "confidence"],
        additionalProperties: false,
      };
    }

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
              { type: "text", text: "Extract all lab values from this laboratory report. Detect the layout, normalize test names across languages (English, Russian, Uzbek), and provide confidence scores for each value." },
              { type: "image_url", image_url: { url: `data:${mediaType};base64,${imageBase64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_lab_values",
              description: "Return structured lab values with confidence scores extracted from the report.",
              parameters: {
                type: "object",
                properties: {
                  report_type: { type: "string", enum: ["table", "freeform", "mixed"], description: "Detected layout type" },
                  markers: {
                    type: "object",
                    properties: markerProperties,
                    additionalProperties: false,
                  },
                },
                required: ["report_type", "markers"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_lab_values" } },
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

    // Extract from tool call response
    let extracted: any = {};
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        extracted = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
        throw new Error("Could not parse lab values from image");
      }
    } else {
      // Fallback: try parsing content directly
      const content = aiData.choices?.[0]?.message?.content ?? "";
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) extracted = { markers: JSON.parse(jsonMatch[0]) };
      } catch {
        console.error("Failed to parse AI response:", content);
        throw new Error("Could not parse lab values from image");
      }
    }

    const markers = extracted.markers ?? {};

    // Build result with values and confidence
    const data: Record<string, number | null> = {};
    const confidence: Record<string, number> = {};
    const originalText: Record<string, string> = {};

    for (const key of LAB_MARKERS) {
      const entry = markers[key];
      if (entry && typeof entry === "object") {
        data[key] = typeof entry.value === "number" ? entry.value : null;
        confidence[key] = typeof entry.confidence === "number" ? entry.confidence : 0;
        if (entry.original_text) originalText[key] = entry.original_text;
      } else if (typeof entry === "number") {
        data[key] = entry;
        confidence[key] = 90;
      } else {
        data[key] = null;
        confidence[key] = 0;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data,
      confidence,
      originalText,
      reportType: extracted.report_type ?? "unknown",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OCR error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
