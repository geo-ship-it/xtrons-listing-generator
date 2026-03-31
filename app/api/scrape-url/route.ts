import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || "fc-cad0afe772e445ca8b49123646a1d036";

async function scrapeWithFirecrawl(url: string): Promise<{ markdown: string; imageUrls: string[] }> {
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

  // Extract image URLs from markdown: ![alt](url) patterns
  const imageUrls = extractProductImages(markdown);

  return { markdown, imageUrls };
}

function extractProductImages(markdown: string): string[] {
  const urls: string[] = [];
  
  // Match markdown image syntax: ![alt](url)
  const mdImageRegex = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  let match;
  while ((match = mdImageRegex.exec(markdown)) !== null) {
    urls.push(match[2]);
  }

  // Filter out likely non-product images (logos, icons, small UI elements)
  const filtered = urls.filter((url) => {
    const lower = url.toLowerCase();
    // Exclude common non-product patterns
    if (lower.includes("logo") || lower.includes("icon") || lower.includes("favicon")) return false;
    if (lower.includes("banner") && lower.includes("nav")) return false;
    if (lower.includes("flag") || lower.includes("sprite") || lower.includes("badge")) return false;
    if (lower.includes("pixel") || lower.includes("tracking") || lower.includes("analytics")) return false;
    // Prefer product-related URLs
    // Keep if it has image extensions
    if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(url)) return true;
    // Keep if URL path looks product-related
    if (/product|item|image|photo|gallery|media/i.test(url)) return true;
    return true; // include by default if no exclusion matched
  });

  // Deduplicate
  const seen = new Set<string>();
  const deduped = filtered.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });

  // Return up to 5
  return deduped.slice(0, 5);
}

async function scrapeWithFetch(url: string): Promise<{ markdown: string; imageUrls: string[] }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; ListingBot/1.0)",
    },
  });
  if (!res.ok) throw new Error(`Fetch returned ${res.status}`);
  const html = await res.text();

  // Extract image URLs from img tags
  const imgTagRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const imgUrls: string[] = [];
  let m;
  while ((m = imgTagRegex.exec(html)) !== null) {
    const src = m[1];
    if (src.startsWith("http") || src.startsWith("//")) {
      imgUrls.push(src.startsWith("//") ? `https:${src}` : src);
    }
  }
  const imageUrls = extractProductImages(imgUrls.join("\n") + imgUrls.map(u => `![img](${u})`).join("\n"));

  // Strip HTML tags for a rough plain-text version
  const markdown = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 8000);
  return { markdown, imageUrls };
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

    let markdown: string;
    let imageUrls: string[] = [];

    // Try Firecrawl first, fall back to direct fetch
    try {
      const result = await scrapeWithFirecrawl(url);
      markdown = result.markdown;
      imageUrls = result.imageUrls;
    } catch (err) {
      console.warn("Firecrawl failed, falling back to direct fetch:", err);
      const result = await scrapeWithFetch(url);
      markdown = result.markdown;
      imageUrls = result.imageUrls;
    }

    const productData = await extractProductData(markdown);

    return NextResponse.json({ success: true, data: { ...productData, imageUrls } });
  } catch (error) {
    console.error("Scrape URL error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Extraction failed" },
      { status: 500 }
    );
  }
}
