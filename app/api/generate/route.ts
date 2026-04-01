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
      shortDescription,
      sellingPoints,
      language = "EN",
      images = [] as ImageInput[],
      newsletterTone = "friendly",
      titleVariations = 3,
    } = body;

    const hasImages = images && images.length > 0;
    const numVariations = Math.min(Math.max(Number(titleVariations) || 3, 1), 10);

    const promptText = `You are an expert e-commerce copywriter and SEO specialist for automotive electronics.
Generate optimised listings for this XTRONS product for all platforms.

Product: ${productName}
SKU: ${sku}
Category: ${category}
Features: ${keyFeatures}
Compatible Cars: ${compatibleCars}
${screenSize ? `Screen Size: ${screenSize}` : ""}
${ramRom ? `RAM/ROM: ${ramRom}` : ""}

Description: ${shortDescription}
Selling Points: ${sellingPoints}
${hasImages ? "\nProduct images provided — analyse them to extract visible features, text, design details." : ""}

Return ONLY a raw JSON object (no markdown, no code blocks, no explanation). Use this exact structure:
{"amazon":{"titles":["","",""],"bullets":["","","","",""],"keywords":"","description":""},"ebay":{"titles":{"UK":["","",""],"US":["","",""],"AU":["","",""],"DE":["","",""]},"description":"","specifics":{"Brand":"XTRONS","Model":"","Compatibility":"","Screen Size":"","Connectivity":""}},"aliexpress":{"title":"","description":""},"yahoo_jp":{"title":"","description":""},"rakuten":{"title":"","description":""},"woocommerce":{"title":"","short_description":"","long_description":"","meta_title":"","meta_description":""},"facebook":{"post":""},"youtube":{"title":"","description":"","tags":"","script_outline":""},"twitter":{"thread":["","",""]},"line":{"message":""},"reddit":{"title":"","body":""},"ai_recommendation":{"suggestions":["","",""],"blurb":""},"newsletter":{"subject":"","preview_text":"","hero_headline":"","intro":"","feature_highlights":[{"icon":"⚡","title":"","description":""},{"icon":"📱","title":"","description":""},{"icon":"🔊","title":"","description":""}],"compatible_vehicles":"","cta_text":"","signoff":"","plain_text":""}}

Rules:
- Amazon titles: generate an array of EXACTLY ${numVariations} title variation(s), each max 200 chars with different keyword emphasis, including car model, features, XTRONS brand
- eBay titles: generate 4 market-specific arrays, each with EXACTLY ${numVariations} variation(s), every title MUST be 75-80 characters (count carefully, never less than 75):
  - UK: Use British English, mention "Android Car Stereo", UK-relevant specs
  - US: Use American English, mention "Android Head Unit", focus on CarPlay/Android Auto
  - AU: Australian English, similar to UK but with AU market focus
  - DE: German-language title, use German automotive terms (e.g. "Android Autoradio", "Navigationssystem")
  - ALL eBay titles across all markets: MUST be between 75-80 characters, maximize SEO keywords, count every character
- Amazon bullets: exactly 5, each starting with ALL CAPS key benefit label
- Keywords: comma-separated SEO terms
- Twitter thread: exactly 3 tweets max 280 chars each
- Facebook post: engaging with emojis and CTA
- AI recommendations: 2-3 complementary XTRONS accessories based on category
- All content in English (except yahoo_jp, rakuten, DE eBay titles)
- yahoo_jp and rakuten: write title and description in Japanese (日本語) — use natural Japanese for Japanese automotive shoppers
- Newsletter tone: ${newsletterTone} — write the entire newsletter in this tone
  - friendly: warm, conversational, personal, like writing to a friend who loves cars
  - professional: formal, authoritative, B2B-appropriate, for distributors and trade buyers
  - excited: high energy, emojis, exclamation points, launch energy, promo vibe
  - educational: detailed explanations, helpful tips, informative, for tech-curious buyers
  - luxury: premium language, aspirational, sophisticated, no exclamation points
- Newsletter preview_text: ~80 chars, the snippet shown in email clients
- Newsletter plain_text: stripped plain text version of the full email body
- Compatible cars in listings: always use "For [Brand]" format (e.g. "For BMW 3 Series F30 (320i 330i 340i) 2012-2019")
- CRITICAL: amazon.titles MUST be an array of ${numVariations} string(s), ebay.titles.UK/US/AU/DE MUST each be an array of ${numVariations} string(s)
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

    // Normalize: ensure titles are arrays (backwards compat if model returns string)
    if (typeof parsed?.amazon?.title === "string" && !Array.isArray(parsed?.amazon?.titles)) {
      parsed.amazon.titles = [parsed.amazon.title];
      delete parsed.amazon.title;
    }
    if (!Array.isArray(parsed?.amazon?.titles)) {
      parsed.amazon = parsed.amazon || {};
      parsed.amazon.titles = [parsed.amazon.title || ""];
    }

    // Normalize eBay titles
    const ebayTitles = parsed?.ebay?.titles;
    if (ebayTitles) {
      for (const market of ["UK", "US", "AU", "DE"]) {
        if (typeof ebayTitles[market] === "string") {
          ebayTitles[market] = [ebayTitles[market]];
        } else if (!Array.isArray(ebayTitles[market])) {
          ebayTitles[market] = [""];
        }
      }
    } else if (typeof parsed?.ebay?.title === "string") {
      // Old format fallback
      const t = parsed.ebay.title;
      parsed.ebay.titles = { UK: [t], US: [t], AU: [t], DE: [t] };
      delete parsed.ebay.title;
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
