import test from "node:test";
import assert from "node:assert/strict";

import {
  createMemoryHistoryStorage,
  listGenerationHistory,
  saveGenerationHistory,
  loadGenerationHistory,
  removeGenerationHistory,
  clearGenerationHistory,
  makeGenerationHistoryEntry,
} from "../app/lib/generationHistory.ts";

test("save/list/load/remove history entries using provided storage", () => {
  const storage = createMemoryHistoryStorage();
  const entry = makeGenerationHistoryEntry({
    role: "Japan",
    productName: "XTRONS Stereo",
    sku: "IQ123BMTL",
    sourceUrl: "https://xtrons.com/iq123bmtl",
    formData: { productName: "XTRONS Stereo", sku: "IQ123BMTL" },
    generatedData: { woocommerce: { title: "Woo title" } },
    options: { includeWhyChoose: true, includeFaq: false, whyChoosePreset: "quality-assurance", wooViewMode: "html" },
  });

  saveGenerationHistory(entry, storage);

  const items = listGenerationHistory(storage);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, entry.id);
  assert.equal(loadGenerationHistory(entry.id, storage)?.sku, "IQ123BMTL");
  assert.equal(loadGenerationHistory(entry.id, storage)?.options?.whyChoosePreset, "quality-assurance");

  removeGenerationHistory(entry.id, storage);
  assert.equal(listGenerationHistory(storage).length, 0);
});

test("history is capped at 50 items with newest first", () => {
  const storage = createMemoryHistoryStorage();

  for (let i = 0; i < 55; i++) {
    const entry = makeGenerationHistoryEntry({
      role: "Geo",
      productName: `Product ${i}`,
      sku: `SKU-${i}`,
      formData: { productName: `Product ${i}` },
      generatedData: { woocommerce: { title: `Title ${i}` } },
      createdAt: new Date(2026, 0, 1, 0, i, 0).toISOString(),
    });
    saveGenerationHistory(entry, storage);
  }

  const items = listGenerationHistory(storage);
  assert.equal(items.length, 50);
  assert.equal(items[0].sku, "SKU-54");
  assert.equal(items.at(-1)?.sku, "SKU-5");
});

test("clearGenerationHistory removes all saved entries", () => {
  const storage = createMemoryHistoryStorage();
  saveGenerationHistory(
    makeGenerationHistoryEntry({
      role: "SEO",
      productName: "Example",
      sku: "SEO-1",
      formData: { productName: "Example" },
      generatedData: { woocommerce: { title: "Example" } },
    }),
    storage
  );

  clearGenerationHistory(storage);
  assert.deepEqual(listGenerationHistory(storage), []);
});
