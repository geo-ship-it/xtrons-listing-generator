import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY || "sk-9011d468ebed4d28be7eeda8b1232ba1",
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
      newsletterTone = "friendly",
    } = body;

    const promptText = `You are an expert email marketing copywriter for automotive electronics.
Generate a newsletter email for this XTRONS product in the specified tone.

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

Newsletter tone: ${newsletterTone}
  - friendly: warm, conversational, personal, like writing to a friend who loves cars
  - professional: formal, authoritative, B2B-appropriate, for distributors and trade buyers
  - excited: high energy, emojis, exclamation points, launch energy, promo vibe
  - educational: detailed explanations, helpful tips, informative, for tech-curious buyers
  - luxury: premium language, aspirational, sophisticated, no exclamation points

Return ONLY a raw JSON object (no markdown, no code blocks, no explanation). Use this exact structure:
{"subject":"","preview_text":"","hero_headline":"","intro":"","feature_highlights":[{"icon":"⚡","title":"","description":""},{"icon":"📱","title":"","description":""},{"icon":"🔊","title":"","description":""}],"compatible_vehicles":"","cta_text":"","signoff":"","plain_text":""}

Rules:
- subject: catchy, tone-appropriate email subject line
- preview_text: ~80 chars, the snippet shown in email clients before opening
- hero_headline: bold opening headline for the email hero section
- intro: 2-3 sentence product introduction paragraph in the specified tone
- feature_highlights: exactly 3 key features with appropriate emoji icons, titles, and descriptions
- compatible_vehicles: brief compatible vehicles summary
- cta_text: call to action button text (e.g. "Shop Now", "Upgrade Your Ride", "View Product")
- signoff: tone-appropriate email sign-off
- plain_text: full plain text version of the email (stripped, for email clients that don't render HTML)
- CRITICAL: Return ONLY the JSON object, nothing else`;

    const message = await client.chat.completions.create({
      model: "deepseek-chat",
      max_tokens: 2048,
      messages: [{ role: "user", content: promptText }],
    });

    const responseText = message.choices[0]?.message?.content || "";

    let parsed;
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
      throw new Error("Failed to parse AI response as JSON");
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("Newsletter API error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
