// Role configuration - shared between login and main app
export const ROLE_CONFIG = {
  Geo: {
    allowedModules: [
      "amazon", "ebay", "aliexpress", "alibaba", "yahoo_jp", "rakuten",
      "woocommerce", "facebook", "youtube", "twitter", "line", "reddit",
      "ai_recommendation", "newsletter", "yahoo_auction"
    ],
  },
  Japan: {
    allowedModules: [
      "amazon_jp", "rakuten", "yahoo_jp", "yahoo_auction", "woocommerce",
      "line", "facebook_jp", "twitter_jp", "ai_recommendation"
    ],
  },
  Ebay: {
    allowedModules: ["ebay", "ai_recommendation"],
  },
  Amazon: {
    allowedModules: ["amazon", "ai_recommendation"],
  },
  SEO: {
    allowedModules: [
      "woocommerce", "facebook", "youtube", "twitter",
      "line", "reddit", "ai_recommendation"
    ],
  },
  Trading: {
    allowedModules: [
      "facebook_b2b", "alibaba", "ai_recommendation", "newsletter"
    ],
  },
} as const;

export type RoleName = keyof typeof ROLE_CONFIG;
export type AmazonMarket = "UK" | "US" | "DE" | "JP";
export type FacebookLang = "EN" | "DE" | "JP" | "B2B";
export type TwitterLang = "EN" | "JP";
export type MarketplaceCard = "amazon" | "ebay" | "aliexpress" | "alibaba" | "yahoo_jp" | "rakuten" | "yahoo_auction" | "woocommerce";
export type SocialCard = "facebook" | "youtube" | "twitter" | "line" | "reddit";

const MARKETPLACE_CARD_RULES: Record<MarketplaceCard, readonly string[]> = {
  amazon: ["amazon", "amazon_jp"],
  ebay: ["ebay"],
  aliexpress: ["aliexpress"],
  alibaba: ["alibaba"],
  yahoo_jp: ["yahoo_jp"],
  rakuten: ["rakuten"],
  yahoo_auction: ["yahoo_auction"],
  woocommerce: ["woocommerce"],
};

const SOCIAL_CARD_RULES: Record<SocialCard, readonly string[]> = {
  facebook: ["facebook", "facebook_jp", "facebook_b2b"],
  youtube: ["youtube"],
  twitter: ["twitter", "twitter_jp"],
  line: ["line"],
  reddit: ["reddit"],
};

const MARKETPLACE_CARD_ORDER: Record<RoleName, readonly MarketplaceCard[]> = {
  Geo: ["amazon", "ebay", "aliexpress", "alibaba", "yahoo_jp", "rakuten", "yahoo_auction", "woocommerce"],
  Japan: ["amazon", "rakuten", "yahoo_jp", "yahoo_auction", "woocommerce"],
  Ebay: ["ebay"],
  Amazon: ["amazon"],
  SEO: ["woocommerce"],
  Trading: ["alibaba"],
};

const SOCIAL_CARD_ORDER: Record<RoleName, readonly SocialCard[]> = {
  Geo: ["facebook", "youtube", "twitter", "line", "reddit"],
  Japan: ["facebook", "twitter", "line"],
  Ebay: [],
  Amazon: [],
  SEO: ["facebook", "youtube", "twitter", "line", "reddit"],
  Trading: ["facebook"],
};

const AMAZON_MARKETS_BY_ROLE: Record<RoleName, readonly AmazonMarket[]> = {
  Geo: ["UK", "US", "DE", "JP"],
  Japan: ["JP"],
  Ebay: [],
  Amazon: ["UK", "US", "DE"],
  SEO: [],
  Trading: [],
};

const FACEBOOK_LANGS_BY_ROLE: Record<RoleName, readonly FacebookLang[]> = {
  Geo: ["EN", "DE", "JP"],
  Japan: ["JP"],
  Ebay: [],
  Amazon: [],
  SEO: ["EN"],
  Trading: ["B2B"],
};

const TWITTER_LANGS_BY_ROLE: Record<RoleName, readonly TwitterLang[]> = {
  Geo: ["EN", "JP"],
  Japan: ["JP"],
  Ebay: [],
  Amazon: [],
  SEO: ["EN"],
  Trading: [],
};

export function isModuleAllowed(role: RoleName | null, module: string): boolean {
  if (!role || !(role in ROLE_CONFIG)) return false;
  const config = ROLE_CONFIG[role];
  return (config.allowedModules as readonly string[]).includes(module);
}

export function getVisibleTabs(role: RoleName | null): string[] {
  if (!role || !(role in ROLE_CONFIG)) return [];

  const modules = ROLE_CONFIG[role].allowedModules as readonly string[];
  const tabs: string[] = [];

  const marketplaceModules = ["amazon", "amazon_jp", "ebay", "aliexpress", "alibaba", "yahoo_jp", "rakuten", "yahoo_auction", "woocommerce"];
  if (modules.some((m) => marketplaceModules.includes(m))) {
    tabs.push("Marketplaces");
  }

  const socialModules = ["facebook", "facebook_jp", "facebook_b2b", "youtube", "twitter", "twitter_jp", "line", "reddit"];
  if (modules.some((m) => socialModules.includes(m))) {
    tabs.push("Social Content");
  }

  if (modules.includes("ai_recommendation")) {
    tabs.push("AI Picks");
  }

  if (modules.includes("newsletter")) {
    tabs.push("Newsletter");
  }

  return tabs;
}

export function getVisibleMarketplaceCards(role: RoleName | null): MarketplaceCard[] {
  if (!role || !(role in ROLE_CONFIG)) return [];
  return MARKETPLACE_CARD_ORDER[role].filter((card) =>
    MARKETPLACE_CARD_RULES[card].some((moduleName) => isModuleAllowed(role, moduleName))
  );
}

export function getVisibleSocialCards(role: RoleName | null): SocialCard[] {
  if (!role || !(role in ROLE_CONFIG)) return [];
  return SOCIAL_CARD_ORDER[role].filter((card) =>
    SOCIAL_CARD_RULES[card].some((moduleName) => isModuleAllowed(role, moduleName))
  );
}

export function getVisibleAmazonMarkets(role: RoleName | null): AmazonMarket[] {
  if (!role || !(role in AMAZON_MARKETS_BY_ROLE)) return [];
  return [...AMAZON_MARKETS_BY_ROLE[role]];
}

export function getDefaultAmazonMarket(role: RoleName | null): AmazonMarket {
  return getVisibleAmazonMarkets(role)[0] ?? "UK";
}

export function getVisibleFacebookLangs(role: RoleName | null): FacebookLang[] {
  if (!role || !(role in FACEBOOK_LANGS_BY_ROLE)) return [];
  return [...FACEBOOK_LANGS_BY_ROLE[role]];
}

export function getDefaultFacebookLang(role: RoleName | null): FacebookLang {
  return getVisibleFacebookLangs(role)[0] ?? "EN";
}

export function getVisibleTwitterLangs(role: RoleName | null): TwitterLang[] {
  if (!role || !(role in TWITTER_LANGS_BY_ROLE)) return [];
  return [...TWITTER_LANGS_BY_ROLE[role]];
}

export function getDefaultTwitterLang(role: RoleName | null): TwitterLang {
  return getVisibleTwitterLangs(role)[0] ?? "EN";
}
