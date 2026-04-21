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

test("Japan generation plan excludes non-Japan platforms and uses lower token budgets", () => {
  const plan = buildGenerationPlan({ ...basePayload, userRole: "Japan" });
  assert.equal(plan.length, 2);

  const marketplace = plan.find((task) => task.key === "marketplace");
  const social = plan.find((task) => task.key === "social");

  assert.ok(marketplace);
  assert.ok(social);

  assert.equal(marketplace?.maxTokens, 2200);
  assert.equal(social?.maxTokens, 1800);

  const marketplacePrompt = marketplace?.prompt ?? "";
  const socialPrompt = social?.prompt ?? "";

  assert.match(marketplacePrompt, /\"amazon\"/i);
  assert.match(marketplacePrompt, /\"rakuten\"/i);
  assert.match(marketplacePrompt, /\"yahoo_jp\"/i);
  assert.match(marketplacePrompt, /\"yahoo_auction\"/i);
  assert.doesNotMatch(marketplacePrompt, /\"ebay\"/i);
  assert.doesNotMatch(marketplacePrompt, /\"aliexpress\"/i);
  assert.doesNotMatch(marketplacePrompt, /\"alibaba\"/i);
  assert.doesNotMatch(marketplacePrompt, /\"woocommerce\"/i);

  assert.match(socialPrompt, /\"facebook\"/i);
  assert.match(socialPrompt, /\"twitter\"/i);
  assert.match(socialPrompt, /\"line\"/i);
  assert.match(socialPrompt, /\"ai_recommendation\"/i);
  assert.doesNotMatch(socialPrompt, /\"youtube\"/i);
  assert.doesNotMatch(socialPrompt, /\"reddit\"/i);
  assert.doesNotMatch(socialPrompt, /\"newsletter\"/i);
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
