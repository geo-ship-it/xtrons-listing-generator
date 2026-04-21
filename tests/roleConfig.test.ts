import test from "node:test";
import assert from "node:assert/strict";

import {
  getDefaultAmazonMarket,
  getDefaultFacebookLang,
  getDefaultTwitterLang,
  getVisibleMarketplaceCards,
  getVisibleSocialCards,
  getVisibleAmazonMarkets,
  getVisibleFacebookLangs,
  getVisibleTwitterLangs,
  getVisibleTabs,
  isModuleAllowed,
} from "../app/lib/roleConfig.ts";

test("Japan role exposes exactly Marketplaces, Social Content, AI Picks tabs in required order", () => {
  assert.deepEqual(getVisibleTabs("Japan"), ["Marketplaces", "Social Content", "AI Picks"]);
});

test("Japan role rejects every non-Japan module", () => {
  const bannedForJapan = [
    "amazon", "ebay", "aliexpress", "alibaba", "woocommerce",
    "youtube", "reddit", "facebook", "facebook_b2b", "twitter",
    "newsletter",
  ];
  for (const mod of bannedForJapan) {
    assert.equal(isModuleAllowed("Japan", mod), false, `${mod} must be hidden for Japan`);
  }
  const allowedForJapan = [
    "amazon_jp", "rakuten", "yahoo_jp", "yahoo_auction",
    "line", "facebook_jp", "twitter_jp", "ai_recommendation",
  ];
  for (const mod of allowedForJapan) {
    assert.equal(isModuleAllowed("Japan", mod), true, `${mod} must be visible for Japan`);
  }
});

test("Japan role only exposes the approved marketplace cards in the required order", () => {
  assert.deepEqual(getVisibleMarketplaceCards("Japan"), [
    "amazon",
    "rakuten",
    "yahoo_jp",
    "yahoo_auction",
  ]);
});

test("Japan role only exposes the approved social cards in the required order", () => {
  assert.deepEqual(getVisibleSocialCards("Japan"), [
    "facebook",
    "twitter",
    "line",
  ]);
});

test("Japan role defaults to the Japan-specific sub-views", () => {
  assert.equal(getDefaultAmazonMarket("Japan"), "JP");
  assert.equal(getDefaultFacebookLang("Japan"), "JP");
  assert.equal(getDefaultTwitterLang("Japan"), "JP");
  assert.deepEqual(getVisibleAmazonMarkets("Japan"), ["JP"]);
  assert.deepEqual(getVisibleFacebookLangs("Japan"), ["JP"]);
  assert.deepEqual(getVisibleTwitterLangs("Japan"), ["JP"]);
});

test("Ebay role only shows ebay marketplace and AI Picks", () => {
  assert.deepEqual(getVisibleTabs("Ebay"), ["Marketplaces", "AI Picks"]);
  assert.deepEqual(getVisibleMarketplaceCards("Ebay"), ["ebay"]);
  assert.deepEqual(getVisibleSocialCards("Ebay"), []);
  assert.deepEqual(getVisibleAmazonMarkets("Ebay"), []);
});

test("Amazon role only shows amazon marketplace, non-JP market tabs, and AI Picks", () => {
  assert.deepEqual(getVisibleTabs("Amazon"), ["Marketplaces", "AI Picks"]);
  assert.deepEqual(getVisibleMarketplaceCards("Amazon"), ["amazon"]);
  assert.deepEqual(getVisibleAmazonMarkets("Amazon"), ["UK", "US", "DE"]);
  assert.equal(getDefaultAmazonMarket("Amazon"), "UK");
  assert.deepEqual(getVisibleSocialCards("Amazon"), []);
});

test("SEO role shows WooCommerce, all social cards, AI picks, and EN defaults", () => {
  assert.deepEqual(getVisibleTabs("SEO"), ["Marketplaces", "Social Content", "AI Picks"]);
  assert.deepEqual(getVisibleMarketplaceCards("SEO"), ["woocommerce"]);
  assert.deepEqual(getVisibleSocialCards("SEO"), ["facebook", "youtube", "twitter", "line", "reddit"]);
  assert.deepEqual(getVisibleFacebookLangs("SEO"), ["EN"]);
  assert.deepEqual(getVisibleTwitterLangs("SEO"), ["EN"]);
  assert.equal(getDefaultFacebookLang("SEO"), "EN");
  assert.equal(getDefaultTwitterLang("SEO"), "EN");
});

test("Trading role only shows Alibaba, Facebook B2B, AI picks, and Newsletter", () => {
  assert.deepEqual(getVisibleTabs("Trading"), ["Marketplaces", "Social Content", "AI Picks", "Newsletter"]);
  assert.deepEqual(getVisibleMarketplaceCards("Trading"), ["alibaba"]);
  assert.deepEqual(getVisibleSocialCards("Trading"), ["facebook"]);
  assert.deepEqual(getVisibleFacebookLangs("Trading"), ["B2B"]);
  assert.deepEqual(getVisibleTwitterLangs("Trading"), []);
  assert.equal(getDefaultFacebookLang("Trading"), "B2B");
});
