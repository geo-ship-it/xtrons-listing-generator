import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRegionalAccessoryUrl,
  extractAccessorySkus,
  inferRegionalStoreFromUrl,
  resolveAccessoryLinks,
} from "../app/lib/accessoryLinks.ts";

test("extractAccessorySkus finds accessory SKUs from free-form text and deduplicates them", () => {
  const skus = extractAccessorySkus(`
    Add optional accessories: DVR023S, DVR023S, CAM009 and OBD002.
    Also compatible with 4G-DONGLE but not random words like SUPPORT.
  `);

  assert.deepEqual(skus, ["DVR023S", "CAM009", "OBD002", "4G-DONGLE"]);
});

test("inferRegionalStoreFromUrl detects the regional XTRONS store from source URLs", () => {
  assert.equal(inferRegionalStoreFromUrl("https://xtrons.co.uk/product/qs123"), "UK");
  assert.equal(inferRegionalStoreFromUrl("https://www.xtrons.com.au/item/abc"), "AU");
  assert.equal(inferRegionalStoreFromUrl("https://xtrons.ae/product/abc"), "AE");
  assert.equal(inferRegionalStoreFromUrl("https://xtrons.com/product/abc"), "COM");
});

test("buildRegionalAccessoryUrl converts SKUs into deterministic regional URLs", () => {
  assert.equal(buildRegionalAccessoryUrl("https://xtrons.co.uk/product/qs123", "DVR023S"), "https://xtrons.co.uk/dvr023s");
  assert.equal(buildRegionalAccessoryUrl("https://xtrons.com.au/product/qs123", "CAM009"), "https://xtrons.com.au/cam009");
  assert.equal(buildRegionalAccessoryUrl("https://xtrons.ae/product/qs123", "OBD002"), "https://xtrons.ae/obd002");
  assert.equal(buildRegionalAccessoryUrl("https://xtrons.com/product/qs123", "4G-DONGLE"), "https://xtrons.com/4g-dongle");
});

test("resolveAccessoryLinks returns unique accessory links for the inferred regional store", () => {
  const links = resolveAccessoryLinks({
    sourceUrl: "https://xtrons.co.uk/product/qs123mzsl",
    accessorySkus: ["DVR023S", "DVR023S", "CAM009", "BAD SKU"],
  });

  assert.deepEqual(links, [
    {
      sku: "DVR023S",
      label: "DVR023S",
      site: "UK",
      url: "https://xtrons.co.uk/dvr023s",
    },
    {
      sku: "CAM009",
      label: "CAM009",
      site: "UK",
      url: "https://xtrons.co.uk/cam009",
    },
  ]);
});
