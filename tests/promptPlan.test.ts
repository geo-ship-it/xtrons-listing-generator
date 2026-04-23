import test from "node:test";
import assert from "node:assert/strict";

import { buildGenerationPlan } from "../app/api/generate/promptPlan.ts";

const basePayload = {
  productName: "XTRONS JP Test Stereo",
  sku: "JP-1",
  category: "Car Stereo",
  keyFeatures: "Wireless CarPlay\nAndroid Auto",
  compatibleCars: "For Toyota Prius 2016-2020",
  screenSize: "10.1 inch",
  ramRom: "4GB / 64GB",
  shortDescription: "Japanese-market head unit",
  sellingPoints: "Fast boot and JP UX",
  newsletterTone: "friendly",
  titleVariations: 3,
};

test("Japan generation plan splits marketplace into per-module calls plus one social call", () => {
  const plan = buildGenerationPlan({ ...basePayload, userRole: "Japan" });
  assert.equal(plan.length, 6);
  assert.deepEqual(
    plan.map((task) => task.key),
    ["amazon_jp", "rakuten", "yahoo_jp", "yahoo_auction", "woocommerce", "social"]
  );

  const byKey = Object.fromEntries(plan.map((task) => [task.key, task]));

  // Each Japan marketplace module prompt must be scoped to exactly its own
  // platform — no leakage of the other platforms' top-level JSON keys.
  assert.match(byKey.amazon_jp.prompt, /\"amazon\"/i);
  for (const foreign of [/\"rakuten\"/i, /\"yahoo_jp\"/i, /\"yahoo_auction\"/i, /\"ebay\"/i, /\"alibaba\"/i, /\"aliexpress\"/i, /\"woocommerce\"/i, /\"facebook\"/i, /\"twitter\"/i, /\"line\"/i, /\"reddit\"/i, /\"youtube\"/i]) {
    assert.doesNotMatch(byKey.amazon_jp.prompt, foreign, `amazon_jp prompt must not mention ${foreign}`);
  }
  assert.match(byKey.rakuten.prompt, /\"rakuten\"/i);
  for (const foreign of [/\"amazon\"/i, /\"yahoo_jp\"/i, /\"yahoo_auction\"/i, /\"ebay\"/i]) {
    assert.doesNotMatch(byKey.rakuten.prompt, foreign, `rakuten prompt must not mention ${foreign}`);
  }
  assert.match(byKey.yahoo_jp.prompt, /\"yahoo_jp\"/i);
  for (const foreign of [/\"amazon\"/i, /\"rakuten\"/i, /\"yahoo_auction\"/i]) {
    assert.doesNotMatch(byKey.yahoo_jp.prompt, foreign, `yahoo_jp prompt must not mention ${foreign}`);
  }
  assert.match(byKey.yahoo_auction.prompt, /\"yahoo_auction\"/i);
  for (const foreign of [/\"amazon\"/i, /\"rakuten\"/i, /\"yahoo_jp\"/i, /\"ebay\"/i]) {
    assert.doesNotMatch(byKey.yahoo_auction.prompt, foreign, `yahoo_auction prompt must not mention ${foreign}`);
  }
  assert.match(byKey.woocommerce.prompt, /\"woocommerce\"/i);
  for (const foreign of [/\"amazon\"/i, /\"rakuten\"/i, /\"yahoo_jp\"/i, /\"yahoo_auction\"/i, /\"ebay\"/i, /\"facebook\"/i, /\"twitter\"/i, /\"line\"/i]) {
    assert.doesNotMatch(byKey.woocommerce.prompt, foreign, `woocommerce prompt must not mention ${foreign}`);
  }

  // Social call still combines all 4 Japan social surfaces.
  const socialPrompt = byKey.social.prompt;
  assert.match(socialPrompt, /\"facebook\"/i);
  assert.match(socialPrompt, /\"twitter\"/i);
  assert.match(socialPrompt, /\"line\"/i);
  assert.match(socialPrompt, /\"ai_recommendation\"/i);
  assert.doesNotMatch(socialPrompt, /\"youtube\"/i);
  assert.doesNotMatch(socialPrompt, /\"reddit\"/i);
  assert.doesNotMatch(socialPrompt, /\"newsletter\"/i);

  // Per-module budgets stay comfortably under DeepSeek single-call stall thresholds.
  assert.ok(byKey.amazon_jp.maxTokens <= 1600, `amazon_jp budget ${byKey.amazon_jp.maxTokens} too high for fast single-call completion`);
  assert.ok(byKey.rakuten.maxTokens <= 1000);
  assert.ok(byKey.yahoo_jp.maxTokens <= 1000);
  assert.ok(byKey.yahoo_auction.maxTokens <= 1000);
  assert.ok(byKey.woocommerce.maxTokens <= 1400);
  assert.equal(byKey.social.maxTokens, 1800);
});

test("Ebay generation plan only requests ebay content", () => {
  const plan = buildGenerationPlan({ ...basePayload, userRole: "Ebay" });
  assert.equal(plan.length, 1);
  assert.equal(plan[0]?.key, "marketplace");
  const prompt = plan[0]?.prompt ?? "";
  assert.match(prompt, /\"ebay\"/i);
  assert.doesNotMatch(prompt, /\"amazon\"/i);
  assert.doesNotMatch(prompt, /\"aliexpress\"/i);
  assert.doesNotMatch(prompt, /\"alibaba\"/i);
  assert.doesNotMatch(prompt, /\"woocommerce\"/i);
  assert.doesNotMatch(prompt, /\"facebook\"/i);
  assert.doesNotMatch(prompt, /\"ai_recommendation\"/i);
});

test("Amazon generation plan only requests amazon content", () => {
  const plan = buildGenerationPlan({ ...basePayload, userRole: "Amazon" });
  assert.equal(plan.length, 1);
  assert.equal(plan[0]?.key, "marketplace");
  const prompt = plan[0]?.prompt ?? "";
  assert.match(prompt, /\"amazon\"/i);
  assert.doesNotMatch(prompt, /\"ebay\"/i);
  assert.doesNotMatch(prompt, /\"aliexpress\"/i);
  assert.doesNotMatch(prompt, /\"alibaba\"/i);
  assert.doesNotMatch(prompt, /\"woocommerce\"/i);
  assert.doesNotMatch(prompt, /\"facebook\"/i);
  assert.doesNotMatch(prompt, /\"ai_recommendation\"/i);
});

test("SEO generation plan requests only WooCommerce plus social content and AI picks", () => {
  const plan = buildGenerationPlan({ ...basePayload, userRole: "SEO" });
  assert.equal(plan.length, 2);
  const marketplace = plan.find((task) => task.key === "marketplace")?.prompt ?? "";
  const social = plan.find((task) => task.key === "social")?.prompt ?? "";
  assert.match(marketplace, /\"woocommerce\"/i);
  assert.doesNotMatch(marketplace, /\"amazon\"/i);
  assert.doesNotMatch(marketplace, /\"ebay\"/i);
  assert.doesNotMatch(marketplace, /\"alibaba\"/i);
  assert.match(social, /\"facebook\"/i);
  assert.match(social, /\"youtube\"/i);
  assert.match(social, /\"twitter\"/i);
  assert.match(social, /\"line\"/i);
  assert.match(social, /\"reddit\"/i);
  assert.match(social, /\"ai_recommendation\"/i);
  assert.doesNotMatch(social, /\"newsletter\"/i);
  assert.doesNotMatch(social, /\"alibaba\"/i);
});

test("Trading generation plan requests only Alibaba, Facebook B2B, AI picks, and newsletter", () => {
  const plan = buildGenerationPlan({ ...basePayload, userRole: "Trading" });
  assert.equal(plan.length, 2);
  const marketplace = plan.find((task) => task.key === "marketplace")?.prompt ?? "";
  const social = plan.find((task) => task.key === "social")?.prompt ?? "";
  assert.match(marketplace, /\"alibaba\"/i);
  assert.doesNotMatch(marketplace, /\"amazon\"/i);
  assert.doesNotMatch(marketplace, /\"ebay\"/i);
  assert.doesNotMatch(marketplace, /\"woocommerce\"/i);
  assert.match(social, /\"facebook\"/i);
  assert.match(social, /\"ai_recommendation\"/i);
  assert.match(social, /\"newsletter\"/i);
  assert.doesNotMatch(social, /\"youtube\"/i);
  assert.doesNotMatch(social, /\"twitter\"/i);
  assert.doesNotMatch(social, /\"line\"/i);
  assert.doesNotMatch(social, /\"reddit\"/i);
});
