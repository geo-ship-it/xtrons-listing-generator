"use client";

import { useState, useCallback } from "react";

// Types
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
  woocommerce: {
    title: string;
    short_description: string;
    long_description: string;
    meta_title: string;
    meta_description: string;
  };
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
}

const CATEGORIES = [
  "Car Stereo",
  "Roof Monitor",
  "Accessory",
  "DAB Dongle",
  "Camera",
];
const TABS = ["Marketplaces", "Social Content", "AI Recommendation"] as const;
type Tab = (typeof TABS)[number];

// Copy button component
function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`copy-btn text-xs px-3 py-1 rounded border transition-all ${
        copied
          ? "border-green-500 text-green-400"
          : "border-slate-600 text-slate-400 hover:text-[#E31837] hover:border-[#E31837]"
      }`}
    >
      {copied ? "✓ Copied" : label}
    </button>
  );
}

// Output section wrapper
function OutputSection({
  title,
  children,
  copyText,
}: {
  title: string;
  children: React.ReactNode;
  copyText?: string;
}) {
  return (
    <div className="bg-[#1a1d27] rounded-lg border border-slate-700/50 overflow-hidden mb-4">
      <div className="flex items-center justify-between px-4 py-3 bg-[#1e2130] border-b border-slate-700/50">
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        {copyText && <CopyButton text={copyText} />}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// Field display
function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500 uppercase tracking-wide">
          {label}
        </span>
        <CopyButton text={value} />
      </div>
      <div
        className={`text-sm text-slate-200 bg-[#0f1117] rounded p-3 border border-slate-700/30 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

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
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, language }),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || "Generation failed");
      }

      setGeneratedData(json.data);
      setActiveTab("Marketplaces");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="bg-[#1a1d27] border-b border-slate-700/50 px-6 py-4">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#E31837] rounded flex items-center justify-center text-white font-bold text-sm">
              X
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">
                XTRONS AI Listing Generator
              </h1>
              <p className="text-xs text-slate-500">
                Powered by Claude AI · All platforms in one click
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Language:</span>
              <div className="bg-[#0f1117] border border-slate-600 rounded px-3 py-1 text-xs text-[#E31837] font-semibold">
                EN
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto p-6 flex gap-6 h-[calc(100vh-73px)]">
        {/* LEFT: Input Form */}
        <div className="w-[420px] flex-shrink-0 overflow-y-auto">
          <div className="bg-[#1a1d27] rounded-xl border border-slate-700/50 p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-5">
              Product Details
            </h2>

            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Product Name <span className="text-[#E31837]">*</span>
                </label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  placeholder="e.g. XTRONS 10.1&quot; Android 13 Car Stereo"
                  className="w-full bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#E31837] transition-colors"
                />
              </div>

              {/* SKU */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  SKU / Model Number
                </label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="e.g. TIB101L"
                  className="w-full bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#E31837] transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Product Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-[#E31837] transition-colors"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Key Features */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Key Features{" "}
                  <span className="text-slate-600">(one per line)</span>
                </label>
                <textarea
                  name="keyFeatures"
                  value={formData.keyFeatures}
                  onChange={handleChange}
                  rows={4}
                  placeholder={
                    "Wireless Apple CarPlay\nAndroid Auto\n4K Dash Cam Input\nDSP Audio Equaliser"
                  }
                  className="w-full bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#E31837] transition-colors resize-none"
                />
              </div>

              {/* Compatible Cars */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Compatible Car Models
                </label>
                <textarea
                  name="compatibleCars"
                  value={formData.compatibleCars}
                  onChange={handleChange}
                  rows={3}
                  placeholder={
                    "BMW 3 Series F30 2012-2019\nVW Golf Mk7 2013-2020"
                  }
                  className="w-full bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#E31837] transition-colors resize-none"
                />
              </div>

              {/* Screen Size + RAM/ROM */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    Screen Size{" "}
                    <span className="text-slate-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="screenSize"
                    value={formData.screenSize}
                    onChange={handleChange}
                    placeholder='e.g. 10.1"'
                    className="w-full bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#E31837] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">
                    RAM / ROM <span className="text-slate-600">(optional)</span>
                  </label>
                  <input
                    type="text"
                    name="ramRom"
                    value={formData.ramRom}
                    onChange={handleChange}
                    placeholder="e.g. 4GB / 64GB"
                    className="w-full bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#E31837] transition-colors"
                  />
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Price (GBP) <span className="text-[#E31837]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                    £
                  </span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="299.99"
                    className="w-full bg-[#0f1117] border border-slate-700 rounded-lg pl-7 pr-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#E31837] transition-colors"
                  />
                </div>
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Short Description{" "}
                  <span className="text-slate-600">(2-3 sentences)</span>
                </label>
                <textarea
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Brief overview of what this product does and who it's for..."
                  className="w-full bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#E31837] transition-colors resize-none"
                />
              </div>

              {/* Selling Points */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  Selling Points / USPs
                </label>
                <textarea
                  name="sellingPoints"
                  value={formData.sellingPoints}
                  onChange={handleChange}
                  rows={3}
                  placeholder="What makes this better than competitors? Key advantages..."
                  className="w-full bg-[#0f1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#E31837] transition-colors resize-none"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-900/20 border border-red-700/50 rounded-lg px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-[#E31837] hover:bg-[#b8132c] disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm mt-2"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Generating All Content...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Generate All Listings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Output Dashboard */}
        <div className="flex-1 overflow-y-auto">
          {!generatedData && !loading && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#1a1d27] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-700/50">
                  <svg
                    className="w-8 h-8 text-slate-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-slate-400 font-medium mb-1">
                  Ready to generate
                </h3>
                <p className="text-sm text-slate-600">
                  Fill in product details and click Generate All Listings
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#1a1d27] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#E31837]/30">
                  <svg
                    className="animate-spin w-8 h-8 text-[#E31837]"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                </div>
                <h3 className="text-slate-300 font-medium mb-1">
                  Generating listings...
                </h3>
                <p className="text-sm text-slate-600">
                  Claude is writing optimised content for all platforms
                </p>
              </div>
            </div>
          )}

          {generatedData && !loading && (
            <div>
              {/* Tab Bar */}
              <div className="flex gap-1 mb-6 bg-[#1a1d27] rounded-xl p-1 border border-slate-700/50">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                      activeTab === tab
                        ? "bg-[#E31837] text-white"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* MARKETPLACES TAB */}
              {activeTab === "Marketplaces" && (
                <div className="space-y-4">
                  {/* Amazon */}
                  <OutputSection
                    title="🛒 Amazon UK"
                    copyText={[
                      `Title: ${generatedData.amazon.title}`,
                      `\nBullets:\n${generatedData.amazon.bullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}`,
                      `\nKeywords: ${generatedData.amazon.keywords}`,
                      `\nDescription: ${generatedData.amazon.description}`,
                    ].join("")}
                  >
                    <Field
                      label={`Title (${generatedData.amazon.title.length}/200 chars)`}
                      value={generatedData.amazon.title}
                    />
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wide">
                          5 Bullet Points
                        </span>
                        <CopyButton
                          text={generatedData.amazon.bullets.join("\n")}
                          label="Copy All"
                        />
                      </div>
                      <div className="space-y-1.5">
                        {generatedData.amazon.bullets.map((bullet, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 bg-[#0f1117] rounded p-3 border border-slate-700/30 group"
                          >
                            <span className="text-[#E31837] text-xs font-bold mt-0.5 flex-shrink-0">
                              •
                            </span>
                            <span className="text-sm text-slate-200 flex-1">
                              {bullet}
                            </span>
                            <CopyButton text={bullet} />
                          </div>
                        ))}
                      </div>
                    </div>
                    <Field
                      label="Search Terms / Keywords"
                      value={generatedData.amazon.keywords}
                    />
                    <Field
                      label="Description"
                      value={generatedData.amazon.description}
                    />
                  </OutputSection>

                  {/* eBay */}
                  <OutputSection
                    title="🏪 eBay"
                    copyText={`Title: ${generatedData.ebay.title}\n\nDescription:\n${generatedData.ebay.description}`}
                  >
                    <Field
                      label={`Title (${generatedData.ebay.title.length}/80 chars)`}
                      value={generatedData.ebay.title}
                    />
                    <Field
                      label="Item Description"
                      value={generatedData.ebay.description}
                    />
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wide">
                          Item Specifics
                        </span>
                        <CopyButton
                          text={Object.entries(generatedData.ebay.specifics)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join("\n")}
                          label="Copy All"
                        />
                      </div>
                      <div className="bg-[#0f1117] rounded border border-slate-700/30 overflow-hidden">
                        {Object.entries(generatedData.ebay.specifics).map(
                          ([key, value], i) => (
                            <div
                              key={i}
                              className="flex items-center border-b border-slate-700/20 last:border-0"
                            >
                              <span className="text-xs text-slate-500 px-3 py-2 w-32 flex-shrink-0 border-r border-slate-700/20">
                                {key}
                              </span>
                              <span className="text-sm text-slate-200 px-3 py-2 flex-1">
                                {value}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </OutputSection>

                  {/* AliExpress */}
                  <OutputSection
                    title="🌐 AliExpress"
                    copyText={`Title: ${generatedData.aliexpress.title}\n\nDescription:\n${generatedData.aliexpress.description}`}
                  >
                    <Field label="Title" value={generatedData.aliexpress.title} />
                    <Field
                      label="Description"
                      value={generatedData.aliexpress.description}
                    />
                  </OutputSection>

                  {/* Yahoo Japan */}
                  <OutputSection
                    title="🇯🇵 Yahoo Japan"
                    copyText={`Title: ${generatedData.yahoo_jp.title}\n\nDescription:\n${generatedData.yahoo_jp.description}`}
                  >
                    <Field label="Title" value={generatedData.yahoo_jp.title} />
                    <Field
                      label="Description"
                      value={generatedData.yahoo_jp.description}
                    />
                  </OutputSection>

                  {/* Rakuten */}
                  <OutputSection
                    title="🏬 Rakuten"
                    copyText={`Title: ${generatedData.rakuten.title}\n\nDescription:\n${generatedData.rakuten.description}`}
                  >
                    <Field label="Title" value={generatedData.rakuten.title} />
                    <Field
                      label="Description"
                      value={generatedData.rakuten.description}
                    />
                  </OutputSection>

                  {/* WooCommerce */}
                  <OutputSection
                    title="🛍️ WooCommerce"
                    copyText={[
                      `Product Title: ${generatedData.woocommerce.title}`,
                      `\nShort Description: ${generatedData.woocommerce.short_description}`,
                      `\nLong Description:\n${generatedData.woocommerce.long_description}`,
                      `\nSEO Meta Title: ${generatedData.woocommerce.meta_title}`,
                      `\nSEO Meta Description: ${generatedData.woocommerce.meta_description}`,
                    ].join("")}
                  >
                    <Field
                      label="Product Title"
                      value={generatedData.woocommerce.title}
                    />
                    <Field
                      label="Short Description"
                      value={generatedData.woocommerce.short_description}
                    />
                    <Field
                      label="Long Description (HTML)"
                      value={generatedData.woocommerce.long_description}
                    />
                    <Field
                      label="SEO Meta Title"
                      value={generatedData.woocommerce.meta_title}
                    />
                    <Field
                      label="SEO Meta Description"
                      value={generatedData.woocommerce.meta_description}
                    />
                  </OutputSection>
                </div>
              )}

              {/* SOCIAL CONTENT TAB */}
              {activeTab === "Social Content" && (
                <div className="space-y-4">
                  {/* Facebook */}
                  <OutputSection
                    title="📘 Facebook"
                    copyText={generatedData.facebook.post}
                  >
                    <Field label="Post Caption" value={generatedData.facebook.post} />
                  </OutputSection>

                  {/* YouTube */}
                  <OutputSection
                    title="▶️ YouTube"
                    copyText={[
                      `Title: ${generatedData.youtube.title}`,
                      `\nDescription:\n${generatedData.youtube.description}`,
                      `\nTags: ${generatedData.youtube.tags}`,
                      `\nScript Outline:\n${generatedData.youtube.script_outline}`,
                    ].join("")}
                  >
                    <Field label="Video Title" value={generatedData.youtube.title} />
                    <Field
                      label="Description"
                      value={generatedData.youtube.description}
                    />
                    <Field
                      label="Tags (comma separated)"
                      value={generatedData.youtube.tags}
                    />
                    <Field
                      label="Script Outline (2-min video)"
                      value={generatedData.youtube.script_outline}
                    />
                  </OutputSection>

                  {/* Twitter/X */}
                  <OutputSection
                    title="🐦 Twitter / X"
                    copyText={generatedData.twitter.thread.join("\n\n")}
                  >
                    <div className="space-y-2">
                      {generatedData.twitter.thread.map((tweet, i) => (
                        <div
                          key={i}
                          className="bg-[#0f1117] rounded p-3 border border-slate-700/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2 flex-1">
                              <span className="text-[#E31837] text-xs font-bold flex-shrink-0 mt-0.5">
                                {i + 1}/3
                              </span>
                              <span className="text-sm text-slate-200">{tweet}</span>
                            </div>
                            <CopyButton text={tweet} />
                          </div>
                          <div className="text-right mt-1">
                            <span
                              className={`text-xs ${tweet.length > 280 ? "text-red-400" : "text-slate-600"}`}
                            >
                              {tweet.length}/280
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </OutputSection>

                  {/* LINE */}
                  <OutputSection
                    title="💬 LINE"
                    copyText={generatedData.line.message}
                  >
                    <Field label="Message" value={generatedData.line.message} />
                  </OutputSection>

                  {/* Reddit */}
                  <OutputSection
                    title="🤖 Reddit"
                    copyText={`${generatedData.reddit.title}\n\n${generatedData.reddit.body}`}
                  >
                    <Field
                      label="Post Title (r/CarAV · r/CarPlay · r/AndroidAuto)"
                      value={generatedData.reddit.title}
                    />
                    <Field label="Post Body" value={generatedData.reddit.body} />
                  </OutputSection>
                </div>
              )}

              {/* AI RECOMMENDATION TAB */}
              {activeTab === "AI Recommendation" && (
                <div className="space-y-4">
                  <OutputSection
                    title="🤝 Frequently Bought Together"
                    copyText={`Suggestions:\n${generatedData.ai_recommendation.suggestions.join("\n")}\n\n${generatedData.ai_recommendation.blurb}`}
                  >
                    <div className="mb-4">
                      <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">
                        Recommended Add-ons
                      </span>
                      <div className="space-y-2">
                        {generatedData.ai_recommendation.suggestions.map(
                          (s, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 bg-[#0f1117] rounded p-3 border border-slate-700/30"
                            >
                              <div className="w-7 h-7 bg-[#E31837]/10 border border-[#E31837]/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                <span className="text-[#E31837] text-xs font-bold">
                                  {i + 1}
                                </span>
                              </div>
                              <span className="text-sm text-slate-200 flex-1">
                                {s}
                              </span>
                              <CopyButton text={s} />
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    <Field
                      label="Amazon-Style Recommendation Blurb"
                      value={generatedData.ai_recommendation.blurb}
                    />
                  </OutputSection>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
