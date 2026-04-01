import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ImageInput {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
}

function parseJsonSafe(text: string): unknown {
  let jsonText = text.trim();
  // Remove markdown code fences
  jsonText = jsonText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  // Find outermost JSON object
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    jsonText = jsonText.slice(start, end + 1);
  }
  try {
    return JSON.parse(jsonText);
  } catch {
    // Try fixing unescaped control characters
    const fixed = jsonText.replace(/[\x00-\x1F\x7F]/g, (char) => {
      if (char === "\n") return "\\n";
      if (char === "\r") return "\\r";
      if (char === "\t") return "\\t";
      return "";
    });
    try {
      return JSON.parse(fixed);
    } catch {
      throw new Error(`JSON parse failed. Raw response length: ${text.length}`);
    }
  }
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

    const productContext = `Product: ${productName}
SKU: ${sku}
Category: ${category}
Features: ${keyFeatures}
Compatible Cars: ${compatibleCars}
${screenSize ? `Screen Size: ${screenSize}` : ""}
${ramRom ? `RAM/ROM: ${ramRom}` : ""}
Description: ${shortDescription}
Selling Points: ${sellingPoints}
${hasImages ? "\nProduct images provided — analyse them to extract visible features, text, design details." : ""}`;

    // ── Prompt 1: Marketplace data ──────────────────────────────────────────────
    const prompt1 = `You are an expert e-commerce copywriter and SEO specialist for automotive electronics.
Generate optimised listings for this XTRONS product for marketplace platforms.

${productContext}

Return ONLY a raw JSON object (no markdown, no code blocks, no explanation). Use this exact structure:
{"amazon":{"titles":["","",""],"bullets":["","","","",""],"keywords":"","description":""},"ebay":{"titles":{"UK":["","",""],"US":["","",""],"AU":["","",""],"DE":["","",""]},"description":"","specifics":{"Brand":"XTRONS","Model":"","Compatibility":"","Screen Size":"","Connectivity":""}},"aliexpress":{"title":"","description":""},"yahoo_jp":{"title":"","description":""},"rakuten":{"title":"","description":""},"woocommerce":{"title":"","short_description":"","long_description":"","meta_title":"","meta_description":""}}

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
- WooCommerce long_description: Use simple HTML only — <p> paragraphs and <ul><li> lists. No complex nested elements. Keep under 600 words.
- All content in English (except yahoo_jp, rakuten, DE eBay titles)
- yahoo_jp and rakuten: write title and description in Japanese (日本語) — use natural Japanese for Japanese automotive shoppers
- Compatible cars in listings: always use "For [Brand]" format (e.g. "For BMW 3 Series F30 (320i 330i 340i) 2012-2019")
- CRITICAL: amazon.titles MUST be an array of ${numVariations} string(s), ebay.titles.UK/US/AU/DE MUST each be an array of ${numVariations} string(s)
- CRITICAL: Return ONLY the JSON object, nothing else`;

    // ── Prompt 2: Social/Content data ───────────────────────────────────────────
    const prompt2 = `You are an expert social media copywriter and content strategist for automotive electronics.
Generate optimised social and content listings for this XTRONS product.

${productContext}

Return ONLY a raw JSON object (no markdown, no code blocks, no explanation). Use this exact structure:
{"facebook":{"post":""},"youtube":{"title":"","description":"","tags":"","script_outline":""},"twitter":{"thread":["","",""]},"line":{"message":""},"reddit":{"title":"","body":""},"ai_recommendation":{"suggestions":["","",""],"blurb":""},"newsletter":{"subject":"","preview_text":"","hero_headline":"","intro":"","feature_highlights":[{"icon":"⚡","title":"","description":""},{"icon":"📱","title":"","description":""},{"icon":"🔊","title":"","description":""}],"compatible_vehicles":"","cta_text":"","signoff":"","plain_text":""}}

Rules:
- Twitter thread: exactly 3 tweets max 280 chars each
- Facebook post: engaging with emojis and CTA
- AI recommendations: 2-3 complementary XTRONS accessories based on category
- Newsletter tone: ${newsletterTone} — write the entire newsletter in this tone
  - friendly: warm, conversational, personal, like writing to a friend who loves cars
  - professional: formal, authoritative, B2B-appropriate, for distributors and trade buyers
  - excited: high energy, emojis, exclamation points, launch energy, promo vibe
  - educational: detailed explanations, helpful tips, informative, for tech-curious buyers
  - luxury: premium language, aspirational, sophisticated, no exclamation points
- Newsletter preview_text: ~80 chars, the snippet shown in email clients
- Newsletter plain_text: stripped plain text version of the full email body
- Compatible cars in listings: always use "For [Brand]" format
- CRITICAL: Return ONLY the JSON object, nothing else`;

    type AllowedMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
    type ContentBlock =
      | { type: "image"; source: { type: "base64"; media_type: AllowedMediaType; data: string } }
      | { type: "text"; text: string };

    // Build content for call 1 (with images for marketplace data)
    const content1: ContentBlock[] = [];
    if (hasImages) {
      for (const img of images as ImageInput[]) {
        content1.push({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mediaType as AllowedMediaType,
            data: img.base64,
          },
        });
      }
    }
    content1.push({ type: "text", text: prompt1 });

    const content2: ContentBlock[] = [{ type: "text", text: prompt2 }];

    const MODEL = "claude-sonnet-4-6";
    const MAX_TOKENS = 16000;

    // Run both calls in parallel
    const [message1, message2] = await Promise.all([
      client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: content1 }],
      }),
      client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: content2 }],
      }),
    ]);

    const responseContent1 = message1.content[0];
    const responseContent2 = message2.content[0];

    if (responseContent1.type !== "text" || responseContent2.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    const parsed1 = parseJsonSafe(responseContent1.text) as Record<string, unknown>;
    const parsed2 = parseJsonSafe(responseContent2.text) as Record<string, unknown>;

    // Merge results
    const parsed = { ...parsed1, ...parsed2 } as Record<string, unknown>;

    // Normalize: ensure titles are arrays (backwards compat if model returns string)
    const amazon = parsed?.amazon as Record<string, unknown> | undefined;
    if (amazon) {
      if (typeof amazon.title === "string" && !Array.isArray(amazon.titles)) {
        amazon.titles = [amazon.title];
        delete amazon.title;
      }
      if (!Array.isArray(amazon.titles)) {
        amazon.titles = [amazon.title || ""];
      }
    }

    // Normalize eBay titles
    const ebay = parsed?.ebay as Record<string, unknown> | undefined;
    if (ebay) {
      const ebayTitles = ebay.titles as Record<string, unknown> | undefined;
      if (ebayTitles) {
        for (const market of ["UK", "US", "AU", "DE"]) {
          if (typeof ebayTitles[market] === "string") {
            ebayTitles[market] = [ebayTitles[market]];
          } else if (!Array.isArray(ebayTitles[market])) {
            ebayTitles[market] = [""];
          }
        }
      } else if (typeof ebay.title === "string") {
        const t = ebay.title;
        ebay.titles = { UK: [t], US: [t], AU: [t], DE: [t] };
        delete ebay.title;
      }
    }

    // Suppress unused variable warning
    void language;

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
