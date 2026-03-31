import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
    } = body;

    const prompt = `You are an expert e-commerce copywriter and SEO specialist for automotive electronics.
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
Output Language: ${language} (EN = English; for Yahoo.jp and Rakuten, still write in English for now as language toggle is coming later)

Generate the following in valid JSON format with NO markdown code blocks, just raw JSON:
{
  "amazon": {
    "title": "",
    "bullets": ["", "", "", "", ""],
    "keywords": "",
    "description": ""
  },
  "ebay": {
    "title": "",
    "description": "",
    "specifics": {
      "Brand": "XTRONS",
      "Model": "",
      "Compatibility": "",
      "Screen Size": "",
      "Connectivity": ""
    }
  },
  "aliexpress": {
    "title": "",
    "description": ""
  },
  "yahoo_jp": {
    "title": "",
    "description": ""
  },
  "rakuten": {
    "title": "",
    "description": ""
  },
  "woocommerce": {
    "title": "",
    "short_description": "",
    "long_description": "",
    "meta_title": "",
    "meta_description": ""
  },
  "facebook": {
    "post": ""
  },
  "youtube": {
    "title": "",
    "description": "",
    "tags": "",
    "script_outline": ""
  },
  "twitter": {
    "thread": ["", "", ""]
  },
  "line": {
    "message": ""
  },
  "reddit": {
    "title": "",
    "body": ""
  },
  "ai_recommendation": {
    "suggestions": ["", "", ""],
    "blurb": ""
  }
}

Rules:
- Amazon title: max 200 chars, include car model compatibility, key features, brand XTRONS
- eBay title: max 80 chars, be concise but descriptive
- Amazon bullets: exactly 5 bullets, each starting with a capital letter key benefit (e.g. "WIRELESS APPLE CARPLAY & ANDROID AUTO:")
- Keywords: comma-separated, include car model names, feature terms, popular search phrases
- WooCommerce long_description: rich HTML-friendly content with paragraphs, can use <p> and <ul> tags
- YouTube script_outline: 3-4 bullet points for a ~2 minute video script
- Twitter thread: exactly 3 tweets, each max 280 chars, engaging with emojis
- LINE message: casual, short, emoji-friendly format
- Reddit body: detailed, helpful post for r/CarAV, r/CarPlay or r/AndroidAuto community
- Facebook post: engaging caption with relevant emojis, call to action
- AI recommendation: suggest 2-3 complementary XTRONS products (DAB dongle, reverse camera, install harness, TPMS, roof monitor) based on product category
- Make all content genuinely useful, engaging, and SEO-optimised
- Return ONLY valid JSON, no other text`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse the JSON response
    let parsed;
    try {
      // Strip any potential markdown code blocks
      let jsonText = content.text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "");
      }
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error(`Failed to parse AI response as JSON: ${content.text}`);
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Generate API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
