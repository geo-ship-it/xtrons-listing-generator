export interface AccessoryLink {
  sku: string;
  label: string;
  site: string;
  url: string;
}

export interface WhyChooseItem {
  heading: string;
  body: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface CtaBlock {
  headline: string;
  body: string;
  button_text?: string;
}

export interface ExtendedWooContent {
  title: string;
  short_description: string;
  long_description_html: string;
  long_description_text: string;
  meta_title: string;
  meta_description: string;
  accessory_links: AccessoryLink[];
  why_choose_us: WhyChooseItem[];
  faq: FaqItem[];
  cta: CtaBlock;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripTags(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|ul|ol|h[1-6])>/gi, "\n")
    .replace(/<li>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n");
}

export function htmlToPlainText(html: string): string {
  const withSpacing = html
    .replace(/<\/(p|div|h[1-6])>/gi, "\n\n")
    .replace(/<\/(ul|ol)>/gi, "\n")
    .replace(/<li>/gi, "\n- ");

  return stripTags(withSpacing)
    .split("\n")
    .map((line) => line.trim())
    .reduce<string[]>((acc, line) => {
      if (line === "") {
        if (acc.at(-1) !== "") acc.push("");
        return acc;
      }
      acc.push(line);
      return acc;
    }, [])
    .join("\n")
    .trim();
}

export function plainTextToSimpleHtml(text: string): string {
  const normalized = text.replace(/\r/g, "").trim();
  if (!normalized) return "";

  const blocks = normalized.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const htmlBlocks = blocks.map((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const isBulletList = lines.every((line) => /^[-*]\s+/.test(line));
    if (isBulletList) {
      return `<ul>${lines.map((line) => `<li>${escapeHtml(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
    }
    return `<p>${lines.map(escapeHtml).join("<br />")}</p>`;
  });

  return htmlBlocks.join("");
}

export function normalizeWooContent(input: Partial<ExtendedWooContent> & { long_description?: string } = {}): ExtendedWooContent {
  const html = input.long_description_html ?? input.long_description ?? "";
  const text = input.long_description_text ?? htmlToPlainText(html);
  return {
    title: input.title ?? "",
    short_description: input.short_description ?? "",
    long_description_html: html,
    long_description_text: text,
    meta_title: input.meta_title ?? "",
    meta_description: input.meta_description ?? "",
    accessory_links: Array.isArray(input.accessory_links) ? input.accessory_links : [],
    why_choose_us: Array.isArray(input.why_choose_us) ? input.why_choose_us : [],
    faq: Array.isArray(input.faq) ? input.faq : [],
    cta: {
      headline: input.cta?.headline ?? "",
      body: input.cta?.body ?? "",
      button_text: input.cta?.button_text ?? "",
    },
  };
}

export function buildAccessoryLinksHtml(links: AccessoryLink[]): string {
  const validLinks = links.filter((link) => (link.url || "").trim() && (link.label || link.sku || "").trim());
  if (!validLinks.length) return "";
  return `<section><h3>Recommended Accessories</h3><ul>${validLinks
    .map((link) => `<li><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label || link.sku)}</a></li>`)
    .join("")}</ul></section>`;
}

export function buildWhyChooseHtml(items: WhyChooseItem[]): string {
  if (!items.length) return "";
  return `<section><h3>Why Choose XTRONS</h3>${items
    .map((item) => `<p><strong>${escapeHtml(item.heading)}</strong><br />${escapeHtml(item.body)}</p>`)
    .join("")}</section>`;
}

export function buildFaqHtml(items: FaqItem[]): string {
  if (!items.length) return "";
  return `<section><h3>FAQ</h3>${items
    .map((item) => `<p><strong>${escapeHtml(item.question)}</strong><br />${escapeHtml(item.answer)}</p>`)
    .join("")}</section>`;
}

export function buildCtaHtml(cta: CtaBlock): string {
  if (!cta.headline && !cta.body && !cta.button_text) return "";
  const button = cta.button_text ? `<p><strong>${escapeHtml(cta.button_text)}</strong></p>` : "";
  return `<section><h3>${escapeHtml(cta.headline)}</h3><p>${escapeHtml(cta.body)}</p>${button}</section>`;
}

export function buildCombinedWooHtml(
  content: Partial<ExtendedWooContent> & { long_description?: string },
  options: {
    includeAccessories?: boolean;
    includeWhyChoose?: boolean;
    includeFaq?: boolean;
    includeCta?: boolean;
  } = {}
): string {
  const normalized = normalizeWooContent(content);
  const sections = [normalized.long_description_html];
  if (options.includeWhyChoose !== false) sections.push(buildWhyChooseHtml(normalized.why_choose_us));
  if (options.includeFaq !== false) sections.push(buildFaqHtml(normalized.faq));
  if (options.includeAccessories !== false) sections.push(buildAccessoryLinksHtml(normalized.accessory_links));
  if (options.includeCta !== false) sections.push(buildCtaHtml(normalized.cta));
  return sections.filter(Boolean).join("");
}
