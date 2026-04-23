import test from "node:test";
import assert from "node:assert/strict";

import {
  htmlToPlainText,
  plainTextToSimpleHtml,
  normalizeWooContent,
  buildCombinedWooHtml,
} from "../app/lib/wooFormatting.ts";

test("htmlToPlainText strips tags and preserves readable line breaks", () => {
  const html = "<p>Hello <strong>world</strong></p><ul><li>One</li><li>Two</li></ul>";
  assert.equal(htmlToPlainText(html), "Hello world\n\n- One\n- Two");
});

test("plainTextToSimpleHtml turns paragraphs and bullets into simple HTML", () => {
  const text = "Intro paragraph\n\n- First item\n- Second item\n\nClosing paragraph";
  assert.equal(
    plainTextToSimpleHtml(text),
    "<p>Intro paragraph</p><ul><li>First item</li><li>Second item</li></ul><p>Closing paragraph</p>"
  );
});

test("normalizeWooContent upgrades legacy long_description into html/text fields and default sections", () => {
  const normalized = normalizeWooContent({
    title: "Legacy title",
    short_description: "Short desc",
    long_description: "<p>Legacy html</p>",
    meta_title: "Meta",
    meta_description: "Meta desc",
  });

  assert.equal(normalized.long_description_html, "<p>Legacy html</p>");
  assert.equal(normalized.long_description_text, "Legacy html");
  assert.deepEqual(normalized.why_choose_us, []);
  assert.deepEqual(normalized.faq, []);
  assert.deepEqual(normalized.accessory_links, []);
  assert.deepEqual(normalized.cta, { headline: "", body: "", button_text: "" });
});

test("buildCombinedWooHtml appends sections in stable order", () => {
  const html = buildCombinedWooHtml({
    title: "Example",
    short_description: "Short",
    long_description_html: "<p>Main body</p>",
    long_description_text: "Main body",
    meta_title: "Meta",
    meta_description: "Meta desc",
    accessory_links: [{ sku: "ACC1", label: "Dash Cam", site: "UK", url: "https://xtrons.co.uk/ACC1" }],
    why_choose_us: [{ heading: "Quality assurance", body: "Built and tested." }],
    faq: [{ question: "Is it plug-and-play?", answer: "Yes for supported vehicles." }],
    cta: { headline: "Need help?", body: "Contact support today.", button_text: "Contact us" },
  });

  assert.match(html, /Main body/);
  assert.match(html, /Why Choose XTRONS/);
  assert.match(html, /Quality assurance/);
  assert.match(html, /FAQ/);
  assert.match(html, /Is it plug-and-play\?/);
  assert.match(html, /Recommended Accessories/);
  assert.match(html, /href="https:\/\/xtrons\.co\.uk\/ACC1"/);
  assert.match(html, /Need help\?/);
});
