import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ImageInput {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productName,
      sku,
      category,
      keyFeatures,
      compatibleCars,
      screenSize,
      ramRom,
      price,
      shortDescription,
      sellingPoints,
      language = "EN",
      images = [] as ImageInput[],
    } = body;

    const hasImages = images && images.length > 0;

    const promptText = `You are an expert e-commerce copywriter and SEO specialist for automotive electronics.
Generate optimised listings for this XTRONS product for all platforms.

Product: ${productName}
SKU: ${sku}
Category: ${category}
Features: ${keyFeatures}
Compatible Cars: ${compatibleCars}
${screenSize ? `Screen Size: ${screenSize}` : ""}
${ramRom ? `RAM/ROM: ${ramRom}` : ""}
Price: £${price}
Description: ${shortDescription}
Selling Points: ${sellingPoints}
${hasImages ? "\nProduct images provided — analyse them to extract visible features, text, design details." : ""}

Return ONLY a raw JSON object (no markdown, no code blocks, no explanation). Use this exact structure:
{"amazon":{"title":"","bullets":["","","","",""],"keywords":"","description":""},"ebay":{"title":"","description":"","specifics":{"Brand":"XTRONS","Model":"","Compatibility":"","Screen Size":"","Connectivity":""}},"aliexpress":{"title":"","description":""},"yahoo_jp":{"title":"","description":""},"rakuten":{"title":"","description":""},"woocommerce":{"title":"","short_description":"","long_description":"","meta_title":"","meta_description":""},"facebook":{"post":""},"youtube":{"title":"","description":"","tags":"","script_outline":""},"twitter":{"thread":["","",""]},"line":{"message":""},"reddit":{"title":"","body":""},"ai_recommendation":{"suggestions":["","",""],"blurb":""}}

Rules:
- Amazon title: max 200 chars, include car model, features, XTRONS brand
- eBay title: max 80 chars
- Amazon bullets: exactly 5, each starting with ALL CAPS key benefit label
- Keywords: comma-separated SEO terms
- Twitter thread: exactly 3 tweets max 280 chars each
- Facebook post: engaging with emojis and CTA
- AI recommendations: 2-3 complementary XTRONS accessories based on category
- All content in English (language toggle coming later)
- CRITICAL: Return ONLY the JSON object, nothing else`;

    type AllowedMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    type ContentBlock =
      | { type: "image"; source: { type: "base64"; media_type: AllowedMediaType; data: string } }
      | { type: "text"; text: string };

    const content: ContentBlock[] = [];

    if (hasImages) {
      for (const img of images as ImageInput[]) {
        content.push({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mediaType as AllowedMediaType,
            data: img.base64,
          },
        });
      }
    }

    content.push({ type: "text", text: promptText });

    const message = await client.messages.create({
      model: hasImages ? "claude-sonnet-4-5" : "claude-haiku-4-5",
      max_tokens: 8192,
      messages: [{ role: "user", content }],
    });

    const responseContent = message.content[0];
    if (responseContent.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    let parsed;
    try {
      let jsonText = responseContent.text.trim();
      // Strip markdown code blocks if present
      jsonText = jsonText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
      // Find JSON object boundaries
      const start = jsonText.indexOf("{");
      const end = jsonText.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        jsonText = jsonText.slice(start, end + 1);
      }
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error(`Failed to parse AI response as JSON`);
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
