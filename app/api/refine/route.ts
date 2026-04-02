import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY || "sk-9011d468ebed4d28be7eeda8b1232ba1",
});

function parseJsonSafe(text: string): unknown {
  let jsonText = text.trim();
  jsonText = jsonText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    jsonText = jsonText.slice(start, end + 1);
  }
  try {
    return JSON.parse(jsonText);
  } catch {
    const fixed = jsonText.replace(/[\x00-\x1F\x7F]/g, (char) => {
      if (char === "\n") return "\\n";
      if (char === "\r") return "\\r";
      if (char === "\t") return "\\t";
      return "";
    });
    return JSON.parse(fixed);
  }
}

const refinementPrompts: Record<string, string> = {
  engaging:
    "Rewrite this listing to be more emotionally engaging and compelling. Use power words, create desire, make the reader excited about the upgrade. Keep all factual information accurate.",
  professional:
    "Rewrite this listing in a formal, authoritative, professional tone suitable for B2B buyers and trade customers. Focus on specifications, reliability, and business value.",
  seo: "Optimise this listing for Google and Bing SEO. Improve keyword density naturally, use semantic variations, include long-tail keywords. Do not keyword-stuff — keep it readable.",
  ai_search:
    "Optimise this listing for AI search engines like ChatGPT Shopping, Perplexity, and Google AI Overviews. Structure content to directly answer common buyer questions. Use conversational language. Include comparison context. Format for featured snippet eligibility.",
  concise:
    "Rewrite this listing to be tight and concise. Remove all filler words, redundancy, and marketing fluff. Every word must earn its place. Keep only the most important information.",
  rufus:
    "Optimise this Amazon listing specifically for Amazon Rufus AI. Rufus answers customer questions like 'Is this compatible with my 2015 BMW 3 Series?' and 'Does it support wireless CarPlay?'. Rewrite bullets to directly answer the most common compatibility and feature questions. Use question-answer style where possible. Include specific year ranges and model compatibility clearly. Add comparison language where appropriate ('works better than factory unit', 'replaces OEM screen').",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      platform,
      currentContent,
      refinementType,
      customPrompt,
      productContext,
    } = body;

    if (!platform || !currentContent || !refinementType) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: platform, currentContent, refinementType" },
        { status: 400 }
      );
    }

    const instruction =
      refinementType === "custom" && customPrompt
        ? customPrompt
        : refinementPrompts[refinementType];

    if (!instruction) {
      return NextResponse.json(
        { success: false, error: `Unknown refinementType: ${refinementType}` },
        { status: 400 }
      );
    }

    const contextStr = productContext
      ? `Product context:
- Name: ${productContext.productName || ""}
- Category: ${productContext.category || ""}
- Compatible cars: ${productContext.compatibleCars || ""}
- Key features: ${productContext.keyFeatures || ""}

`
      : "";

    const prompt = `You are an expert e-commerce copywriter for XTRONS automotive electronics.

${contextStr}Refinement instruction: ${instruction}

Here is the current ${platform} listing content:
${JSON.stringify(currentContent, null, 2)}

Rewrite and return the refined version of this content in EXACTLY the same JSON structure and field names. Keep all fields present. Return ONLY the raw JSON object, no markdown, no explanation.`;

    const message = await client.chat.completions.create({
      model: "deepseek-chat",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.choices[0]?.message?.content || "";

    const refined = parseJsonSafe(responseText);
    return NextResponse.json({ success: true, data: refined });
  } catch (error) {
    console.error("Refine API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
