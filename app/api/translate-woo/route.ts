import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY || "sk-9011d468ebed4d28be7eeda8b1232ba1",
});

interface WooContent {
  title: string;
  short_description: string;
  long_description: string;
  meta_title: string;
  meta_description: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wooContent, targetLanguage, targetCode, productName } = body as {
      wooContent: WooContent;
      targetLanguage: string;
      targetCode: string;
      productName: string;
    };

    if (!wooContent || !targetLanguage || !targetCode) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const promptText = `You are a professional translator specialising in automotive e-commerce. Translate this WooCommerce product listing from English to ${targetLanguage}. Maintain SEO optimisation, use native automotive terminology, and adapt the content naturally for ${targetLanguage}-speaking markets.

Product: ${productName}

English content to translate:
${JSON.stringify(wooContent, null, 2)}

Return ONLY valid JSON with the exact same structure (title, short_description, long_description, meta_title, meta_description). No markdown, no code blocks, no explanation — just the raw JSON object.`;

    const message = await client.chat.completions.create({
      model: "deepseek-chat",
      max_tokens: 4096,
      messages: [{ role: "user", content: promptText }],
    });

    const responseText = message.choices[0]?.message?.content || "";

    let parsed: WooContent;
    try {
      let jsonText = responseText.trim();
      jsonText = jsonText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
      const start = jsonText.indexOf("{");
      const end = jsonText.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        jsonText = jsonText.slice(start, end + 1);
      }
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error("Failed to parse translation response as JSON");
    }

    return NextResponse.json({ success: true, data: parsed, langCode: targetCode });
  } catch (error) {
    console.error("Translate WooCommerce API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
