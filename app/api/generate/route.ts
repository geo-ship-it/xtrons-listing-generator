import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

const client = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
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
      imageFeatures = null as string | null,
      newsletterTone = "friendly",
      titleVariations = 1,
      userRole = "Geo",
    } = body;

    const hasImageFeatures = imageFeatures && imageFeatures.trim().length > 0;
    const numVariations = Math.min(Math.max(Number(titleVariations) || 1, 1), 10);

    const productContext = `Product: ${productName}
SKU: ${sku}
Category: ${category}
Features: ${keyFeatures}
Compatible Cars: ${compatibleCars}
${screenSize ? `Screen Size: ${screenSize}` : ""}
${ramRom ? `RAM/ROM: ${ramRom}` : ""}
Description: ${shortDescription}
Selling Points: ${sellingPoints}
${hasImageFeatures ? `\nImage Analysis:\n${imageFeatures}` : ""}`;

    // ── Prompt 1: Marketplace data ──────────────────────────────────────────────
    const prompt1 = `You are an expert e-commerce copywriter and SEO specialist for automotive electronics.
Generate optimised listings for this XTRONS product for marketplace platforms.

${productContext}

Return ONLY a raw JSON object (no markdown, no code blocks, no explanation). Use this exact structure:
{"amazon":{"UK":{"titles":["","",""],"bullets":["","","","",""],"keywords":"","description":""},"US":{"titles":["","",""],"bullets":["","","","",""],"keywords":"","description":""},"DE":{"titles":["","",""],"bullets":["","","","",""],"keywords":"","description":""},"JP":{"title_jp":"","title_en":"","bullets_jp":["","","","",""],"keywords_jp":"","description_jp":""}},"ebay":{"titles":{"UK":["","",""],"US":["","",""],"AU":["","",""],"DE":["","",""]},"description_en":"","description_de":"","specifics":{"Brand":"XTRONS","Model":"","Compatibility":"","Screen Size":"","Connectivity":""}},"aliexpress":{"title":"","description":""},"alibaba":{"product_title":"","headline":"","keywords":"","description_html":"","spec_summary":"","moq":"","lead_time":"","price_note":"","oem_odm":"","packaging_shipping":""},"yahoo_jp":{"product_name":"","catch_copy":"","description_html":"","search_keywords":"","product_code":"","spec_summary":""},"rakuten":{"product_name":"","catch_copy":"","description_html":"","search_keywords":"","item_number":""},"woocommerce":{"title":"","short_description":"","long_description":"","meta_title":"","meta_description":""}}

Rules:
- Amazon UK: English. Title max 200 chars. 5 bullets starting with ALL CAPS benefit. British automotive language.
- Amazon US: American English. Title max 200 chars. Use "head unit", "car stereo", focus on CarPlay/Android Auto appeal. American spellings.
- Amazon DE: FULLY in German (Deutsch). Title max 200 chars. Use "Android Autoradio", "Einbaunavigation", "Autoradio". 5 bullets in German. Keywords: German search terms (e.g. "Autoradio Android", "BMW Navi Einbau"). Description in German.
- Amazon JP: FULLY in Japanese (日本語). title_jp max 150 chars. All bullets in Japanese. keywords_jp: Japanese search terms. description_jp in Japanese.
- Generate ${numVariations} title variation(s) per Amazon market (titles array in each UK/US/DE market)
- eBay titles: generate 4 market-specific arrays, each with EXACTLY ${numVariations} variation(s), every title MUST be 75-80 characters (count carefully, never less than 75):
  - UK: Use British English, mention "Android Car Stereo", UK-relevant specs
  - US: Use American English, mention "Android Head Unit", focus on CarPlay/Android Auto
  - AU: Australian English, similar to UK but with AU market focus
  - DE: German-language title, use German automotive terms (e.g. "Android Autoradio", "Navigationssystem")
  - ALL eBay titles across all markets: MUST be between 75-80 characters, maximize SEO keywords, count every character
- Amazon bullets: exactly 5, each starting with ALL CAPS key benefit label
- Keywords: comma-separated SEO terms
- alibaba: English, B2B wholesale tone. Generate backend fill-ready fields:
  - product_title: clear wholesale product title for Alibaba search
  - headline: short B2B selling hook
  - keywords: comma-separated core search terms
  - description_html: simple HTML for Alibaba product description
  - spec_summary: concise specs/fitment summary
  - moq: sensible MOQ suggestion string
  - lead_time: estimated lead time string
  - price_note: placeholder pricing / FOB note in B2B style
  - oem_odm: OEM/ODM support note
  - packaging_shipping: packaging and shipping note for buyers
- WooCommerce long_description: Use simple HTML only — <p> paragraphs and <ul><li> lists. No complex nested elements. Keep under 600 words.
- LANGUAGE RULES (strictly enforce):
  - Amazon UK/US, eBay UK/US/AU, AliExpress, WooCommerce: English
  - eBay DE title AND description AND specifics: FULLY in German (Deutsch) — use natural German automotive language throughout
  - yahoo_jp: FULLY in Japanese (日本語). Match Yahoo!ショッピング backend-style fields:
  - product_name: Japanese product title for Yahoo Shopping search, strong SEO, natural JP phrasing
  - catch_copy: Short Japanese catch phrase / promo hook suitable for Yahoo Shopping
  - description_html: Full Japanese HTML description with sections 商品説明, 商品仕様, 対応車種, 注意事項
  - search_keywords: Space-separated Japanese search keywords for Yahoo Shopping
  - product_code: Seller product code based on SKU (e.g. xtrons-[SKU]-yahoo)
  - spec_summary: Concise Japanese spec summary for quick reference
  - rakuten: FULLY in Japanese (日本語). Match actual Rakuten backend fields:
  - product_name: Full product title in Japanese with promotional prefix e.g. 【送料無料】XTRONS [product] [car model]対応 [key feature]. Max 127 chars.
  - catch_copy: HTML-formatted tagline using <font color="#0000FF" size="+2"><strong>...</strong></font> tags. Eye-catching Japanese copy highlighting top 2-3 features.
  - description_html: Full HTML product description in Japanese. Use <h2>, <p>, <ul><li> tags. Include: 製品特徴 (features), 対応車種 (compatible cars), 仕様 (specs), 注意事項 (notes). 
  - search_keywords: Space-separated Japanese search keywords for Rakuten search (e.g. カーナビ Android BMW フリップダウン)
  - item_number: Suggest item management number based on SKU (e.g. xtrons-[SKU]-jp)
  - yahoo_auction ALL fields: FULLY in Japanese (日本語)
- eBay DE description: Write a full product description in German. Use German automotive terminology. Include key specs, compatibility, and features in German.
- Compatible cars in listings: always use "For [Brand]" format (e.g. "For BMW 3 Series F30 (320i 330i 340i) 2012-2019")
- CRITICAL: amazon.UK.titles, amazon.US.titles, amazon.DE.titles MUST each be an array of ${numVariations} string(s), ebay.titles.UK/US/AU/DE MUST each be an array of ${numVariations} string(s)
- CRITICAL: Return ONLY the JSON object, nothing else`;

    // ── Prompt 2: Social/Content data ───────────────────────────────────────────
    const prompt2 = `You are an expert social media copywriter and content strategist for automotive electronics.
Generate optimised social and content listings for this XTRONS product.

${productContext}

Return ONLY a raw JSON object (no markdown, no code blocks, no explanation). Use this exact structure:
{"facebook":{"EN":{"post":""},"DE":{"post":""},"JP":{"post":""},"B2B":{"post":""}},"youtube":{"title":"","description":"","tags":"","script_outline":""},"twitter":{"EN":{"thread":["","",""]},"JP":{"thread":["","",""]}},"line":{"message":""},"reddit":{"title":"","body":""},"ai_recommendation":{"suggestions":["","",""],"blurb":""},"newsletter":{"subject":"","preview_text":"","hero_headline":"","intro":"","feature_highlights":[{"icon":"⚡","title":"","description":""},{"icon":"📱","title":"","description":""},{"icon":"🔊","title":"","description":""}],"compatible_vehicles":"","cta_text":"","signoff":"","plain_text":""},"yahoo_auction":{"title":"","condition":"新品","category":"","starting_price":"","buy_now_price":"","description":"","tags":"","shipping_note":"","payment_note":""}}

Rules:
- Facebook EN: engaging English post with emojis and CTA
- Facebook DE: fully German Facebook post, natural German social tone
- Facebook JP: fully Japanese Facebook post, natural Japanese social tone
- Facebook B2B: English B2B/distributor-focused post for dealers, resellers, wholesalers, and trade buyers. More professional, less retail, highlight MOQ/OEM/distribution value when relevant
- Twitter EN thread: exactly 3 tweets max 280 chars each in English
- Twitter JP thread: exactly 3 tweets max 280 chars each in Japanese, natural X tone
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
- yahoo_auction title: STRICT max 65 Japanese characters. Format: [状態][商品名][対応車種][特徴] e.g. "新品 XTRONS 9インチ Android14 BMW F30 F31用 カーナビ ワイヤレスCarPlay 4G"
- yahoo_auction description: Full Japanese HTML description with clearly labelled sections: 商品説明, 商品仕様, 対応車種, 発送について (standard: ヤマト運輸またはゆうパックにて発送。落札後3営業日以内に発送いたします。), 注意事項
- yahoo_auction category: Most specific Yahoo Auction category path for car stereos in Japanese (e.g. 自動車・オートバイ > カーナビ・カーエレクトロニクス > カーナビ本体)
- yahoo_auction starting_price: Suggest reasonable starting price in JPY based on product — car stereos typically ¥15,000-¥80,000, return as string e.g. "29800"
- yahoo_auction buy_now_price: Optional 即決価格 in JPY, typically 10-20% above starting price, return as string e.g. "34800"
- yahoo_auction shipping_note: Japanese shipping note suitable for ヤフオク! seller listing
- yahoo_auction payment_note: Japanese payment / transaction note suitable for ヤフオク! seller listing
- yahoo_auction tags: 5-8 relevant Japanese hashtag-style tags (comma separated)
- CRITICAL: Return ONLY the JSON object, nothing else`;

    // Build DeepSeek-compatible content (text only, no image_url support)
    // Images have already been analyzed by GPT-4o-mini and summary is in imageFeatures
    const content1 = prompt1;
    const content2 = prompt2;

    const MODEL = "deepseek-chat";
    const MAX_TOKENS = 8192;

    // Run both calls in parallel
    const [message1, message2] = await Promise.all([
      client.chat.completions.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: content1 }],
      }),
      client.chat.completions.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: content2 }],
      }),
    ]);

    const responseText1 = message1.choices[0]?.message?.content || "";
    const responseText2 = message2.choices[0]?.message?.content || "";

    const parsed1 = parseJsonSafe(responseText1) as Record<string, unknown>;
    const parsed2 = parseJsonSafe(responseText2) as Record<string, unknown>;

    // Merge results
    const parsed = { ...parsed1, ...parsed2 } as Record<string, unknown>;

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
