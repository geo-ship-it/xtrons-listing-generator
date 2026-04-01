"use client";

import { useState, useCallback, useRef } from "react";

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
  price: string;
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

interface GeneratedData {
  amazon: {
    title: string;
    bullets: string[];
    keywords: string;
    description: string;
  };
  ebay: {
    title: string;
    description: string;
    specifics: Record<string, string>;
  };
  aliexpress: { title: string; description: string };
  yahoo_jp: { title: string; description: string };
  rakuten: { title: string; description: string };
  woocommerce: WooContent;
  facebook: { post: string };
  youtube: {
    title: string;
    description: string;
    tags: string;
    script_outline: string;
  };
  twitter: { thread: string[] };
  line: { message: string };
  reddit: { title: string; body: string };
  ai_recommendation: { suggestions: string[]; blurb: string };
  newsletter?: NewsletterData;
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
  const [newsletterTone, setNewsletterTone] = useState<NewsletterTone>("friendly");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterToneChanged, setNewsletterToneChanged] = useState(false);

  // WooCommerce multi-language state
  const [wooTranslations, setWooTranslations] = useState<Record<string, WooContent>>({});
  const [wooLangLoading, setWooLangLoading] = useState<Record<string, boolean>>({});
  const [activeWooLang, setActiveWooLang] = useState<WooLangCode>("EN");

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

  // Combined images (URL-extracted + uploaded)
  const allImages = [...urlImages, ...uploadedImages];

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

  const handleGenerate = async () => {
    if (!formData.productName || !formData.price) {
      setError("Product name and price are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const imagesPayload = allImages.map((img) => ({
        base64: img.base64,
        mediaType: img.mediaType,
      }));

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          language,
          images: imagesPayload,
          newsletterTone,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Generation failed");
      setGeneratedData(json.data);
      setNewsletterToneChanged(false);
      setActiveTab("Marketplaces");
      setWooTranslations({});
      setActiveWooLang("EN");
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
                Powered by Claude AI
              </span>
            </div>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#AEAEB2",
              background: "#F5F5F7",
              padding: "4px 10px",
              borderRadius: 6,
            }}
          >
            All platforms · One click
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
                  ✓ {allImages.length} image{allImages.length > 1 ? "s" : ""} included in generation
                </div>
              )}
              {allImages.length === 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: "#AEAEB2" }}>
                  AI will analyse images to enhance listings
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

            <InputField label="Price (GBP)" required>
              <TextInput
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="299.99"
                type="number"
                prefix="£"
              />
            </InputField>

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
                    ? `Generate All Listings · ${allImages.length} image${allImages.length > 1 ? "s" : ""}`
                    : "Generate All Listings"}
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
                  Claude is writing optimised content for all platforms
                </p>
              </div>
            </div>
          )}

          {generatedData && !loading && (
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
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
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
                  {/* Amazon */}
                  <Card
                    title="🛒 Amazon UK"
                    copyText={[
                      `Title: ${generatedData.amazon.title}`,
                      `\nBullets:\n${generatedData.amazon.bullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}`,
                      `\nKeywords: ${generatedData.amazon.keywords}`,
                      `\nDescription: ${generatedData.amazon.description}`,
                    ].join("")}
                  >
                    <Field
                      label={`Title · ${generatedData.amazon.title.length}/200 chars`}
                      value={generatedData.amazon.title}
                    />
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "#6E6E73" }}>
                          5 Bullet Points
                        </span>
                        <CopyButton text={generatedData.amazon.bullets.join("\n")} label="Copy all" className="!opacity-100" />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {generatedData.amazon.bullets.map((bullet, i) => (
                          <div
                            key={i}
                            className="field-row"
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                              background: "#F5F5F7",
                              borderRadius: 10,
                              padding: "10px 12px",
                            }}
                          >
                            <span style={{ color: "#0071E3", fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                              {i + 1}
                            </span>
                            <span style={{ fontSize: 13, color: "#1d1d1f", flex: 1, lineHeight: 1.5 }}>
                              {bullet}
                            </span>
                            <CopyButton text={bullet} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <Field label="Search Terms / Keywords" value={generatedData.amazon.keywords} />
                    <Field label="Description" value={generatedData.amazon.description} />
                  </Card>

                  {/* eBay */}
                  <Card
                    title="🏪 eBay"
                    copyText={`Title: ${generatedData.ebay.title}\n\nDescription:\n${generatedData.ebay.description}`}
                  >
                    <Field label={`Title · ${generatedData.ebay.title.length}/80 chars`} value={generatedData.ebay.title} />
                    <Field label="Item Description" value={generatedData.ebay.description} />
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
                  </Card>

                  {/* AliExpress */}
                  <Card
                    title="🌐 AliExpress"
                    copyText={`Title: ${generatedData.aliexpress.title}\n\nDescription:\n${generatedData.aliexpress.description}`}
                  >
                    <Field label="Title" value={generatedData.aliexpress.title} />
                    <Field label="Description" value={generatedData.aliexpress.description} />
                  </Card>

                  {/* Yahoo Japan */}
                  <Card
                    title="🇯🇵 Yahoo Japan"
                    copyText={`Title: ${generatedData.yahoo_jp.title}\n\nDescription:\n${generatedData.yahoo_jp.description}`}
                  >
                    <div style={{ marginBottom: 10, padding: "6px 10px", background: "#FFF3E0", borderRadius: 8, fontSize: 12, color: "#E65100", fontWeight: 500 }}>
                      🇯🇵 Japanese content — optimised for Yahoo Japan
                    </div>
                    <Field label="Title (日本語)" value={generatedData.yahoo_jp.title} />
                    <Field label="Description (日本語)" value={generatedData.yahoo_jp.description} />
                  </Card>

                  {/* Rakuten */}
                  <Card
                    title="🏬 Rakuten"
                    copyText={`Title: ${generatedData.rakuten.title}\n\nDescription:\n${generatedData.rakuten.description}`}
                  >
                    <div style={{ marginBottom: 10, padding: "6px 10px", background: "#FFF3E0", borderRadius: 8, fontSize: 12, color: "#E65100", fontWeight: 500 }}>
                      🇯🇵 Japanese content — optimised for Rakuten Japan
                    </div>
                    <Field label="Title (日本語)" value={generatedData.rakuten.title} />
                    <Field label="Description (日本語)" value={generatedData.rakuten.description} />
                  </Card>

                  {/* WooCommerce — Multi-Language */}
                  {(() => {
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
                          {copyText && <CopyButton text={copyText} label="Copy all" className="!opacity-100" />}
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
                              <Field label="Product Title" value={activeContent.title} />
                              <Field label="Short Description" value={activeContent.short_description} />
                              <Field label="Long Description (HTML)" value={activeContent.long_description} />
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
                    );
                  })()}
                </div>
              )}

              {/* ── Social Content ── */}
              {activeTab === "Social Content" && (
                <div>
                  <Card title="📘 Facebook" copyText={generatedData.facebook.post}>
                    <Field label="Post Caption" value={generatedData.facebook.post} />
                  </Card>

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

                  <Card title="𝕏 Twitter / X" copyText={generatedData.twitter.thread.join("\n\n")}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {generatedData.twitter.thread.map((tweet, i) => (
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
                              {i + 1}/{generatedData.twitter.thread.length}
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

                  <Card title="💬 LINE" copyText={generatedData.line.message}>
                    <Field label="Message" value={generatedData.line.message} />
                  </Card>

                  <Card
                    title="🤖 Reddit"
                    copyText={`${generatedData.reddit.title}\n\n${generatedData.reddit.body}`}
                  >
                    <Field label="Post Title · r/CarAV · r/CarPlay · r/AndroidAuto" value={generatedData.reddit.title} />
                    <Field label="Post Body" value={generatedData.reddit.body} />
                  </Card>
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
              {activeTab === "Newsletter" && (
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
          )}
        </div>
      </div>
    </div>
  );
}
