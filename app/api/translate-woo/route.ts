import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
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

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      messages: [{ role: "user", content: promptText }],
    });

    const responseContent = message.content[0];
    if (responseContent.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    let parsed: WooContent;
    try {
      let jsonText = responseContent.text.trim();
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
