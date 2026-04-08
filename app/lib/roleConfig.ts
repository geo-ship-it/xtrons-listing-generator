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
      "amazon_jp", "rakuten", "yahoo_jp", "yahoo_auction", 
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

export function isModuleAllowed(role: RoleName | null, module: string): boolean {
  if (!role || !(role in ROLE_CONFIG)) return false;
  const config = ROLE_CONFIG[role];
  return (config.allowedModules as readonly string[]).includes(module);
}

export function getVisibleTabs(role: RoleName | null): string[] {
  if (!role || !(role in ROLE_CONFIG)) return [];
  
  const modules = ROLE_CONFIG[role].allowedModules as readonly string[];
  const tabs: string[] = [];
  
  // Marketplaces tab - if any marketplace module is allowed
  const marketplaceModules = ["amazon", "amazon_jp", "ebay", "aliexpress", "alibaba", "yahoo_jp", "rakuten", "yahoo_auction", "woocommerce"];
  if (modules.some(m => marketplaceModules.includes(m))) {
    tabs.push("Marketplaces");
  }
  
  // Social Content tab - if any social module is allowed
  const socialModules = ["facebook", "facebook_jp", "facebook_b2b", "youtube", "twitter", "twitter_jp", "line", "reddit"];
  if (modules.some(m => socialModules.includes(m))) {
    tabs.push("Social Content");
  }
  
  // AI Picks - always visible if ai_recommendation is allowed
  if (modules.includes("ai_recommendation")) {
    tabs.push("AI Picks");
  }
  
  // Newsletter - if allowed
  if (modules.includes("newsletter")) {
    tabs.push("Newsletter");
  }
  
  return tabs;
}
