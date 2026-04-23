"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ROLE_CONFIG,
  RoleName,
  isModuleAllowed,
  getVisibleTabs,
  getVisibleMarketplaceCards,
  getVisibleSocialCards,
  getVisibleAmazonMarkets,
  getDefaultAmazonMarket,
  getVisibleFacebookLangs,
  getDefaultFacebookLang,
  getVisibleTwitterLangs,
  getDefaultTwitterLang,
} from "./lib/roleConfig";

// ─── WooCommerce Language Config ──────────────────────────────────────────────
const WOO_LANGUAGES = [
  { code: "EN", label: "EN", flag: "🇬🇧", name: "English" },
  { code: "DE", label: "DE", flag: "🇩🇪", name: "German" },
  { code: "FR", label: "FR", flag: "🇫🇷", name: "French" },
  { code: "ES", label: "ES", flag: "🇪🇸", name: "Spanish" },
  { code: "IT", label: "IT", flag: "🇮🇹", name: "Italian" },
  { code: "JP", label: "JP", flag: "🇯🇵", name: "Japanese" },
  { code: "NL", label: "NL", flag: "🇳🇱", name: "Dutch" },
  { code: "PL", label: "PL", flag: "🇵🇱", name: "Polish" },
] as const;
type WooLangCode = typeof WOO_LANGUAGES[number]["code"];

// ─── WooContent type ─────────────────────────────────────────────────────────
interface WooContent {
  title: string;
  short_description: string;
  long_description: string;
  meta_title: string;
  meta_description: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  productName: string;
  sku: string;
  category: string;
  keyFeatures: string;
  compatibleCars: string;
  screenSize: string;
  ramRom: string;
  price?: string;
  shortDescription: string;
  sellingPoints: string;
}

interface UploadedImage {
  base64: string;
  mediaType: string;
  preview: string; // object URL for thumbnail
  name: string;
}

interface NewsletterData {
  subject: string;
  preview_text: string;
  hero_headline: string;
  intro: string;
  feature_highlights: { icon: string; title: string; description: string }[];
  compatible_vehicles: string;
  cta_text: string;
  signoff: string;
  plain_text: string;
}

interface AmazonMarketData {
  titles: string[];
  bullets: string[];
  keywords: string;
  description: string;
}
interface AmazonJPData {
  title_jp: string;
  title_en: string;
  bullets_jp: string[];
  keywords_jp: string;
  description_jp: string;
}
interface AmazonData {
  // New multi-market format
  UK?: AmazonMarketData;
  US?: AmazonMarketData;
  DE?: AmazonMarketData;
  JP?: AmazonJPData;
  // Legacy flat format (backward compat)
  titles?: string[];
  title?: string;
  bullets?: string[];
  keywords?: string;
  description?: string;
}

interface AlibabaData {
  product_title: string;
  headline: string;
  keywords: string;
  description_html: string;
  spec_summary: string;
  moq: string;
  lead_time: string;
  price_note: string;
  oem_odm: string;
  packaging_shipping: string;
}

interface GeneratedData {
  amazon: AmazonData;
  ebay: {
    titles: {
      UK: string[];
      US: string[];
      AU: string[];
      DE: string[];
    };
    title?: string; // legacy fallback
    description: string;
    specifics: Record<string, string>;
  };
  aliexpress: { title: string; description: string };
  alibaba?: AlibabaData;
  yahoo_jp: {
    title?: string;
    description?: string;
    product_name?: string;
    catch_copy?: string;
    description_html?: string;
    search_keywords?: string;
    product_code?: string;
    spec_summary?: string;
  };
  rakuten: { title?: string; description?: string; product_name?: string; catch_copy?: string; description_html?: string; search_keywords?: string; item_number?: string };
  woocommerce: WooContent;
  facebook: {
    post?: string;
    EN?: { post: string };
    DE?: { post: string };
    JP?: { post: string };
    B2B?: { post: string };
  };
  youtube: {
    title: string;
    description: string;
    tags: string;
    script_outline: string;
  };
  twitter: {
    thread: string[];
    EN?: { thread: string[] };
    JP?: { thread: string[] };
  };
  line: { message: string };
  reddit: { title: string; body: string };
  ai_recommendation: { suggestions: string[]; blurb: string };
  newsletter?: NewsletterData;
  yahoo_auction?: {
    title: string;
    condition: string;
    category: string;
    starting_price: string;
    buy_now_price?: string;
    description: string;
    tags: string;
    shipping_note?: string;
    payment_note?: string;
  };
}

interface ApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  errors?: Record<string, string>;
  data?: T;
}

async function parseApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const rawText = await res.text();
  try {
    return JSON.parse(rawText) as ApiResponse<T>;
  } catch {
    const message = rawText.trim() || `Server returned HTTP ${res.status}`;
    throw new Error(message);
  }
}

const CATEGORIES = [
  "Car Stereo",
  "Roof Monitor",
  "Accessory",
  "DAB Dongle",
  "Camera",
];
const TABS = ["Marketplaces", "Social Content", "AI Picks", "Newsletter"] as const;
type Tab = (typeof TABS)[number];

const NEWSLETTER_TONES = [
  { id: "friendly", label: "Friendly", emoji: "😊" },
  { id: "professional", label: "Professional", emoji: "💼" },
  { id: "excited", label: "Excited", emoji: "🚀" },
  { id: "educational", label: "Educational", emoji: "📚" },
  { id: "luxury", label: "Luxury", emoji: "✨" },
] as const;
type NewsletterTone = typeof NEWSLETTER_TONES[number]["id"];

// ─── Refinement Bar ───────────────────────────────────────────────────────────
const REFINE_BUTTONS = [
  { id: "engaging", label: "More Engaging", emoji: "🔥" },
  { id: "professional", label: "More Professional", emoji: "💼" },
  { id: "seo", label: "SEO Boost", emoji: "📈" },
  { id: "ai_search", label: "AI Search Optimised", emoji: "🤖" },
  { id: "concise", label: "Concise", emoji: "✂️" },
] as const;

function RefinementBar({
  onRefine,
  onUndo,
  hasPrevious,
  isLoading,
  customText,
  onCustomTextChange,
  showRufus = false,
}: {
  onRefine: (type: string, customPrompt?: string) => void;
  onUndo: () => void;
  hasPrevious: boolean;
  isLoading: boolean;
  customText: string;
  onCustomTextChange: (v: string) => void;
  showRufus?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  // Reset active button when loading finishes
  if (!isLoading && activeBtn !== null) {
    // Will be handled by effect, but we clear on next render
  }

  const handleClick = (type: string) => {
    setActiveBtn(type);
    onRefine(type);
  };

  const handleCustomRefine = () => {
    if (!customText.trim()) return;
    setActiveBtn("custom");
    onRefine("custom", customText);
  };

  return (
    <div style={{ marginTop: 8, marginBottom: 4 }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: expanded ? "#EAF3FF" : "#F5F5F7",
          border: `1px solid ${expanded ? "#C7DFFE" : "#E5E5E7"}`,
          borderRadius: expanded ? "10px 10px 0 0" : 10,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 0.15s ease",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: expanded ? "#0071E3" : "#1d1d1f" }}>
          ✨ Refine this listing
        </span>
        <span style={{ fontSize: 11, color: "#AEAEB2" }}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div
          style={{
            border: "1px solid #C7DFFE",
            borderTop: "none",
            borderRadius: "0 0 10px 10px",
            padding: "14px",
            background: "#FAFEFF",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73", marginBottom: 8 }}>
            Quick Tones
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {REFINE_BUTTONS.map((btn) => (
              <button
                key={btn.id}
                onClick={() => handleClick(btn.id)}
                disabled={isLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  borderRadius: 20,
                  border: "1px solid #C7DFFE",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                  background: isLoading && activeBtn === btn.id ? "#AEAEB2" : "#EAF3FF",
                  color: isLoading && activeBtn === btn.id ? "#FFFFFF" : "#0071E3",
                  opacity: isLoading && activeBtn !== btn.id ? 0.5 : 1,
                }}
              >
                {isLoading && activeBtn === btn.id ? (
                  <svg className="animate-spin" width={11} height={11} fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <span>{btn.emoji}</span>
                )}
                {btn.label}
              </button>
            ))}
            {showRufus && (
              <button
                onClick={() => handleClick("rufus")}
                disabled={isLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  borderRadius: 20,
                  border: "1px solid #D1B4FF",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: isLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                  background: isLoading && activeBtn === "rufus" ? "#AEAEB2" : "#F3EEFF",
                  color: isLoading && activeBtn === "rufus" ? "#FFFFFF" : "#7C3AED",
                  opacity: isLoading && activeBtn !== "rufus" ? 0.5 : 1,
                }}
              >
                {isLoading && activeBtn === "rufus" ? (
                  <svg className="animate-spin" width={11} height={11} fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : "✦ "}
                Amazon Rufus
              </button>
            )}
          </div>

          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73", marginBottom: 6 }}>
            Custom instruction
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={customText}
              onChange={(e) => onCustomTextChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCustomRefine(); }}
              placeholder='e.g. "make it more technical"'
              disabled={isLoading}
              style={{
                flex: 1,
                background: "#F5F5F7",
                border: "1px solid #E5E5E7",
                borderRadius: 8,
                padding: "7px 10px",
                fontSize: 13,
                color: "#1d1d1f",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={handleCustomRefine}
              disabled={isLoading || !customText.trim()}
              style={{
                padding: "7px 14px",
                background: isLoading || !customText.trim() ? "#E5E5E7" : "#0071E3",
                color: isLoading || !customText.trim() ? "#AEAEB2" : "#FFFFFF",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: isLoading || !customText.trim() ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              {isLoading && activeBtn === "custom" ? "…" : "Refine →"}
            </button>
          </div>

          {hasPrevious && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={onUndo}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "6px 12px",
                  background: "transparent",
                  border: "1px solid #E5E5E7",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#6E6E73",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s ease",
                }}
              >
                ↩ Undo refinement
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Image compression helper ─────────────────────────────────────────────────
async function compressImage(file: File, maxWidth = 1200): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Only downscale if needed
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not available"));
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const quality = mimeType === "image/png" ? undefined : 0.85;
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, mediaType: mimeType });
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── URL to base64 helper ─────────────────────────────────────────────────────
async function urlToBase64(url: string): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const mediaType = contentType.split(";")[0].trim();
    if (!["image/jpeg", "image/png", "image/webp"].includes(mediaType)) return null;
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    return { base64, mediaType };
  } catch {
    return null;
  }
}

// ─── Copy Button ──────────────────────────────────────────────────────────────
function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`copy-reveal text-xs font-medium px-2.5 py-1 rounded-md transition-all ${
        copied
          ? "text-[#34C759] bg-[#34C759]/10"
          : "text-[#0071E3] hover:bg-[#0071E3]/08"
      } ${className}`}
      style={{ opacity: copied ? 1 : undefined }}
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}

// ─── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-row mb-4 relative group" style={{ position: "relative" }}>
      <div className="flex items-center justify-between mb-1.5">
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "#6E6E73",
          }}
        >
          {label}
        </span>
        <CopyButton text={value} />
      </div>
      <div
        style={{
          background: "#F5F5F7",
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 14,
          color: "#1d1d1f",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────────
function Card({
  title,
  copyText,
  children,
}: {
  title: string;
  copyText?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="field-row mb-4"
      style={{
        background: "#FFFFFF",
        border: "1px solid #E5E5E7",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #E5E5E7",
          background: "#FAFAFA",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f" }}>
          {title}
        </span>
        {copyText && <CopyButton text={copyText} label="Copy all" className="!opacity-100" />}
      </div>
      <div style={{ padding: "16px" }}>{children}</div>
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
function InputField({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "#6E6E73",
          }}
        >
          {label}
        </span>
        {required && (
          <span style={{ color: "#FF3B30", fontSize: 11 }}>*</span>
        )}
        {hint && (
          <span style={{ fontSize: 11, color: "#AEAEB2", marginLeft: 2 }}>
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#F5F5F7",
  border: "none",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  color: "#1d1d1f",
  outline: "none",
  transition: "box-shadow 0.15s ease, background 0.15s ease",
  fontFamily: "inherit",
};

function TextInput({
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  prefix,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  prefix?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      {prefix && (
        <span
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#AEAEB2",
            fontSize: 14,
            pointerEvents: "none",
          }}
        >
          {prefix}
        </span>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          ...inputStyle,
          paddingLeft: prefix ? 24 : 12,
          boxShadow: focused ? "0 0 0 3px rgba(0, 113, 227, 0.25)" : "none",
          background: focused ? "#FFFFFF" : "#F5F5F7",
        }}
      />
    </div>
  );
}

function TextArea({
  name,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        resize: "none",
        lineHeight: 1.5,
        minHeight: rows * 24,
        boxShadow: focused ? "0 0 0 3px rgba(0, 113, 227, 0.25)" : "none",
        background: focused ? "#FFFFFF" : "#F5F5F7",
      }}
    />
  );
}

function SelectInput({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
}) {
  const [focused, setFocused] = useState(false);
  return (
    <select
      name={name}
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...inputStyle,
        cursor: "pointer",
        appearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236E6E73' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: 32,
        boxShadow: focused ? "0 0 0 3px rgba(0, 113, 227, 0.25)" : "none",
        background: focused ? "#FFFFFF" : "#F5F5F7",
      }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Home() {
  const [formData, setFormData] = useState<FormData>({
    productName: "",
    sku: "",
    category: "Car Stereo",
    keyFeatures: "",
    compatibleCars: "",
    screenSize: "",
    ramRom: "",
    price: "",
    shortDescription: "",
    sellingPoints: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedData, setGeneratedData] = useState<GeneratedData | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Marketplaces");
  const [language] = useState("EN");
  const [titleVariations, setTitleVariations] = useState(1);
  const router = useRouter();
  const [userRole, setUserRole] = useState<RoleName | null>(null);
  const [activeEbayMarket, setActiveEbayMarket] = useState<"UK" | "US" | "AU" | "DE">("UK");
  const [activeAmazonMarket, setActiveAmazonMarket] = useState<"UK" | "US" | "DE" | "JP">("UK");
  const [newsletterTone, setNewsletterTone] = useState<NewsletterTone>("friendly");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterToneChanged, setNewsletterToneChanged] = useState(false);
  const [activeFacebookLang, setActiveFacebookLang] = useState<"EN" | "DE" | "JP" | "B2B">("EN");
  const [activeTwitterLang, setActiveTwitterLang] = useState<"EN" | "JP">("EN");

  // WooCommerce multi-language state
  const [wooTranslations, setWooTranslations] = useState<Record<string, WooContent>>({});
  const [wooLangLoading, setWooLangLoading] = useState<Record<string, boolean>>({});
  const [activeWooLang, setActiveWooLang] = useState<WooLangCode>("EN");

  // Refinement state (per platform)
  const [refinedContent, setRefinedContent] = useState<Record<string, unknown>>({});
  const [previousContent, setPreviousContent] = useState<Record<string, unknown>>({});
  const [refineLoading, setRefineLoading] = useState<Record<string, boolean>>({});
  const [customRefineText, setCustomRefineText] = useState<Record<string, string>>({});

  // URL import state
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");
  const [importUrlFocused, setImportUrlFocused] = useState(false);
  const [urlImages, setUrlImages] = useState<UploadedImage[]>([]);

  // Image upload state
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wooImportInputRef = useRef<HTMLInputElement>(null);

  // Combined images (URL-extracted + uploaded)
  const allImages = [...urlImages, ...uploadedImages];

  // Auth check on mount
  useEffect(() => {
    const role = localStorage.getItem("userRole") as RoleName | null;
    if (!role || !(role in ROLE_CONFIG)) {
      router.push("/login");
      return;
    }
    setUserRole(role);
  }, [router]);

  useEffect(() => {
    if (!userRole) return;
    setActiveAmazonMarket(getDefaultAmazonMarket(userRole));
    setActiveFacebookLang(getDefaultFacebookLang(userRole));
    setActiveTwitterLang(getDefaultTwitterLang(userRole));
  }, [userRole]);


  const parseCsvRow = (line: string) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current);
    return result.map((v) => v.trim());
  };

  const exportWooFormat = (content: WooContent, langCode: string) => {
    const text = [
      `WooCommerce Export (${langCode})`,
      "",
      `Product Title: ${content.title}`,
      "",
      "Short Description:",
      content.short_description,
      "",
      "Long Description (HTML):",
      content.long_description,
      "",
      `SEO Meta Title: ${content.meta_title}`,
      "",
      `SEO Meta Description: ${content.meta_description}`,
      "",
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `woocommerce-${langCode.toLowerCase()}-${(formData.sku || formData.productName || "listing").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportWooCsv = (content: WooContent, langCode: string) => {
    const headers = [
      "Name",
      "SKU",
      "Short description",
      "Description",
      "Slug",
      "Categories",
      "Tags",
      "Regular price",
      "Meta: title",
      "Meta: description",
      "Language",
    ];

    const escapeCsv = (value: string) => `"${String(value || "").replace(/"/g, '""')}"`;
    const row = [
      content.title,
      formData.sku || "",
      content.short_description,
      content.long_description,
      formData.productName.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, ""),
      formData.category || "",
      formData.compatibleCars || "",
      formData.price || "",
      content.meta_title,
      content.meta_description,
      langCode,
    ];

    const csv = `${headers.join(",")}\n${row.map(escapeCsv).join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `woocommerce-${langCode.toLowerCase()}-${(formData.sku || formData.productName || "listing").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportWooCsv = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) throw new Error("CSV must include headers and at least one data row");

    const headers = parseCsvRow(lines[0]).map((h) => h.toLowerCase());
    const values = parseCsvRow(lines[1]);
    const get = (...keys: string[]) => {
      for (const key of keys) {
        const idx = headers.indexOf(key.toLowerCase());
        if (idx >= 0) return values[idx] || "";
      }
      return "";
    };

    setFormData((prev) => ({
      ...prev,
      productName: get("name", "title") || prev.productName,
      sku: get("sku") || prev.sku,
      category: get("categories") || prev.category,
      price: get("regular price", "price") || prev.price,
      shortDescription: get("short description", "excerpt") || prev.shortDescription,
      compatibleCars: get("tags") || prev.compatibleCars,
    }));

    setGeneratedData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        woocommerce: {
          title: get("name", "title") || prev.woocommerce.title,
          short_description: get("short description", "excerpt") || prev.woocommerce.short_description,
          long_description: get("description", "long description") || prev.woocommerce.long_description,
          meta_title: get("meta: title", "meta title") || prev.woocommerce.meta_title,
          meta_description: get("meta: description", "meta description") || prev.woocommerce.meta_description,
        },
      };
    });
  };

  const exportAlibabaFormat = (content: AlibabaData) => {
    const text = [
      "Alibaba Export",
      "",
      `Product Title: ${content.product_title}`,
      "",
      `Headline: ${content.headline}`,
      "",
      `Core Keywords: ${content.keywords}`,
      "",
      "Description (HTML):",
      content.description_html,
      "",
      `Spec Summary: ${content.spec_summary}`,
      `MOQ: ${content.moq}`,
      `Lead Time: ${content.lead_time}`,
      `Price / FOB Note: ${content.price_note}`,
      `OEM / ODM: ${content.oem_odm}`,
      `Packaging / Shipping: ${content.packaging_shipping}`,
      "",
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alibaba-${(formData.sku || formData.productName || "listing").toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportStatus("idle");
    setUrlImages([]);
    try {
      const res = await fetch("/api/scrape-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: importUrl.trim() }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Extraction failed");
      const d = json.data;
      setFormData((prev) => ({
        productName: d.productName || prev.productName,
        sku: d.sku || prev.sku,
        category: d.category && ["Car Stereo", "Roof Monitor", "Accessory", "DAB Dongle", "Camera"].includes(d.category) ? d.category : prev.category,
        keyFeatures: d.keyFeatures || prev.keyFeatures,
        compatibleCars: d.compatibleCars || prev.compatibleCars,
        screenSize: d.screenSize || prev.screenSize,
        ramRom: d.ramRom || prev.ramRom,
        price: d.price ? String(d.price) : prev.price,
        shortDescription: d.shortDescription || prev.shortDescription,
        sellingPoints: d.sellingPoints || prev.sellingPoints,
      }));

      // Fetch and convert URL images to base64
      if (d.imageUrls && d.imageUrls.length > 0) {
        const fetched: UploadedImage[] = [];
        for (const imgUrl of d.imageUrls.slice(0, 5)) {
          const result = await urlToBase64(imgUrl);
          if (result) {
            fetched.push({
              base64: result.base64,
              mediaType: result.mediaType,
              preview: imgUrl,
              name: imgUrl.split("/").pop() || "product-image",
            });
          }
          if (fetched.length >= 5) break;
        }
        setUrlImages(fetched);
      }

      setImportStatus("success");
    } catch {
      setImportStatus("error");
    } finally {
      setImporting(false);
    }
  };

  const processImageFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const remaining = 5 - uploadedImages.length;
    if (remaining <= 0) return;

    const toProcess = fileArr.slice(0, remaining);
    const newImages: UploadedImage[] = [];

    for (const file of toProcess) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) continue;
      try {
        const preview = URL.createObjectURL(file);
        // Compress if > 2MB
        const needsCompress = file.size > 2 * 1024 * 1024;
        let base64: string;
        let mediaType: string;
        if (needsCompress) {
          const compressed = await compressImage(file);
          base64 = compressed.base64;
          mediaType = compressed.mediaType;
        } else {
          const result = await new Promise<{ base64: string; mediaType: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              resolve({
                base64: dataUrl.split(",")[1],
                mediaType: file.type,
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          base64 = result.base64;
          mediaType = result.mediaType;
        }
        newImages.push({ base64, mediaType, preview, name: file.name });
      } catch {
        // Skip failed images
      }
    }

    setUploadedImages((prev) => [...prev, ...newImages].slice(0, 5));
  }, [uploadedImages.length]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processImageFiles(e.target.files);
    }
    // Reset input so the same file can be re-uploaded if needed
    e.target.value = "";
  };

  const handleRemoveImage = (index: number, fromUrl: boolean) => {
    if (fromUrl) {
      setUrlImages((prev) => prev.filter((_, i) => i !== index));
    } else {
      setUploadedImages((prev) => {
        const img = prev[index];
        if (img?.preview?.startsWith("blob:")) URL.revokeObjectURL(img.preview);
        return prev.filter((_, i) => i !== index);
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) {
      processImageFiles(e.dataTransfer.files);
    }
  };

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    },
    []
  );

  const handleRefine = async (platform: string, currentContent: unknown, refinementType: string, customPrompt?: string) => {
    if (!generatedData) return;
    setRefineLoading((prev) => ({ ...prev, [platform]: true }));
    setPreviousContent((prev) => ({ ...prev, [platform]: currentContent }));
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          currentContent,
          refinementType,
          customPrompt,
          productContext: {
            productName: formData.productName,
            category: formData.category,
            compatibleCars: formData.compatibleCars,
            keyFeatures: formData.keyFeatures,
          },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Refinement failed");
      setRefinedContent((prev) => ({ ...prev, [platform]: json.data }));
      // Merge refined content back into generatedData
      setGeneratedData((prev) => {
        if (!prev) return prev;
        return { ...prev, [platform]: json.data };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refinement failed");
    } finally {
      setRefineLoading((prev) => ({ ...prev, [platform]: false }));
    }
  };

  const handleUndoRefine = (platform: string, originalContent: unknown) => {
    setGeneratedData((prev) => {
      if (!prev) return prev;
      return { ...prev, [platform]: originalContent };
    });
    setRefinedContent((prev) => {
      const n = { ...prev };
      delete n[platform];
      return n;
    });
    setPreviousContent((prev) => {
      const n = { ...prev };
      delete n[platform];
      return n;
    });
  };

  const handleGenerate = async () => {
    if (!formData.productName) {
      setError("Product name is required.");
      return;
    }
    if (!userRole) {
      setError("User role not set. Please log in again.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          language,
          newsletterTone,
          titleVariations,
          userRole,
        }),
      });
      const json = await parseApiResponse<GeneratedData>(res);
      const moduleMessage = json.errors && Object.keys(json.errors).length > 0
        ? Object.entries(json.errors).map(([key, value]) => `${key}: ${value}`).join(" | ")
        : "";
      if (!res.ok || !json.success) {
        throw new Error((json.error || (moduleMessage ? `Generation failed (${moduleMessage})` : "Generation failed")).trim());
      }
      setGeneratedData(json.data as GeneratedData);
      if (moduleMessage) {
        setError(`Generated with partial issues: ${moduleMessage}`);
      }
      setNewsletterToneChanged(false);
      setActiveTab("Marketplaces");
      setWooTranslations({});
      setActiveWooLang("EN");
      setRefinedContent({});
      setPreviousContent({});
      setRefineLoading({});
      setCustomRefineText({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateNewsletter = async () => {
    if (!generatedData) return;
    setNewsletterLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, newsletterTone }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Newsletter regeneration failed");
      setGeneratedData((prev) => prev ? { ...prev, newsletter: json.data } : prev);
      setNewsletterToneChanged(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setNewsletterLoading(false);
    }
  };

  const handleGenerateWooTranslation = async (langCode: WooLangCode) => {
    if (!generatedData) return;
    const lang = WOO_LANGUAGES.find((l) => l.code === langCode);
    if (!lang) return;

    setWooLangLoading((prev) => ({ ...prev, [langCode]: true }));
    try {
      const res = await fetch("/api/translate-woo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wooContent: generatedData.woocommerce,
          targetLanguage: lang.name,
          targetCode: langCode,
          productName: formData.productName,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Translation failed");
      setWooTranslations((prev) => ({ ...prev, [langCode]: json.data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setWooLangLoading((prev) => ({ ...prev, [langCode]: false }));
    }
  };

  // Shared thumbnail renderer
  const renderThumbnails = (images: UploadedImage[], fromUrl: boolean) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      {images.map((img, i) => (
        <div key={i} style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.preview}
            alt={img.name}
            style={{
              width: 52,
              height: 52,
              objectFit: "cover",
              borderRadius: 8,
              border: "1px solid #E5E5E7",
            }}
          />
          <button
            onClick={() => handleRemoveImage(i, fromUrl)}
            title="Remove"
            style={{
              position: "absolute",
              top: -5,
              right: -5,
              width: 18,
              height: 18,
              background: "#1d1d1f",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              lineHeight: 1,
              fontWeight: 700,
              padding: 0,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F7" }}>
      {/* ── Header ── */}
      <header
        style={{
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderBottom: "1px solid #E5E5E7",
          padding: "0 32px",
          height: 52,
          display: "flex",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: 1600,
            width: "100%",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "#1d1d1f",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "-0.5px",
              }}
            >
              X
            </div>
            <div>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#1d1d1f",
                  letterSpacing: "-0.3px",
                }}
              >
                XTRONS Listing Generator
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "#6E6E73",
                  marginLeft: 8,
                }}
              >
                Powered by DeepSeek AI
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {userRole && (
              <div
                style={{
                  fontSize: 12,
                  color: "#0071E3",
                  background: "#EAF3FF",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontWeight: 600,
                }}
              >
                {userRole}
              </div>
            )}
            <button
              onClick={() => {
                localStorage.removeItem("userRole");
                localStorage.removeItem("allowedModules");
                router.push("/login");
              }}
              style={{
                fontSize: 12,
                color: "#FF3B30",
                background: "transparent",
                border: "1px solid #FF3B30",
                padding: "4px 10px",
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Layout ── */}
      <div
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "24px 32px",
          display: "flex",
          gap: 24,
          height: "calc(100vh - 52px)",
        }}
      >
        {/* ── Left: Input Form ── */}
        <div
          style={{
            width: 400,
            flexShrink: 0,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              border: "1px solid #E5E5E7",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
            }}
          >
            {/* ── URL Import ── */}
            <div
              style={{
                marginBottom: 16,
                padding: "16px",
                background: "#F5F5F7",
                borderRadius: 12,
                border: "1px solid #E5E5E7",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "#6E6E73",
                  marginBottom: 10,
                }}
              >
                Import from URL
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => { setImportUrl(e.target.value); setImportStatus("idle"); }}
                  onFocus={() => setImportUrlFocused(true)}
                  onBlur={() => setImportUrlFocused(false)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleImportUrl(); }}
                  placeholder="https://xtrons.com/product/..."
                  style={{
                    flex: 1,
                    background: importUrlFocused ? "#FFFFFF" : "#EBEBED",
                    border: "none",
                    borderRadius: 10,
                    padding: "9px 12px",
                    fontSize: 13,
                    color: "#1d1d1f",
                    outline: "none",
                    transition: "box-shadow 0.15s ease, background 0.15s ease",
                    fontFamily: "inherit",
                    boxShadow: importUrlFocused ? "0 0 0 3px rgba(0, 113, 227, 0.25)" : "none",
                  }}
                />
                <button
                  onClick={handleImportUrl}
                  disabled={importing || !importUrl.trim()}
                  style={{
                    height: 36,
                    padding: "0 14px",
                    background: "#FFFFFF",
                    color: importing || !importUrl.trim() ? "#AEAEB2" : "#0071E3",
                    border: `1.5px solid ${importing || !importUrl.trim() ? "#D1D1D6" : "#0071E3"}`,
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: importing || !importUrl.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "inherit",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {importing ? (
                    <>
                      <svg className="animate-spin" width={13} height={13} fill="none" viewBox="0 0 24 24">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Fetching…
                    </>
                  ) : (
                    "Import"
                  )}
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: 11, color: "#AEAEB2" }}>
                {importStatus === "idle" && "Paste any product URL to auto-fill the form"}
                {importStatus === "success" && (
                  <span style={{ color: "#34C759", fontWeight: 500 }}>✓ Form filled from URL</span>
                )}
                {importStatus === "error" && (
                  <span style={{ color: "#FF3B30" }}>Could not extract product data. Please fill manually.</span>
                )}
              </div>

              {/* URL-extracted image thumbnails */}
              {urlImages.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: "#34C759", fontWeight: 500, marginBottom: 4 }}>
                    📷 {urlImages.length} product image{urlImages.length > 1 ? "s" : ""} found — included in generation
                  </div>
                  {renderThumbnails(urlImages, true)}
                </div>
              )}
            </div>

            {/* ── Image Upload ── */}
            <div
              style={{
                marginBottom: 24,
                padding: "16px",
                background: "#F5F5F7",
                borderRadius: 12,
                border: "1px solid #E5E5E7",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "#6E6E73",
                  marginBottom: 10,
                }}
              >
                📷 Product Images <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span>
              </div>

              {/* Drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => uploadedImages.length < 5 && fileInputRef.current?.click()}
                style={{
                  border: `1.5px dashed ${dragOver ? "#0071E3" : "#E5E5E7"}`,
                  background: dragOver ? "#EAF3FF" : "#FAFAFA",
                  borderRadius: 12,
                  padding: "16px 12px",
                  textAlign: "center",
                  cursor: uploadedImages.length >= 5 ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease",
                  opacity: uploadedImages.length >= 5 ? 0.5 : 1,
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 4 }}>⬆️</div>
                <div style={{ fontSize: 13, color: "#1d1d1f", fontWeight: 500 }}>
                  Drag & drop or click to upload
                </div>
                <div style={{ fontSize: 11, color: "#AEAEB2", marginTop: 3 }}>
                  JPG, PNG, WEBP — up to 5 images
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleFileInputChange}
                style={{ display: "none" }}
              />

              {/* Uploaded thumbnails */}
              {uploadedImages.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {renderThumbnails(uploadedImages, false)}
                </div>
              )}

              {/* Status */}
              {allImages.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 11, color: "#34C759", fontWeight: 500 }}>
                  ✓ {allImages.length} image{allImages.length > 1 ? "s" : ""} uploaded
                </div>
              )}
            </div>

            <h2
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "#6E6E73",
                marginBottom: 20,
              }}
            >
              Product Details
            </h2>

            <InputField label="Product Name" required>
              <TextInput
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                placeholder='e.g. XTRONS 10.1" Android 13 Car Stereo'
              />
            </InputField>

            <InputField label="SKU / Model">
              <TextInput
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                placeholder="e.g. TIB101L"
              />
            </InputField>

            <InputField label="Title Variations" hint="(per market)">
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 3, 5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTitleVariations(n)}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 8,
                      border: "none",
                      fontSize: 13,
                      fontWeight: titleVariations === n ? 700 : 500,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.15s ease",
                      background: titleVariations === n ? "#0071E3" : "#F5F5F7",
                      color: titleVariations === n ? "#FFFFFF" : "#1d1d1f",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </InputField>

            <InputField label="Category">
              <SelectInput
                name="category"
                value={formData.category}
                onChange={handleChange}
                options={CATEGORIES}
              />
            </InputField>

            <InputField label="Key Features" hint="(one per line)">
              <TextArea
                name="keyFeatures"
                value={formData.keyFeatures}
                onChange={handleChange}
                rows={4}
                placeholder={"Wireless Apple CarPlay\nAndroid Auto\n4K Dash Cam Input\nDSP Audio Equaliser"}
              />
            </InputField>

            <InputField label="Compatible Cars">
              <TextArea
                name="compatibleCars"
                value={formData.compatibleCars}
                onChange={handleChange}
                rows={3}
                placeholder={"BMW 3 Series F30 2012-2019\nVW Golf Mk7 2013-2020"}
              />
            </InputField>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <InputField label="Screen Size" hint="(opt)">
                <TextInput
                  name="screenSize"
                  value={formData.screenSize}
                  onChange={handleChange}
                  placeholder='10.1"'
                />
              </InputField>
              <InputField label="RAM / ROM" hint="(opt)">
                <TextInput
                  name="ramRom"
                  value={formData.ramRom}
                  onChange={handleChange}
                  placeholder="4GB / 64GB"
                />
              </InputField>
            </div>

            <InputField label="Short Description" hint="(2–3 sentences)">
              <TextArea
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleChange}
                rows={3}
                placeholder="Brief overview of what this product does and who it's for..."
              />
            </InputField>

            <InputField label="Selling Points / USPs">
              <TextArea
                name="sellingPoints"
                value={formData.sellingPoints}
                onChange={handleChange}
                rows={3}
                placeholder="What makes this better than competitors? Key advantages..."
              />
            </InputField>

            {error && (
              <div
                style={{
                  background: "#FFF2F0",
                  border: "1px solid #FFCCC7",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#FF3B30",
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                width: "100%",
                height: 44,
                background: loading ? "#AEAEB2" : "#0071E3",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontFamily: "inherit",
                transition: "background 0.15s ease",
                letterSpacing: "-0.2px",
              }}
              onMouseEnter={(e) => {
                if (!loading) (e.currentTarget.style.background = "#0077ED");
              }}
              onMouseLeave={(e) => {
                if (!loading) (e.currentTarget.style.background = "#0071E3");
              }}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin"
                    width={16}
                    height={16}
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      style={{ opacity: 0.25 }}
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      style={{ opacity: 0.75 }}
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating listings…
                </>
              ) : (
                <>
                  <svg width={16} height={16} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {allImages.length > 0
                    ? `Generate ${userRole ?? "All"} Content · ${allImages.length} image${allImages.length > 1 ? "s" : ""}`
                    : `Generate ${userRole ?? "All"} Content`}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Right: Output ── */}
        <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
          {!generatedData && !loading && (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    background: "#FFFFFF",
                    border: "1px solid #E5E5E7",
                    borderRadius: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <svg width={28} height={28} fill="none" stroke="#AEAEB2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <p style={{ fontSize: 15, fontWeight: 500, color: "#1d1d1f", marginBottom: 6 }}>
                  Ready to generate
                </p>
                <p style={{ fontSize: 13, color: "#6E6E73" }}>
                  Fill in the product details and click Generate All Listings
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    background: "#FFFFFF",
                    border: "1px solid #E5E5E7",
                    borderRadius: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <svg
                    className="animate-spin"
                    width={28}
                    height={28}
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle style={{ opacity: 0.15 }} cx="12" cy="12" r="10" stroke="#0071E3" strokeWidth="3" />
                    <path style={{ opacity: 0.85 }} fill="#0071E3" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <p style={{ fontSize: 15, fontWeight: 500, color: "#1d1d1f", marginBottom: 6 }}>
                  Generating listings…
                </p>
                <p style={{ fontSize: 13, color: "#6E6E73" }}>
                  DeepSeek is generating only the modules allowed for this role
                </p>
              </div>
            </div>
          )}

          {generatedData && !loading && (() => {
            const visibleTabs = getVisibleTabs(userRole);
            const visibleMarketplaceCards = getVisibleMarketplaceCards(userRole);
            const visibleSocialCards = getVisibleSocialCards(userRole);
            const visibleAmazonMarkets = getVisibleAmazonMarkets(userRole);
            const visibleFacebookLangs = getVisibleFacebookLangs(userRole);
            const visibleTwitterLangs = getVisibleTwitterLangs(userRole);

            // Set active tab to first visible if current is not visible
            if (visibleTabs.length > 0 && !visibleTabs.includes(activeTab)) {
              setActiveTab(visibleTabs[0] as Tab);
            }
            return (
            <div className="fade-in">
              {/* ── Tab Bar ── */}
              <div
                style={{
                  display: "flex",
                  gap: 0,
                  borderBottom: "1px solid #E5E5E7",
                  marginBottom: 24,
                  background: "#FFFFFF",
                  borderRadius: "12px 12px 0 0",
                  padding: "0 4px",
                  border: "1px solid #E5E5E7",
                  borderBottomLeftRadius: 0,
                  borderBottomRightRadius: 0,
                }}
              >
                {visibleTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as Tab)}
                    style={{
                      flex: 1,
                      padding: "13px 12px",
                      fontSize: 13,
                      fontWeight: 500,
                      color: activeTab === tab ? "#0071E3" : "#6E6E73",
                      background: "none",
                      border: "none",
                      borderBottom: activeTab === tab ? "2px solid #0071E3" : "2px solid transparent",
                      cursor: "pointer",
                      transition: "color 0.15s ease",
                      fontFamily: "inherit",
                      letterSpacing: "-0.1px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tab === "Newsletter" ? "✉️ Newsletter" : tab}
                  </button>
                ))}
              </div>

              {/* ── Marketplaces ── */}
              {activeTab === "Marketplaces" && (
                <div>
                  {/* Amazon — Multi-Market Tabs */}
                  {visibleMarketplaceCards.includes("amazon") && (() => {
                    const amazonMarkets = [
                      { key: "UK" as const, flag: "🇬🇧", label: "UK" },
                      { key: "US" as const, flag: "🇺🇸", label: "US" },
                      { key: "DE" as const, flag: "🇩🇪", label: "DE" },
                      { key: "JP" as const, flag: "🇯🇵", label: "JP" },
                    ];

                    // Resolve active market data
                    const amz = generatedData.amazon;
                    // For JP tab
                    const jpData = amz.JP as AmazonJPData | undefined;
                    // For UK/US/DE — new format or legacy fallback
                    const getMarketData = (mkt: "UK" | "US" | "DE"): AmazonMarketData | null => {
                      if (amz[mkt]) return amz[mkt] as AmazonMarketData;
                      // Legacy flat format: treat as UK
                      if (mkt === "UK" && (amz.titles || amz.title)) {
                        return {
                          titles: Array.isArray(amz.titles) ? amz.titles : [amz.title || ""],
                          bullets: Array.isArray(amz.bullets) ? amz.bullets : [],
                          keywords: amz.keywords || "",
                          description: amz.description || "",
                        };
                      }
                      return null;
                    };

                    const activeMarketData = activeAmazonMarket !== "JP" ? getMarketData(activeAmazonMarket) : null;

                    // Labels per market
                    const isDE = activeAmazonMarket === "DE";
                    const isJP = activeAmazonMarket === "JP";
                    const titleLabel = isDE ? "Titel" : isJP ? "タイトル" : "Title Variation";
                    const bulletsLabel = isDE ? "Stichpunkte" : isJP ? "箇条書き" : "Bullet Points";
                    const keywordsLabel = isDE ? "Schlüsselwörter" : isJP ? "キーワード" : "Search Terms / Keywords";
                    const descLabel = isDE ? "Beschreibung" : isJP ? "商品説明" : "Description";

                    // Copy text for active tab
                    let copyText = "";
                    if (isJP && jpData) {
                      copyText = [
                        `Japanese Title: ${jpData.title_jp}`,
                        `\nEnglish Title: ${jpData.title_en}`,
                        `\nBullets (JP):\n${(jpData.bullets_jp || []).map((b, i) => `${i+1}. ${b}`).join("\n")}`,
                        `\nKeywords (JP): ${jpData.keywords_jp}`,
                        `\nDescription (JP): ${jpData.description_jp}`,
                      ].join("");
                    } else if (activeMarketData) {
                      copyText = [
                        `Titles:\n${activeMarketData.titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
                        `\nBullets:\n${activeMarketData.bullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}`,
                        `\nKeywords: ${activeMarketData.keywords}`,
                        `\nDescription: ${activeMarketData.description}`,
                      ].join("");
                    }

                    return (
                    <>
                    <div style={{ background: "#FFFFFF", border: "1px solid #E5E5E7", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                      {/* Card header */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #E5E5E7", background: "#FAFAFA" }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f" }}>
                          {visibleAmazonMarkets.length === 1 && visibleAmazonMarkets[0] === "JP" ? "📦 Amazon JP" : "📦 Amazon"}
                        </span>
                        {copyText && <CopyButton text={copyText} label="Copy all" className="!opacity-100" />}
                      </div>

                      {/* Market tabs */}
                      <div style={{ display: "flex", gap: 0, padding: "0 16px", borderBottom: "1px solid #E5E5E7", background: "#FAFAFA" }}>
                        {visibleAmazonMarkets.map((mkt) => {
                          const m = amazonMarkets.find((market) => market.key === mkt);
                          if (!m) return null;
                          return (
                          <button
                            key={m.key}
                            onClick={() => setActiveAmazonMarket(m.key)}
                            style={{
                              display: "flex", alignItems: "center", gap: 4,
                              padding: "9px 14px", fontSize: 13, fontWeight: activeAmazonMarket === m.key ? 600 : 400,
                              color: activeAmazonMarket === m.key ? "#1d1d1f" : "#AEAEB2",
                              background: "none", border: "none",
                              borderBottom: activeAmazonMarket === m.key ? "2px solid #0071E3" : "2px solid transparent",
                              cursor: "pointer", transition: "all 0.15s ease", fontFamily: "inherit",
                            }}
                          >
                            <span style={{ fontSize: 16 }}>{m.flag}</span>
                            <span>{m.label}</span>
                          </button>
                          );
                        })}
                      </div>

                      {/* Tab content */}
                      <div style={{ padding: "16px" }}>
                        {isJP && jpData ? (
                          <>
                            <div style={{ marginBottom: 10, padding: "6px 10px", background: "#FFF3E0", borderRadius: 8, fontSize: 12, color: "#E65100", fontWeight: 500 }}>
                              🇯🇵 日本語コンテンツ — Amazon.co.jp向けに最適化
                            </div>
                            {/* JP Title */}
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73" }}>
                                  {titleLabel} (JP) · max 150 chars
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ fontSize: 10, color: jpData.title_jp.length > 150 ? "#FF3B30" : "#AEAEB2" }}>{jpData.title_jp.length}/150</span>
                                  <CopyButton text={jpData.title_jp} />
                                </div>
                              </div>
                              <div style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "#1d1d1f", lineHeight: 1.6 }}>
                                {jpData.title_jp}
                              </div>
                            </div>
                            <Field label="English Title Variant" value={jpData.title_en} />
                            {/* JP Bullets */}
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73" }}>
                                  {bulletsLabel} (5)
                                </span>
                                <CopyButton text={(jpData.bullets_jp || []).join("\n")} label="Copy all" className="!opacity-100" />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {(jpData.bullets_jp || []).map((bullet, i) => (
                                  <div key={i} className="field-row" style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#F5F5F7", borderRadius: 10, padding: "10px 12px" }}>
                                    <span style={{ color: "#0071E3", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                                    <span style={{ fontSize: 13, color: "#1d1d1f", flex: 1, lineHeight: 1.6 }}>{bullet}</span>
                                    <CopyButton text={bullet} />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <Field label={`${keywordsLabel} (日本語)`} value={jpData.keywords_jp} />
                            <Field label={descLabel} value={jpData.description_jp} />
                          </>
                        ) : activeMarketData ? (
                          <>
                            {isDE && (
                              <div style={{ marginBottom: 10, padding: "6px 10px", background: "#E8F4F8", borderRadius: 8, fontSize: 12, color: "#1A6B8A", fontWeight: 500 }}>
                                🇩🇪 Deutschsprachiger Inhalt — optimiert für Amazon.de
                              </div>
                            )}
                            {/* Titles */}
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73" }}>
                                  {titleLabel}{activeMarketData.titles.length > 1 ? (isDE ? " (Varianten)" : " Variations") : ""} · max 200 chars
                                </span>
                                <CopyButton text={activeMarketData.titles.join("\n")} label="Copy all" className="!opacity-100" />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {activeMarketData.titles.map((t, i) => (
                                  <div key={i} className="field-row" style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#F5F5F7", borderRadius: 10, padding: "10px 12px" }}>
                                    {activeMarketData.titles.length > 1 && (
                                      <span style={{ color: "#0071E3", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>V{i + 1}</span>
                                    )}
                                    <span style={{ fontSize: 13, color: "#1d1d1f", flex: 1, lineHeight: 1.5 }}>{t}</span>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                                      <CopyButton text={t} />
                                      <span style={{ fontSize: 10, color: t.length > 200 ? "#FF3B30" : "#AEAEB2" }}>{t.length}/200</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Bullets */}
                            <div style={{ marginBottom: 16 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73" }}>
                                  {bulletsLabel} (5)
                                </span>
                                <CopyButton text={activeMarketData.bullets.join("\n")} label="Copy all" className="!opacity-100" />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {activeMarketData.bullets.map((bullet, i) => (
                                  <div key={i} className="field-row" style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#F5F5F7", borderRadius: 10, padding: "10px 12px" }}>
                                    <span style={{ color: "#0071E3", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                                    <span style={{ fontSize: 13, color: "#1d1d1f", flex: 1, lineHeight: 1.5 }}>{bullet}</span>
                                    <CopyButton text={bullet} />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <Field label={keywordsLabel} value={activeMarketData.keywords} />
                            <Field label={descLabel} value={activeMarketData.description} />
                          </>
                        ) : (
                          <div style={{ textAlign: "center", padding: "24px 16px", color: "#6E6E73", fontSize: 14 }}>
                            No data for this market. Try regenerating.
                          </div>
                        )}
                      </div>

                      {/* Refinement bar — only UK and US get Rufus */}
                      {!isJP && !isDE && (
                        <div style={{ padding: "0 16px 16px" }}>
                          <RefinementBar
                            onRefine={(type, custom) => handleRefine("amazon", generatedData.amazon, type, custom)}
                            onUndo={() => handleUndoRefine("amazon", previousContent["amazon"])}
                            hasPrevious={!!previousContent["amazon"]}
                            isLoading={!!refineLoading["amazon"]}
                            customText={customRefineText["amazon"] || ""}
                            onCustomTextChange={(v) => setCustomRefineText((prev) => ({ ...prev, amazon: v }))}
                            showRufus={true}
                          />
                        </div>
                      )}
                    </div>
                    </>
                    );
                  })()}

                  {/* eBay */}
                  {visibleMarketplaceCards.includes("ebay") && (() => {
                    const ebayTitlesMap = generatedData.ebay.titles || {
                      UK: [generatedData.ebay.title || ""],
                      US: [generatedData.ebay.title || ""],
                      AU: [generatedData.ebay.title || ""],
                      DE: [generatedData.ebay.title || ""],
                    };
                    const markets = [
                      { key: "UK" as const, flag: "🇬🇧", label: "UK" },
                      { key: "US" as const, flag: "🇺🇸", label: "US" },
                      { key: "AU" as const, flag: "🇦🇺", label: "AU" },
                      { key: "DE" as const, flag: "🇩🇪", label: "DE" },
                    ];
                    const activeTitles: string[] = Array.isArray(ebayTitlesMap[activeEbayMarket])
                      ? ebayTitlesMap[activeEbayMarket]
                      : [String(ebayTitlesMap[activeEbayMarket] || "")];

                    return (
                  <>
                  <div style={{ background: "#FFFFFF", border: "1px solid #E5E5E7", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                    {/* Card header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #E5E5E7", background: "#FAFAFA" }}>
                      <span style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f" }}>🏪 eBay</span>
                      <CopyButton text={`Titles:\n${activeTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\nDescription:\n${generatedData.ebay.description}`} label="Copy all" className="!opacity-100" />
                    </div>

                    {/* Market tabs */}
                    <div style={{ display: "flex", gap: 0, padding: "0 16px", borderBottom: "1px solid #E5E5E7", background: "#FAFAFA" }}>
                      {markets.map((m) => (
                        <button
                          key={m.key}
                          onClick={() => setActiveEbayMarket(m.key)}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            padding: "9px 14px", fontSize: 13, fontWeight: activeEbayMarket === m.key ? 600 : 400,
                            color: activeEbayMarket === m.key ? "#1d1d1f" : "#AEAEB2",
                            background: "none", border: "none",
                            borderBottom: activeEbayMarket === m.key ? "2px solid #0071E3" : "2px solid transparent",
                            cursor: "pointer", transition: "all 0.15s ease", fontFamily: "inherit",
                          }}
                        >
                          <span style={{ fontSize: 16 }}>{m.flag}</span>
                          <span>{m.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Titles for active market */}
                    <div style={{ padding: "16px 16px 0" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73" }}>
                          Title Variation{activeTitles.length > 1 ? "s" : ""} · 75–80 chars
                        </span>
                        <CopyButton text={activeTitles.join("\n")} label="Copy all" className="!opacity-100" />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                        {activeTitles.map((t, i) => (
                          <div key={i} className="field-row" style={{ display: "flex", alignItems: "flex-start", gap: 10, background: "#F5F5F7", borderRadius: 10, padding: "10px 12px" }}>
                            {activeTitles.length > 1 && (
                              <span style={{ color: "#0071E3", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>V{i + 1}</span>
                            )}
                            <span style={{ fontSize: 13, color: "#1d1d1f", flex: 1, lineHeight: 1.5 }}>{t}</span>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                              <CopyButton text={t} />
                              <span style={{ fontSize: 10, color: t.length < 75 ? "#FF9500" : t.length > 80 ? "#FF3B30" : "#34C759", fontWeight: 600 }}>
                                {t.length}/80
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Description — show German for DE market */}
                    <div style={{ padding: "0 16px 16px" }}>
                      <Field 
                        label={activeEbayMarket === "DE" ? "Artikelbeschreibung (Deutsch)" : "Item Description"} 
                        value={activeEbayMarket === "DE" && (generatedData.ebay as any).description_de 
                          ? (generatedData.ebay as any).description_de 
                          : generatedData.ebay.description} 
                      />
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73" }}>
                            Item Specifics
                          </span>
                          <CopyButton
                            text={Object.entries(generatedData.ebay.specifics).map(([k, v]) => `${k}: ${v}`).join("\n")}
                            label="Copy all"
                            className="!opacity-100"
                          />
                        </div>
                        <div style={{ border: "1px solid #E5E5E7", borderRadius: 10, overflow: "hidden" }}>
                          {Object.entries(generatedData.ebay.specifics).map(([key, value], i) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                borderBottom: i < Object.keys(generatedData.ebay.specifics).length - 1 ? "1px solid #E5E5E7" : "none",
                              }}
                            >
                              <span style={{ fontSize: 13, color: "#6E6E73", padding: "9px 12px", width: 130, flexShrink: 0, borderRight: "1px solid #E5E5E7", background: "#FAFAFA" }}>
                                {key}
                              </span>
                              <span style={{ fontSize: 13, color: "#1d1d1f", padding: "9px 12px", flex: 1 }}>
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <RefinementBar
                    onRefine={(type, custom) => handleRefine("ebay", generatedData.ebay, type, custom)}
                    onUndo={() => handleUndoRefine("ebay", previousContent["ebay"])}
                    hasPrevious={!!previousContent["ebay"]}
                    isLoading={!!refineLoading["ebay"]}
                    customText={customRefineText["ebay"] || ""}
                    onCustomTextChange={(v) => setCustomRefineText((prev) => ({ ...prev, ebay: v }))}
                  />
                  </>
                    );
                  })()}

                  {/* AliExpress */}
                  {visibleMarketplaceCards.includes("aliexpress") && (
                  <Card
                    title="🌐 AliExpress"
                    copyText={`Title: ${generatedData.aliexpress.title}\n\nDescription:\n${generatedData.aliexpress.description}`}
                  >
                    <Field label="Title" value={generatedData.aliexpress.title} />
                    <Field label="Description" value={generatedData.aliexpress.description} />
                  </Card>
                  )}

                  {/* Alibaba */}
                  {visibleMarketplaceCards.includes("alibaba") && generatedData.alibaba && (
                    <Card
                      title="🏭 Alibaba"
                      copyText={[
                        `Product Title: ${generatedData.alibaba.product_title}`,
                        `\nHeadline: ${generatedData.alibaba.headline}`,
                        `\nCore Keywords: ${generatedData.alibaba.keywords}`,
                        `\n\nDescription (HTML):\n${generatedData.alibaba.description_html}`,
                        `\nSpec Summary: ${generatedData.alibaba.spec_summary}`,
                        `\nMOQ: ${generatedData.alibaba.moq}`,
                        `\nLead Time: ${generatedData.alibaba.lead_time}`,
                        `\nPrice / FOB Note: ${generatedData.alibaba.price_note}`,
                        `\nOEM / ODM: ${generatedData.alibaba.oem_odm}`,
                        `\nPackaging / Shipping: ${generatedData.alibaba.packaging_shipping}`,
                      ].join("")}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ padding: "6px 10px", background: "#FFF3E0", borderRadius: 8, fontSize: 12, color: "#E65100", fontWeight: 500 }}>
                          🏭 Alibaba B2B fill format — wholesale/distributor ready
                        </div>
                        <button
                          onClick={() => exportAlibabaFormat(generatedData.alibaba!)}
                          style={{
                            height: 30,
                            padding: "0 12px",
                            background: "#FF6A00",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                          }}
                        >
                          Export
                        </button>
                      </div>
                      <Field label="Product Title" value={generatedData.alibaba.product_title} />
                      <Field label="Headline / Selling Hook" value={generatedData.alibaba.headline} />
                      <Field label="Core Keywords" value={generatedData.alibaba.keywords} />
                      <Field label="Description (HTML)" value={generatedData.alibaba.description_html} />
                      <Field label="Spec Summary" value={generatedData.alibaba.spec_summary} />
                      <Field label="MOQ" value={generatedData.alibaba.moq} />
                      <Field label="Lead Time" value={generatedData.alibaba.lead_time} />
                      <Field label="Price / FOB Note" value={generatedData.alibaba.price_note} />
                      <Field label="OEM / ODM Support" value={generatedData.alibaba.oem_odm} />
                      <Field label="Packaging / Shipping" value={generatedData.alibaba.packaging_shipping} />
                    </Card>
                  )}

                  {/* Rakuten */}
                  {visibleMarketplaceCards.includes("rakuten") && (
                    <Card
                      title="🏬 楽天市場 (Rakuten Japan)"
                      copyText={[
                        `商品名: ${generatedData.rakuten.product_name || generatedData.rakuten.title || ""}`,
                        `\nキャッチコピー: ${generatedData.rakuten.catch_copy || ""}`,
                        `\n商品説明HTML: ${generatedData.rakuten.description_html || generatedData.rakuten.description || ""}`,
                        `\n検索キーワード: ${generatedData.rakuten.search_keywords || ""}`,
                        `\n商品管理番号: ${generatedData.rakuten.item_number || ""}`,
                      ].join("")}
                    >
                      <div style={{ marginBottom: 10, padding: "6px 10px", background: "#FFF3E0", borderRadius: 8, fontSize: 12, color: "#E65100", fontWeight: 500 }}>
                        🇯🇵 楽天市場バックエンド形式 — Rakuten Japan backend format
                      </div>
                      <Field label="商品名 (Product Name)" value={generatedData.rakuten.product_name || generatedData.rakuten.title || ""} />
                      <Field label="キャッチコピー (Catch Copy — HTML)" value={generatedData.rakuten.catch_copy || ""} />
                      <Field label="商品説明 HTML (Description)" value={generatedData.rakuten.description_html || generatedData.rakuten.description || ""} />
                      <Field label="検索キーワード (Search Keywords)" value={generatedData.rakuten.search_keywords || ""} />
                      <Field label="商品管理番号 (Item Number)" value={generatedData.rakuten.item_number || ""} />
                    </Card>
                  )}

                  {/* Yahoo Japan */}
                  {visibleMarketplaceCards.includes("yahoo_jp") && (
                    <>
                      <Card
                        title="🛍️ Yahoo!ショッピング"
                        copyText={[
                          `商品名: ${generatedData.yahoo_jp.product_name || generatedData.yahoo_jp.title || ""}`,
                          `\nキャッチコピー: ${generatedData.yahoo_jp.catch_copy || ""}`,
                          `\n商品コード: ${generatedData.yahoo_jp.product_code || ""}`,
                          `\n検索キーワード: ${generatedData.yahoo_jp.search_keywords || ""}`,
                          `\n商品情報要約: ${generatedData.yahoo_jp.spec_summary || ""}`,
                          `\n\n商品説明HTML:\n${generatedData.yahoo_jp.description_html || generatedData.yahoo_jp.description || ""}`,
                        ].join("")}
                      >
                        <div style={{ marginBottom: 10, padding: "6px 10px", background: "#FFF3E0", borderRadius: 8, fontSize: 12, color: "#E65100", fontWeight: 500 }}>
                          🇯🇵 Yahoo!ショッピング backend-style format — copy/paste ready for Japan marketplace listings
                        </div>
                        <Field label="商品名 (Product Name)" value={generatedData.yahoo_jp.product_name || generatedData.yahoo_jp.title || ""} />
                        <Field label="キャッチコピー (Catch Copy)" value={generatedData.yahoo_jp.catch_copy || ""} />
                        <Field label="商品コード (Product Code)" value={generatedData.yahoo_jp.product_code || ""} />
                        <Field label="検索キーワード (Search Keywords)" value={generatedData.yahoo_jp.search_keywords || ""} />
                        <Field label="商品情報要約 (Spec Summary)" value={generatedData.yahoo_jp.spec_summary || ""} />
                        <Field label="商品説明 HTML (Description)" value={generatedData.yahoo_jp.description_html || generatedData.yahoo_jp.description || ""} />
                      </Card>
                      <RefinementBar
                        onRefine={(type, custom) => handleRefine("yahoo_jp", generatedData.yahoo_jp, type, custom)}
                        onUndo={() => handleUndoRefine("yahoo_jp", previousContent["yahoo_jp"])}
                        hasPrevious={!!previousContent["yahoo_jp"]}
                        isLoading={!!refineLoading["yahoo_jp"]}
                        customText={customRefineText["yahoo_jp"] || ""}
                        onCustomTextChange={(v) => setCustomRefineText((prev) => ({ ...prev, yahoo_jp: v }))}
                      />
                    </>
                  )}

                  {/* Yahoo Auction */}
                  {visibleMarketplaceCards.includes("yahoo_auction") && generatedData.yahoo_auction && (() => {
                    const ya = generatedData.yahoo_auction!;
                    const titleLen = ya.title ? ya.title.length : 0;
                    const titleOver = titleLen > 65;
                    return (
                      <>
                      <Card
                        title="🔨 Yahoo Auction Japan (ヤフオク!)"
                        copyText={[
                          `Title: ${ya.title}`,
                          `\nCondition: ${ya.condition}`,
                          `\nCategory: ${ya.category}`,
                          `\nStarting Price: ¥${ya.starting_price}`,
                          `\nBuy Now Price: ¥${ya.buy_now_price || ""}`,
                          `\nShipping Note: ${ya.shipping_note || ""}`,
                          `\nPayment Note: ${ya.payment_note || ""}`,
                          `\nTags: ${ya.tags}`,
                          `\n\nDescription:\n${ya.description}`,
                        ].join("")}
                      >
                        <div style={{ marginBottom: 10, padding: "6px 10px", background: "#FFF3E0", borderRadius: 8, fontSize: 12, color: "#E65100", fontWeight: 500 }}>
                          🔨 Auction-style listing — optimised for ヤフオク!
                        </div>

                        {/* Title with strict 65-char counter */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73" }}>
                              オークションタイトル · STRICT max 65 chars
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: titleOver ? "#FF3B30" : titleLen > 55 ? "#FF9500" : "#34C759",
                                background: titleOver ? "#FFF2F0" : titleLen > 55 ? "#FFF8E6" : "#F0FFF4",
                                padding: "2px 6px",
                                borderRadius: 4,
                              }}>
                                {titleLen}/65 {titleOver ? "⚠️ TOO LONG" : ""}
                              </span>
                              <CopyButton text={ya.title} />
                            </div>
                          </div>
                          <div style={{
                            background: titleOver ? "#FFF2F0" : "#F5F5F7",
                            borderRadius: 10,
                            padding: "10px 12px",
                            fontSize: 14,
                            color: "#1d1d1f",
                            lineHeight: 1.6,
                            border: titleOver ? "1px solid #FFCCC7" : "none",
                          }}>
                            {ya.title}
                          </div>
                        </div>

                        {/* Condition toggle */}
                        <div style={{ marginBottom: 16 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73", display: "block", marginBottom: 8 }}>
                            商品の状態 (Condition)
                          </span>
                          <div style={{ display: "flex", gap: 8 }}>
                            {["新品", "中古"].map((cond) => (
                              <div key={cond} style={{
                                padding: "6px 16px",
                                borderRadius: 20,
                                fontSize: 13,
                                fontWeight: 600,
                                background: ya.condition === cond ? "#0071E3" : "#F5F5F7",
                                color: ya.condition === cond ? "#FFFFFF" : "#6E6E73",
                                border: `1px solid ${ya.condition === cond ? "#0071E3" : "#E5E5E7"}`,
                              }}>
                                {cond}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Category */}
                        <Field label="カテゴリ (Category Path)" value={ya.category} />

                        {/* Pricing */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73" }}>
                                開始価格 (Starting Price)
                              </span>
                              <CopyButton text={ya.starting_price} />
                            </div>
                            <div style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 12px", fontSize: 16, fontWeight: 700, color: "#1d1d1f" }}>
                              ¥{ya.starting_price ? Number(ya.starting_price).toLocaleString("ja-JP") : "—"}
                            </div>
                          </div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73" }}>
                                即決価格 (Buy Now)
                              </span>
                              <CopyButton text={ya.buy_now_price || ""} />
                            </div>
                            <div style={{ background: "#F5F5F7", borderRadius: 10, padding: "10px 12px", fontSize: 16, fontWeight: 700, color: "#1d1d1f" }}>
                              {ya.buy_now_price ? `¥${Number(ya.buy_now_price).toLocaleString("ja-JP")}` : "—"}
                            </div>
                          </div>
                        </div>

                        <Field label="発送について (Shipping Note)" value={ya.shipping_note || ""} />
                        <Field label="支払いについて (Payment Note)" value={ya.payment_note || ""} />

                        {/* Full Description */}
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73" }}>
                              商品説明 (Full Description · HTML)
                            </span>
                            <CopyButton text={ya.description} />
                          </div>
                          <textarea
                            readOnly
                            value={ya.description}
                            rows={12}
                            style={{
                              width: "100%",
                              background: "#F5F5F7",
                              border: "none",
                              borderRadius: 10,
                              padding: "10px 12px",
                              fontSize: 13,
                              color: "#1d1d1f",
                              lineHeight: 1.6,
                              resize: "vertical",
                              fontFamily: "monospace",
                              outline: "none",
                            }}
                          />
                        </div>

                        {/* Tags */}
                        <Field label="タグ (Tags)" value={ya.tags} />
                      </Card>
                      <RefinementBar
                        onRefine={(type, custom) => handleRefine("yahoo_auction", generatedData.yahoo_auction, type, custom)}
                        onUndo={() => handleUndoRefine("yahoo_auction", previousContent["yahoo_auction"])}
                        hasPrevious={!!previousContent["yahoo_auction"]}
                        isLoading={!!refineLoading["yahoo_auction"]}
                        customText={customRefineText["yahoo_auction"] || ""}
                        onCustomTextChange={(v) => setCustomRefineText((prev) => ({ ...prev, yahoo_auction: v }))}
                      />
                      </>
                    );
                  })()}

                  {/* WooCommerce — Multi-Language */}
                  {visibleMarketplaceCards.includes("woocommerce") && (() => {
                    const activeLang = WOO_LANGUAGES.find((l) => l.code === activeWooLang)!;
                    const activeContent: WooContent | null = activeWooLang === "EN"
                      ? generatedData.woocommerce
                      : wooTranslations[activeWooLang] || null;

                    const copyText = activeContent
                      ? [
                          `Product Title: ${activeContent.title}`,
                          `\nShort Description: ${activeContent.short_description}`,
                          `\nLong Description:\n${activeContent.long_description}`,
                          `\nSEO Meta Title: ${activeContent.meta_title}`,
                          `\nSEO Meta Description: ${activeContent.meta_description}`,
                        ].join("")
                      : undefined;

                    return (
                      <>
                      <div
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #E5E5E7",
                          borderRadius: 12,
                          overflow: "hidden",
                          marginBottom: 16,
                        }}
                      >
                        {/* Card header */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 16px",
                            borderBottom: "1px solid #E5E5E7",
                            background: "#FAFAFA",
                          }}
                        >
                          <span style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f" }}>🛍️ WooCommerce</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <input
                              ref={wooImportInputRef}
                              type="file"
                              accept=".csv,text/csv"
                              style={{ display: "none" }}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  await handleImportWooCsv(file);
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : "WooCommerce CSV import failed");
                                } finally {
                                  e.target.value = "";
                                }
                              }}
                            />
                            <button
                              onClick={() => wooImportInputRef.current?.click()}
                              style={{
                                height: 30,
                                padding: "0 12px",
                                background: "#FFFFFF",
                                color: "#0071E3",
                                border: "1px solid #0071E3",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              Import CSV
                            </button>
                            {activeContent && (
                              <>
                                <button
                                  onClick={() => exportWooCsv(activeContent, activeWooLang)}
                                  style={{
                                    height: 30,
                                    padding: "0 12px",
                                    background: "#FF9500",
                                    color: "#FFFFFF",
                                    border: "none",
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  Export CSV
                                </button>
                                <button
                                  onClick={() => exportWooFormat(activeContent, activeWooLang)}
                                  style={{
                                    height: 30,
                                    padding: "0 12px",
                                    background: "#34C759",
                                    color: "#FFFFFF",
                                    border: "none",
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  Export TXT
                                </button>
                              </>
                            )}
                            {copyText && <CopyButton text={copyText} label="Copy all" className="!opacity-100" />}
                          </div>
                        </div>

                        {/* Language tabs */}
                        <div
                          style={{
                            display: "flex",
                            gap: 0,
                            padding: "0 16px",
                            borderBottom: "1px solid #E5E5E7",
                            background: "#FAFAFA",
                            overflowX: "auto",
                          }}
                        >
                          {WOO_LANGUAGES.map((lang) => {
                            const isActive = activeWooLang === lang.code;
                            const isGenerated = lang.code === "EN" || !!wooTranslations[lang.code];
                            return (
                              <button
                                key={lang.code}
                                onClick={() => setActiveWooLang(lang.code)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "9px 10px",
                                  fontSize: 12,
                                  fontWeight: isActive ? 600 : 400,
                                  color: isActive ? "#1d1d1f" : "#AEAEB2",
                                  background: "none",
                                  border: "none",
                                  borderBottom: isActive ? "2px solid #0071E3" : "2px solid transparent",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                  fontFamily: "inherit",
                                  whiteSpace: "nowrap",
                                  flexShrink: 0,
                                }}
                              >
                                <span style={{ fontSize: 14 }}>{lang.flag}</span>
                                <span>{lang.label}</span>
                                {isGenerated && lang.code !== "EN" && (
                                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34C759", display: "inline-block", marginLeft: 2 }} />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Content area */}
                        <div style={{ padding: 16 }}>
                          {activeContent ? (
                            <>
                              <div style={{ marginBottom: 10, padding: "6px 10px", background: "#FFF3E0", borderRadius: 8, fontSize: 12, color: "#E65100", fontWeight: 500 }}>
                                🧩 WooCommerce fill format — structured for quick copy/paste into product fields
                              </div>
                              <Field label="Product Title / Name" value={activeContent.title} />
                              <Field label="Short Description / Excerpt" value={activeContent.short_description} />
                              <Field label="Long Description / Product Description (HTML)" value={activeContent.long_description} />
                              <Field label="SEO Meta Title" value={activeContent.meta_title} />
                              <Field label="SEO Meta Description" value={activeContent.meta_description} />
                            </>
                          ) : (
                            <div style={{ textAlign: "center", padding: "24px 16px" }}>
                              <div style={{ fontSize: 28, marginBottom: 10 }}>{activeLang.flag}</div>
                              <p style={{ fontSize: 14, color: "#6E6E73", marginBottom: 16 }}>
                                {activeLang.name} translation not generated yet
                              </p>
                              <button
                                onClick={() => handleGenerateWooTranslation(activeWooLang)}
                                disabled={wooLangLoading[activeWooLang]}
                                style={{
                                  height: 36,
                                  padding: "0 20px",
                                  background: wooLangLoading[activeWooLang] ? "#AEAEB2" : "#0071E3",
                                  color: "#FFFFFF",
                                  border: "none",
                                  borderRadius: 10,
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: wooLangLoading[activeWooLang] ? "not-allowed" : "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  fontFamily: "inherit",
                                  transition: "background 0.15s ease",
                                }}
                              >
                                {wooLangLoading[activeWooLang] ? (
                                  <>
                                    <svg className="animate-spin" width={13} height={13} fill="none" viewBox="0 0 24 24">
                                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Translating to {activeLang.name}…
                                  </>
                                ) : (
                                  `Generate ${activeLang.name}`
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                  <RefinementBar
                    onRefine={(type, custom) => handleRefine("woocommerce", generatedData.woocommerce, type, custom)}
                    onUndo={() => handleUndoRefine("woocommerce", previousContent["woocommerce"])}
                    hasPrevious={!!previousContent["woocommerce"]}
                    isLoading={!!refineLoading["woocommerce"]}
                    customText={customRefineText["woocommerce"] || ""}
                    onCustomTextChange={(v) => setCustomRefineText((prev) => ({ ...prev, woocommerce: v }))}
                  />
                      </>
                    );
                  })()}
                </div>
              )}

              {/* ── Social Content ── */}
              {activeTab === "Social Content" && (
                <div>
                  {visibleSocialCards.includes("facebook") && (() => {
                    const fbContent = (activeFacebookLang === "DE"
                      ? generatedData.facebook.DE?.post
                      : activeFacebookLang === "JP"
                      ? generatedData.facebook.JP?.post
                      : activeFacebookLang === "B2B"
                      ? generatedData.facebook.B2B?.post
                      : generatedData.facebook.EN?.post || generatedData.facebook.post) || "";

                    return (
                      <Card title={visibleFacebookLangs.length === 1 && visibleFacebookLangs[0] === "JP" ? "📘 Facebook JP" : "📘 Facebook"} copyText={fbContent}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 12, borderBottom: "1px solid #E5E5E7", paddingBottom: 10, overflowX: "auto" }}>
                          {visibleFacebookLangs.map((code) => {
                            const lang = code === "EN"
                              ? { code: "EN", flag: "🇬🇧" }
                              : code === "DE"
                              ? { code: "DE", flag: "🇩🇪" }
                              : code === "JP"
                              ? { code: "JP", flag: "🇯🇵" }
                              : { code: "B2B", flag: "🏢" };
                            const isActive = activeFacebookLang === lang.code;
                            return (
                              <button
                                key={lang.code}
                                onClick={() => setActiveFacebookLang(lang.code as "EN" | "DE" | "JP" | "B2B")}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  padding: "8px 10px",
                                  fontSize: 12,
                                  fontWeight: isActive ? 600 : 500,
                                  color: isActive ? "#1d1d1f" : "#6E6E73",
                                  background: "none",
                                  border: "none",
                                  borderBottom: isActive ? "2px solid #0071E3" : "2px solid transparent",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                <span>{lang.flag}</span>
                                <span>{lang.code}</span>
                              </button>
                            );
                          })}
                        </div>
                        <Field label={`Post Caption (${activeFacebookLang})`} value={fbContent} />
                      </Card>
                    );
                  })()}

                  {visibleSocialCards.includes("youtube") && (
                    <Card
                      title="▶️ YouTube"
                      copyText={[
                        `Title: ${generatedData.youtube.title}`,
                        `\nDescription:\n${generatedData.youtube.description}`,
                        `\nTags: ${generatedData.youtube.tags}`,
                        `\nScript Outline:\n${generatedData.youtube.script_outline}`,
                      ].join("")}
                    >
                      <Field label="Video Title" value={generatedData.youtube.title} />
                      <Field label="Description" value={generatedData.youtube.description} />
                      <Field label="Tags (comma separated)" value={generatedData.youtube.tags} />
                      <Field label="Script Outline (2-min video)" value={generatedData.youtube.script_outline} />
                    </Card>
                  )}

                  {visibleSocialCards.includes("twitter") && (() => {
                    const twitterThread = activeTwitterLang === "JP"
                      ? generatedData.twitter.JP?.thread || []
                      : generatedData.twitter.EN?.thread || generatedData.twitter.thread || [];

                    return (
                      <Card title={visibleTwitterLangs.length === 1 && visibleTwitterLangs[0] === "JP" ? "𝕏 Twitter JP" : "𝕏 Twitter / X"} copyText={twitterThread.join("\n\n")}>
                        <div style={{ display: "flex", gap: 8, marginBottom: 12, borderBottom: "1px solid #E5E5E7", paddingBottom: 10, overflowX: "auto" }}>
                          {visibleTwitterLangs.map((code) => {
                            const lang = code === "JP" ? { code: "JP", flag: "🇯🇵" } : { code: "EN", flag: "🇬🇧" };
                            const isActive = activeTwitterLang === lang.code;
                            return (
                              <button
                                key={lang.code}
                                onClick={() => setActiveTwitterLang(lang.code as "EN" | "JP")}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  padding: "8px 10px",
                                  fontSize: 12,
                                  fontWeight: isActive ? 600 : 500,
                                  color: isActive ? "#1d1d1f" : "#6E6E73",
                                  background: "none",
                                  border: "none",
                                  borderBottom: isActive ? "2px solid #0071E3" : "2px solid transparent",
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                <span>{lang.flag}</span>
                                <span>{lang.code}</span>
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {twitterThread.map((tweet, i) => (
                            <div
                              key={i}
                              className="field-row"
                              style={{
                                background: "#F5F5F7",
                                borderRadius: 10,
                                padding: "12px",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                                <span style={{ color: "#0071E3", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                  {i + 1}/{twitterThread.length}
                                </span>
                                <span style={{ fontSize: 13, color: "#1d1d1f", flex: 1, lineHeight: 1.5 }}>
                                  {tweet}
                                </span>
                                <CopyButton text={tweet} />
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <span style={{ fontSize: 11, color: tweet.length > 280 ? "#FF3B30" : "#AEAEB2" }}>
                                  {tweet.length}/280
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    );
                  })()}

                  {visibleSocialCards.includes("line") && (
                    <Card title="💬 LINE" copyText={generatedData.line.message}>
                      <Field label="Message" value={generatedData.line.message} />
                    </Card>
                  )}

                  {visibleSocialCards.includes("reddit") && (
                    <Card
                    title="🤖 Reddit"
                    copyText={`${generatedData.reddit.title}\n\n${generatedData.reddit.body}`}
                  >
                    <Field label="Post Title · r/CarAV · r/CarPlay · r/AndroidAuto" value={generatedData.reddit.title} />
                    <Field label="Post Body" value={generatedData.reddit.body} />
                  </Card>
                  )}
                  {visibleSocialCards.includes("facebook") && (
                  <RefinementBar
                    onRefine={(type, custom) => handleRefine("facebook", generatedData.facebook, type, custom)}
                    onUndo={() => handleUndoRefine("facebook", previousContent["facebook"])}
                    hasPrevious={!!previousContent["facebook"]}
                    isLoading={!!refineLoading["facebook"]}
                    customText={customRefineText["facebook"] || ""}
                    onCustomTextChange={(v) => setCustomRefineText((prev) => ({ ...prev, facebook: v }))}
                  />
                  )}
                </div>
              )}

              {/* ── AI Picks ── */}
              {activeTab === "AI Picks" && (
                <div>
                  <Card
                    title="✦ AI Recommendation"
                    copyText={`Suggestions:\n${generatedData.ai_recommendation.suggestions.join("\n")}\n\n${generatedData.ai_recommendation.blurb}`}
                  >
                    <div style={{ marginBottom: 20 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73", display: "block", marginBottom: 10 }}>
                        Recommended Add-ons
                      </span>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {generatedData.ai_recommendation.suggestions.map((s, i) => (
                          <div
                            key={i}
                            className="field-row"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              background: "#F5F5F7",
                              borderRadius: 10,
                              padding: "12px 14px",
                            }}
                          >
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                background: "#EAF3FF",
                                border: "1px solid #C7DFFE",
                                borderRadius: 8,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <span style={{ color: "#0071E3", fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
                            </div>
                            <span style={{ fontSize: 13, color: "#1d1d1f", flex: 1, lineHeight: 1.5 }}>{s}</span>
                            <CopyButton text={s} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <Field label="Amazon-Style Recommendation Blurb" value={generatedData.ai_recommendation.blurb} />
                  </Card>
                </div>
              )}

              {/* ── Newsletter ── */}
              {activeTab === "Newsletter" && userRole && isModuleAllowed(userRole, "newsletter") && (
                <div>
                  {/* Tone Selector */}
                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E5E5E7",
                      borderRadius: 12,
                      padding: "16px",
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73" }}>
                        Email Tone
                      </span>
                      {newsletterToneChanged && generatedData.newsletter && (
                        <button
                          onClick={handleRegenerateNewsletter}
                          disabled={newsletterLoading}
                          style={{
                            height: 32,
                            padding: "0 14px",
                            background: newsletterLoading ? "#AEAEB2" : "#0071E3",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: newsletterLoading ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontFamily: "inherit",
                            transition: "background 0.15s ease",
                          }}
                        >
                          {newsletterLoading ? (
                            <>
                              <svg className="animate-spin" width={12} height={12} fill="none" viewBox="0 0 24 24">
                                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Regenerating…
                            </>
                          ) : (
                            "↻ Regenerate Newsletter"
                          )}
                        </button>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {NEWSLETTER_TONES.map((tone) => (
                        <button
                          key={tone.id}
                          onClick={() => {
                            setNewsletterTone(tone.id);
                            if (generatedData.newsletter) setNewsletterToneChanged(true);
                          }}
                          style={{
                            padding: "7px 14px",
                            borderRadius: 20,
                            border: "none",
                            fontSize: 13,
                            fontWeight: 500,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            transition: "all 0.15s ease",
                            background: newsletterTone === tone.id ? "#0071E3" : "#F5F5F7",
                            color: newsletterTone === tone.id ? "#FFFFFF" : "#1d1d1f",
                          }}
                        >
                          {tone.emoji} {tone.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!generatedData.newsletter && (
                    <div
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #E5E5E7",
                        borderRadius: 12,
                        padding: "32px",
                        textAlign: "center",
                        color: "#6E6E73",
                        fontSize: 14,
                      }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 8 }}>✉️</div>
                      <p style={{ fontWeight: 500, color: "#1d1d1f", marginBottom: 4 }}>No newsletter generated yet</p>
                      <p style={{ fontSize: 13 }}>Click &quot;Generate All Listings&quot; to generate a newsletter alongside all other content.</p>
                    </div>
                  )}

                  {generatedData.newsletter && (() => {
                    const nl = generatedData.newsletter!;
                    const fullNewsletter = [
                      `Subject: ${nl.subject}`,
                      `Preview: ${nl.preview_text}`,
                      ``,
                      `${nl.hero_headline}`,
                      ``,
                      nl.intro,
                      ``,
                      `Features:`,
                      ...nl.feature_highlights.map((f) => `${f.icon} ${f.title}: ${f.description}`),
                      ``,
                      `Compatible Vehicles: ${nl.compatible_vehicles}`,
                      ``,
                      `CTA: ${nl.cta_text}`,
                      ``,
                      nl.signoff,
                      ``,
                      `--- PLAIN TEXT ---`,
                      nl.plain_text,
                    ].join("\n");

                    return (
                      <div>
                        {/* Copy Full Newsletter */}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                          <CopyButton text={fullNewsletter} label="📋 Copy Full Newsletter" className="!opacity-100 !text-sm !px-4 !py-2" />
                        </div>

                        {/* Subject + Preview */}
                        <Card title="📧 Email Header">
                          <Field label="Subject Line" value={nl.subject} />
                          <Field label="Preview Text (~80 chars)" value={nl.preview_text} />
                        </Card>

                        {/* Hero */}
                        <Card title="🦸 Hero Section">
                          <Field label="Hero Headline" value={nl.hero_headline} />
                          <Field label="Introduction" value={nl.intro} />
                        </Card>

                        {/* Feature Highlights */}
                        <div
                          style={{
                            background: "#FFFFFF",
                            border: "1px solid #E5E5E7",
                            borderRadius: 12,
                            overflow: "hidden",
                            marginBottom: 16,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 16px",
                              borderBottom: "1px solid #E5E5E7",
                              background: "#FAFAFA",
                            }}
                          >
                            <span style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f" }}>⚡ Feature Highlights</span>
                            <CopyButton
                              text={nl.feature_highlights.map((f) => `${f.icon} ${f.title}\n${f.description}`).join("\n\n")}
                              label="Copy all"
                              className="!opacity-100"
                            />
                          </div>
                          <div style={{ padding: 16 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                              {nl.feature_highlights.map((f, i) => (
                                <div
                                  key={i}
                                  style={{
                                    background: "#F5F5F7",
                                    borderRadius: 10,
                                    padding: "14px",
                                    position: "relative",
                                  }}
                                >
                                  <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1d1d1f", marginBottom: 4 }}>{f.title}</div>
                                  <div style={{ fontSize: 12, color: "#6E6E73", lineHeight: 1.5 }}>{f.description}</div>
                                  <div style={{ marginTop: 10 }}>
                                    <CopyButton text={`${f.icon} ${f.title}\n${f.description}`} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Footer details */}
                        <Card title="🚗 Footer & CTA">
                          <Field label="Compatible Vehicles" value={nl.compatible_vehicles} />
                          <Field label="CTA Button Text" value={nl.cta_text} />
                          <Field label="Sign-off" value={nl.signoff} />
                        </Card>

                        {/* Plain Text */}
                        <div
                          style={{
                            background: "#FFFFFF",
                            border: "1px solid #E5E5E7",
                            borderRadius: 12,
                            overflow: "hidden",
                            marginBottom: 16,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 16px",
                              borderBottom: "1px solid #E5E5E7",
                              background: "#FAFAFA",
                            }}
                          >
                            <span style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f" }}>📄 Plain Text Version</span>
                            <CopyButton text={nl.plain_text} label="Copy all" className="!opacity-100" />
                          </div>
                          <div style={{ padding: 16 }}>
                            <textarea
                              readOnly
                              value={nl.plain_text}
                              rows={10}
                              style={{
                                width: "100%",
                                background: "#F5F5F7",
                                border: "none",
                                borderRadius: 10,
                                padding: "10px 12px",
                                fontSize: 13,
                                color: "#1d1d1f",
                                lineHeight: 1.6,
                                resize: "vertical",
                                fontFamily: "monospace",
                                outline: "none",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
