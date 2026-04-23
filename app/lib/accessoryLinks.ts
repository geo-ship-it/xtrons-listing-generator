export interface ResolvedAccessoryLink {
  sku: string;
  label: string;
  site: string;
  url: string;
}

const STORE_HOSTS: Array<{ match: RegExp; site: string; origin: string }> = [
  { match: /(^|\.)xtrons\.co\.uk$/i, site: "UK", origin: "https://xtrons.co.uk" },
  { match: /(^|\.)xtrons\.com\.au$/i, site: "AU", origin: "https://xtrons.com.au" },
  { match: /(^|\.)xtrons\.ae$/i, site: "AE", origin: "https://xtrons.ae" },
  { match: /(^|\.)xtrons\.eu$/i, site: "EU", origin: "https://xtrons.eu" },
  { match: /(^|\.)xtrons\.de$/i, site: "DE", origin: "https://xtrons.de" },
  { match: /(^|\.)xtrons\.fr$/i, site: "FR", origin: "https://xtrons.fr" },
  { match: /(^|\.)xtrons\.es$/i, site: "ES", origin: "https://xtrons.es" },
  { match: /(^|\.)xtrons\.it$/i, site: "IT", origin: "https://xtrons.it" },
  { match: /(^|\.)xtrons\.nl$/i, site: "NL", origin: "https://xtrons.nl" },
  { match: /(^|\.)xtrons\.pl$/i, site: "PL", origin: "https://xtrons.pl" },
  { match: /(^|\.)xtrons\.com$/i, site: "COM", origin: "https://xtrons.com" },
];

const ACCESSORY_SKU_PATTERN = /\b(?:[A-Z0-9]+(?:-[A-Z0-9]+)+|[A-Z]{2,}\d{2,}[A-Z0-9-]*)\b/g;
const BLOCKLIST = new Set([
  "ANDROID",
  "AUTO",
  "BLUETOOTH",
  "CAMERA",
  "CARPLAY",
  "DONGLE",
  "FOR",
  "GPS",
  "OEM",
  "OPTIONAL",
  "RADIO",
  "SKU",
  "SUPPORT",
  "USB",
  "WIFI",
  "XTRONS",
]);

function normalizeSku(value: string): string {
  return value.trim().replace(/^[-_]+|[-_]+$/g, "").toUpperCase();
}

function isLikelyAccessorySku(value: string): boolean {
  const sku = normalizeSku(value);
  if (!sku || sku.length < 4 || sku.length > 32) return false;
  if (!/[A-Z]/.test(sku) || !/\d/.test(sku)) return false;
  if (!/^[A-Z0-9-]+$/.test(sku)) return false;
  if (BLOCKLIST.has(sku)) return false;
  return true;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

function getStoreConfig(url: string): { site: string; origin: string } | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const match = STORE_HOSTS.find((store) => store.match.test(hostname));
    return match ? { site: match.site, origin: match.origin } : null;
  } catch {
    return null;
  }
}

export function extractAccessorySkus(markdownOrText: string): string[] {
  const matches = markdownOrText.toUpperCase().match(ACCESSORY_SKU_PATTERN) ?? [];
  return unique(matches.map(normalizeSku).filter(isLikelyAccessorySku));
}

export function inferRegionalStoreFromUrl(url: string): string {
  return getStoreConfig(url)?.site ?? "COM";
}

export function buildRegionalAccessoryUrl(baseUrl: string, sku: string): string | null {
  const store = getStoreConfig(baseUrl);
  const normalizedSku = normalizeSku(sku);
  if (!store || !isLikelyAccessorySku(normalizedSku)) return null;
  return `${store.origin}/${normalizedSku.toLowerCase()}`;
}

export function resolveAccessoryLinks(params: {
  sourceUrl: string;
  targetSite?: string;
  accessorySkus: string[];
}): ResolvedAccessoryLink[] {
  const preferredSite = params.targetSite?.trim().toUpperCase();
  const store = getStoreConfig(params.sourceUrl);
  const site = preferredSite || store?.site || "COM";
  const origin = preferredSite
    ? STORE_HOSTS.find((entry) => entry.site === preferredSite)?.origin
    : store?.origin;

  if (!origin) return [];

  const seen = new Set<string>();
  const links: ResolvedAccessoryLink[] = [];

  for (const rawSku of params.accessorySkus) {
    const sku = normalizeSku(rawSku);
    if (!isLikelyAccessorySku(sku) || seen.has(sku)) continue;
    const url = buildRegionalAccessoryUrl(origin, sku);
    if (!url) continue;
    seen.add(sku);
    links.push({ sku, label: sku, site, url });
  }

  return links;
}
