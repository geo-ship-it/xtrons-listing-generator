import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { buildGenerationPlan } from "./promptPlan";

function getClient() {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY environment variable is not set");
  }
  return new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: process.env.DEEPSEEK_API_KEY,
  });
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

// Role configuration
const ROLE_MODULES: Record<string, string[]> = {
  Geo: ["amazon", "ebay", "aliexpress", "alibaba", "yahoo_jp", "rakuten", "woocommerce", "facebook", "youtube", "twitter", "line", "reddit", "ai_recommendation", "newsletter", "yahoo_auction"],
  Japan: ["amazon_jp", "rakuten", "yahoo_jp", "yahoo_auction", "line", "facebook_jp", "twitter_jp", "ai_recommendation"],
  Ebay: ["ebay", "ai_recommendation"],
  Amazon: ["amazon", "ai_recommendation"],
  SEO: ["woocommerce", "facebook", "youtube", "twitter", "line", "reddit", "ai_recommendation"],
  Trading: ["facebook_b2b", "alibaba", "ai_recommendation", "newsletter"],
};

function isModuleAllowed(role: string | undefined, module: string): boolean {
  if (!role || !ROLE_MODULES[role]) return false;
  return ROLE_MODULES[role].includes(module);
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
      newsletterTone = "friendly",
      titleVariations = 1,
      userRole = "Geo",
    } = body;

    const plan = buildGenerationPlan({
      productName,
      sku,
      category,
      keyFeatures,
      compatibleCars,
      screenSize,
      ramRom,
      shortDescription,
      sellingPoints,
      language,
      newsletterTone,
      titleVariations,
      userRole,
    });

    const MODEL = "deepseek-chat";
    const client = getClient();
    const responses = await Promise.all(
      plan.map((task) =>
        client.chat.completions.create({
          model: MODEL,
          max_tokens: task.maxTokens,
          messages: [{ role: "user", content: task.prompt }],
        })
      )
    );

    const parsedResponses = Object.fromEntries(
      responses.map((message, index) => {
        const responseText = message.choices[0]?.message?.content || "";
        return [plan[index].key, parseJsonSafe(responseText) as Record<string, unknown>];
      })
    ) as Partial<Record<"marketplace" | "social", Record<string, unknown>>>;

    const parsed1 = parsedResponses.marketplace ?? {};
    const parsed2 = parsedResponses.social ?? {};

    // Merge results
    const parsed = { ...parsed1, ...parsed2 } as Record<string, unknown>;

    // Normalize eBay description fields for current UI shape
    const ebay = parsed?.ebay as Record<string, unknown> | undefined;
    if (ebay) {
      if (typeof ebay.description !== "string") {
        const descriptionEn = typeof ebay.description_en === "string" ? ebay.description_en : "";
        ebay.description = descriptionEn;
      }
      if (typeof ebay.description_de === "string") {
        ebay.description_de = ebay.description_de;
      }
    }

    // Normalize: ensure amazon titles are arrays per market (backwards compat if model returns flat/string)
    const amazon = parsed?.amazon as Record<string, unknown> | undefined;
    if (amazon) {
      // New multi-market format: normalize each market's titles array
      for (const market of ["UK", "US", "DE"]) {
        const mkt = amazon[market] as Record<string, unknown> | undefined;
        if (mkt) {
          if (typeof mkt.titles === "string") mkt.titles = [mkt.titles];
          else if (!Array.isArray(mkt.titles)) mkt.titles = [""];
        }
      }
      // Legacy flat format fallback: wrap flat amazon into UK market
      if (!amazon.UK && !amazon.US && !amazon.DE) {
        if (typeof amazon.title === "string" && !Array.isArray(amazon.titles)) {
          amazon.titles = [amazon.title];
          delete amazon.title;
        }
        if (!Array.isArray(amazon.titles)) {
          amazon.titles = [String(amazon.titles || "")];
        }
        amazon.UK = { titles: amazon.titles, bullets: amazon.bullets, keywords: amazon.keywords, description: amazon.description };
      }
    }

    // Normalize social content backwards compatibility
    const facebook = parsed?.facebook as Record<string, unknown> | undefined;
    if (facebook && typeof facebook.post === "string" && !facebook.EN) {
      facebook.EN = { post: facebook.post };
    }

    const twitter = parsed?.twitter as Record<string, unknown> | undefined;
    if (twitter && Array.isArray(twitter.thread) && !twitter.EN) {
      twitter.EN = { thread: twitter.thread };
    }

    // Normalize eBay titles
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
