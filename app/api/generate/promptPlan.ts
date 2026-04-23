type RoleName = "Geo" | "Japan" | "Ebay" | "Amazon" | "SEO" | "Trading";

const ROLE_MODULES = {
  Geo: ["amazon", "ebay", "aliexpress", "alibaba", "yahoo_jp", "rakuten", "woocommerce", "facebook", "youtube", "twitter", "line", "reddit", "ai_recommendation", "newsletter", "yahoo_auction"],
  Japan: ["amazon_jp", "rakuten", "yahoo_jp", "yahoo_auction", "line", "facebook_jp", "twitter_jp", "ai_recommendation"],
  Ebay: ["ebay"],
  Amazon: ["amazon"],
  SEO: ["woocommerce", "facebook", "youtube", "twitter", "line", "reddit", "ai_recommendation"],
  Trading: ["facebook_b2b", "alibaba", "ai_recommendation", "newsletter"],
} as const;

export interface GenerateRequestPayload {
  productName: string;
  sku: string;
  category: string;
  keyFeatures: string;
  compatibleCars: string;
  screenSize?: string;
  ramRom?: string;
  shortDescription: string;
  sellingPoints: string;
  language?: string;
  newsletterTone?: string;
  titleVariations?: number;
  userRole?: RoleName | string;
}

export type GenerationPromptKey =
  | "marketplace"
  | "social"
  | "amazon_jp"
  | "rakuten"
  | "yahoo_jp"
  | "yahoo_auction";

export interface GenerationPromptTask {
  key: GenerationPromptKey;
  prompt: string;
  maxTokens: number;
}

const TOKENS = {
  geoMarketplace: 5200,
  geoSocial: 3600,
  japanAmazon: 1400,
  japanRakuten: 900,
  japanYahooJp: 900,
  japanYahooAuction: 900,
  japanSocial: 1800,
  ebayMarketplace: 1800,
  amazonMarketplace: 2000,
  seoMarketplace: 2000,
  seoSocial: 2400,
  tradingMarketplace: 1800,
  tradingSocial: 1800,
} as const;

function normalizeRole(userRole?: string): RoleName {
  if (userRole && userRole in ROLE_MODULES) return userRole as RoleName;
  return "Geo";
}

export function buildProductContext(payload: GenerateRequestPayload): string {
  return `Product: ${payload.productName}
SKU: ${payload.sku}
Category: ${payload.category}
Features: ${payload.keyFeatures}
Compatible Cars: ${payload.compatibleCars}
${payload.screenSize ? `Screen Size: ${payload.screenSize}` : ""}
${payload.ramRom ? `RAM/ROM: ${payload.ramRom}` : ""}
Description: ${payload.shortDescription}
Selling Points: ${payload.sellingPoints}`;
}

function buildGeoMarketplacePrompt(productContext: string, numVariations: number): string {
  return `You are an expert e-commerce copywriter and SEO specialist for automotive electronics.
Generate optimised listings for this XTRONS product for all supported marketplace platforms.

${productContext}

Return ONLY a raw JSON object. Use this exact structure:
{"amazon":{"UK":{"titles":["","",""],"bullets":["","","","",""],"keywords":"","description":""},"US":{"titles":["","",""],"bullets":["","","","",""],"keywords":"","description":""},"DE":{"titles":["","",""],"bullets":["","","","",""],"keywords":"","description":""},"JP":{"title_jp":"","title_en":"","bullets_jp":["","","","",""],"keywords_jp":"","description_jp":""}},"ebay":{"titles":{"UK":["","",""],"US":["","",""],"AU":["","",""],"DE":["","",""]},"description_en":"","description_de":"","specifics":{"Brand":"XTRONS","Model":"","Compatibility":"","Screen Size":"","Connectivity":""}},"aliexpress":{"title":"","description":""},"alibaba":{"product_title":"","headline":"","keywords":"","description_html":"","spec_summary":"","moq":"","lead_time":"","price_note":"","oem_odm":"","packaging_shipping":""},"yahoo_jp":{"product_name":"","catch_copy":"","description_html":"","search_keywords":"","product_code":"","spec_summary":""},"rakuten":{"product_name":"","catch_copy":"","description_html":"","search_keywords":"","item_number":""},"woocommerce":{"title":"","short_description":"","long_description":"","meta_title":"","meta_description":""}}

Rules:
- Generate ${numVariations} Amazon title variation(s) for UK, US, and DE.
- Generate eBay title arrays for UK, US, AU, and DE.
- WooCommerce long_description should use simple HTML only.
- Yahoo JP and Rakuten should be fully Japanese.
- Return only JSON.`;
}

function buildGeoSocialPrompt(productContext: string, newsletterTone: string): string {
  return `You are an expert social media copywriter and content strategist for automotive electronics.
Generate optimised social content for all supported channels.

${productContext}

Return ONLY a raw JSON object. Use this exact structure:
{"facebook":{"EN":{"post":""},"DE":{"post":""},"JP":{"post":""},"B2B":{"post":""}},"youtube":{"title":"","description":"","tags":"","script_outline":""},"twitter":{"EN":{"thread":["","",""]},"JP":{"thread":["","",""]}},"line":{"message":""},"reddit":{"title":"","body":""},"ai_recommendation":{"suggestions":["","",""],"blurb":""},"newsletter":{"subject":"","preview_text":"","hero_headline":"","intro":"","feature_highlights":[{"icon":"⚡","title":"","description":""},{"icon":"📱","title":"","description":""},{"icon":"🔊","title":"","description":""}],"compatible_vehicles":"","cta_text":"","signoff":"","plain_text":""},"yahoo_auction":{"title":"","condition":"新品","category":"","starting_price":"","buy_now_price":"","description":"","tags":"","shipping_note":"","payment_note":""}}

Rules:
- Newsletter tone: ${newsletterTone}.
- Twitter EN and JP should each be exactly 3 posts.
- Yahoo Auction content should be Japanese.
- Return only JSON.`;
}

function buildJapanAmazonPrompt(productContext: string, numVariations: number): string {
  return `You are an expert Japanese e-commerce copywriter for automotive electronics.
Generate ONLY Amazon JP content.

${productContext}

Return ONLY a raw JSON object. Use this exact structure:
{"amazon":{"JP":{"title_jp":"","title_en":"","bullets_jp":["","","","",""],"keywords_jp":"","description_jp":""}}}

Rules:
- Amazon JP only. Internally consider ${numVariations} title ideas, but return only the strongest final version.
- All content should be Japanese except title_en reference.
- Keep outputs concise and high-conversion.
- Return only JSON.`;
}

function buildJapanRakutenPrompt(productContext: string): string {
  return `You are an expert Rakuten (楽天市場) copywriter for automotive electronics.
Generate ONLY Rakuten content.

${productContext}

Return ONLY a raw JSON object. Use this exact structure:
{"rakuten":{"product_name":"","catch_copy":"","description_html":"","search_keywords":"","item_number":""}}

Rules:
- Rakuten only. All content fully Japanese.
- description_html should use simple HTML only (<p>, <br>, <ul>, <li>, <strong>).
- search_keywords: comma-separated Japanese keywords.
- Return only JSON.`;
}

function buildJapanYahooJpPrompt(productContext: string): string {
  return `You are an expert Yahoo! Shopping Japan copywriter for automotive electronics.
Generate ONLY Yahoo JP content.

${productContext}

Return ONLY a raw JSON object. Use this exact structure:
{"yahoo_jp":{"product_name":"","catch_copy":"","description_html":"","search_keywords":"","product_code":"","spec_summary":""}}

Rules:
- Yahoo JP only. All content fully Japanese.
- description_html should use simple HTML only.
- Return only JSON.`;
}

function buildJapanYahooAuctionPrompt(productContext: string): string {
  return `You are an expert Yahoo! Auctions Japan (ヤフオク!) listing writer for automotive electronics.
Generate ONLY Yahoo Auction content.

${productContext}

Return ONLY a raw JSON object. Use this exact structure:
{"yahoo_auction":{"title":"","condition":"新品","category":"","starting_price":"","buy_now_price":"","description":"","tags":"","shipping_note":"","payment_note":""}}

Rules:
- Yahoo Auction only. All content fully Japanese.
- condition defaults to 新品 unless stated otherwise.
- Return only JSON.`;
}

function buildJapanSocialPrompt(productContext: string): string {
  return `You are an expert Japanese social copywriter for automotive electronics.
Generate ONLY Japan social outputs.

${productContext}

Return ONLY a raw JSON object. Use this exact structure:
{"facebook":{"JP":{"post":""}},"twitter":{"JP":{"thread":["","",""]}},"line":{"message":""},"ai_recommendation":{"suggestions":["","",""],"blurb":""}}

Rules:
- Facebook JP only.
- Twitter JP only with exactly 3 posts.
- LINE only.
- AI recommendations only.
- Return only JSON.`;
}

function buildEbayMarketplacePrompt(productContext: string, numVariations: number): string {
  return `You are an eBay listing expert for automotive electronics.
Generate ONLY eBay content for this product.

${productContext}

Return ONLY a raw JSON object. Use this exact structure:
{"ebay":{"titles":{"UK":["","",""],"US":["","",""],"AU":["","",""],"DE":["","",""]},"description_en":"","description_de":"","specifics":{"Brand":"XTRONS","Model":"","Compatibility":"","Screen Size":"","Connectivity":""}}}

Rules:
- Generate exactly ${numVariations} title variation(s) per market.
- Include UK, US, AU, and DE eBay variants only.
- Do not include any other platform.
- Return only JSON.`;
}

function buildAmazonMarketplacePrompt(productContext: string, numVariations: number): string {
  return `You are an Amazon listing expert for automotive electronics.
Generate ONLY Amazon content for this product.

${productContext}

Return ONLY a raw JSON object. Use this exact structure:
{"amazon":{"UK":{"titles":["","",""],"bullets":["","","","",""],"keywords":"","description":""},"US":{"titles":["","",""],"bullets":["","","","",""],"keywords":"","description":""},"DE":{"titles":["","",""],"bullets":["","","","",""],"keywords":"","description":""}}}

Rules:
- Generate exactly ${numVariations} title variation(s) for UK, US, and DE.
- Do not include Amazon JP or any non-Amazon platform.
- Return only JSON.`;
}

function buildSeoMarketplacePrompt(productContext: string): string {
  return `You are a WooCommerce SEO content expert.
Generate ONLY WooCommerce content for this product.

${productContext}

Return ONLY a raw JSON object. Use this exact structure:
{"woocommerce":{"title":"","short_description":"","long_description":"","meta_title":"","meta_description":""}}

Rules:
- WooCommerce only.
- long_description should use simple HTML only.
- Keep strong SEO coverage.
- Return only JSON.`;
}

function buildSeoSocialPrompt(productContext: string): string {
  return `You are a social content strategist for automotive electronics.
Generate ONLY SEO-role social outputs.

${productContext}

Return ONLY a raw JSON object. Use this exact structure:
{"facebook":{"EN":{"post":""}},"youtube":{"title":"","description":"","tags":"","script_outline":""},"twitter":{"EN":{"thread":["","",""]}},"line":{"message":""},"reddit":{"title":"","body":""},"ai_recommendation":{"suggestions":["","",""],"blurb":""}}

Rules:
- Include Facebook EN, YouTube, Twitter EN, LINE, Reddit, and AI recommendations only.
- Do not include newsletter, B2B, Japanese variants, or marketplace outputs.
- Return only JSON.`;
}

function buildTradingMarketplacePrompt(productContext: string): string {
  return `You are a B2B marketplace copywriter.
Generate ONLY Alibaba content for this product.

${productContext}

Return ONLY a raw JSON object. Use this exact structure:
{"alibaba":{"product_title":"","headline":"","keywords":"","description_html":"","spec_summary":"","moq":"","lead_time":"","price_note":"","oem_odm":"","packaging_shipping":""}}

Rules:
- Alibaba only.
- Emphasize B2B, wholesale, distributor, OEM/ODM suitability.
- Return only JSON.`;
}

function buildTradingSocialPrompt(productContext: string, newsletterTone: string): string {
  return `You are a B2B social copywriter for automotive electronics.
Generate ONLY Trading-role social outputs.

${productContext}

Return ONLY a raw JSON object. Use this exact structure:
{"facebook":{"B2B":{"post":""}},"ai_recommendation":{"suggestions":["","",""],"blurb":""},"newsletter":{"subject":"","preview_text":"","hero_headline":"","intro":"","feature_highlights":[{"icon":"⚡","title":"","description":""},{"icon":"📱","title":"","description":""},{"icon":"🔊","title":"","description":""}],"compatible_vehicles":"","cta_text":"","signoff":"","plain_text":""}}

Rules:
- Facebook B2B only.
- Include AI recommendations and newsletter only.
- Newsletter tone: ${newsletterTone}.
- Do not include YouTube, Twitter, LINE, Reddit, or consumer-facing variants.
- Return only JSON.`;
}

export function buildGenerationPlan(payload: GenerateRequestPayload): GenerationPromptTask[] {
  const role = normalizeRole(payload.userRole);
  const productContext = buildProductContext(payload);
  const newsletterTone = payload.newsletterTone ?? "friendly";
  const numVariations = Math.min(Math.max(Number(payload.titleVariations) || 1, 1), 10);

  switch (role) {
    case "Japan":
      return [
        { key: "amazon_jp", prompt: buildJapanAmazonPrompt(productContext, numVariations), maxTokens: TOKENS.japanAmazon },
        { key: "rakuten", prompt: buildJapanRakutenPrompt(productContext), maxTokens: TOKENS.japanRakuten },
        { key: "yahoo_jp", prompt: buildJapanYahooJpPrompt(productContext), maxTokens: TOKENS.japanYahooJp },
        { key: "yahoo_auction", prompt: buildJapanYahooAuctionPrompt(productContext), maxTokens: TOKENS.japanYahooAuction },
        { key: "social", prompt: buildJapanSocialPrompt(productContext), maxTokens: TOKENS.japanSocial },
      ];
    case "Ebay":
      return [
        { key: "marketplace", prompt: buildEbayMarketplacePrompt(productContext, numVariations), maxTokens: TOKENS.ebayMarketplace },
      ];
    case "Amazon":
      return [
        { key: "marketplace", prompt: buildAmazonMarketplacePrompt(productContext, numVariations), maxTokens: TOKENS.amazonMarketplace },
      ];
    case "SEO":
      return [
        { key: "marketplace", prompt: buildSeoMarketplacePrompt(productContext), maxTokens: TOKENS.seoMarketplace },
        { key: "social", prompt: buildSeoSocialPrompt(productContext), maxTokens: TOKENS.seoSocial },
      ];
    case "Trading":
      return [
        { key: "marketplace", prompt: buildTradingMarketplacePrompt(productContext), maxTokens: TOKENS.tradingMarketplace },
        { key: "social", prompt: buildTradingSocialPrompt(productContext, newsletterTone), maxTokens: TOKENS.tradingSocial },
      ];
    case "Geo":
    default:
      return [
        { key: "marketplace", prompt: buildGeoMarketplacePrompt(productContext, numVariations), maxTokens: TOKENS.geoMarketplace },
        { key: "social", prompt: buildGeoSocialPrompt(productContext, newsletterTone), maxTokens: TOKENS.geoSocial },
      ];
  }
}
