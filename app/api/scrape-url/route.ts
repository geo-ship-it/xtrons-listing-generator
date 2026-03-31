import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || "fc-cad0afe772e445ca8b49123646a1d036";

async function scrapeWithFirecrawl(url: string): Promise<string> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["markdown"] }),
  });

  if (!res.ok) {
    throw new Error(`Firecrawl returned ${res.status}`);
  }

  const data = await res.json();
  const markdown = data?.data?.markdown || data?.markdown || "";
  if (!markdown) throw new Error("Firecrawl returned no content");
  return markdown;
}

async function scrapeWithFetch(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ListingBot/1.0)",
    },
  });
  if (!res.ok) throw new Error(`Fetch returned ${res.status}`);
  const html = await res.text();
  // Strip HTML tags for a rough plain-text version
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 8000);
}

async function extractProductData(content: string) {
  const prompt = `You are extracting product information from a webpage for an automotive electronics product listing tool.

Here is the webpage content:
${content.slice(0, 12000)}

Extract the following information and return as valid JSON only, no other text:
{
  "productName": "full product name",
  "sku": "model number or SKU code if visible",
  "category": "one of: Car Stereo, Roof Monitor, Accessory, DAB Dongle, Camera",
  "keyFeatures": "list of key features, one per line",
  "compatibleCars": "list of compatible car makes/models/years",
  "screenSize": "screen size if applicable, e.g. 9 inch",
  "ramRom": "RAM and ROM if applicable, e.g. 4GB RAM 64GB ROM",
  "price": "price as number only in GBP, e.g. 299.99",
  "shortDescription": "2-3 sentence product description",
  "sellingPoints": "key selling points vs competitors"
}

If any field cannot be determined, use an empty string. For price, convert to GBP if in another currency (use approximate rate). Always return valid JSON.`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0];
  if (text.type !== "text") throw new Error("Unexpected response type");

  let jsonText = text.text.trim();
  if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(jsonText);
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });
    }

    let content: string;

    // Try Firecrawl first, fall back to direct fetch
    try {
      content = await scrapeWithFirecrawl(url);
    } catch (err) {
      console.warn("Firecrawl failed, falling back to direct fetch:", err);
      content = await scrapeWithFetch(url);
    }

    const productData = await extractProductData(content);

    return NextResponse.json({ success: true, data: productData });
  } catch (error) {
    console.error("Scrape URL error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
