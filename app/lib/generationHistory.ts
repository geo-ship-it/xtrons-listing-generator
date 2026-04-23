export interface HistoryStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface GenerationHistoryEntry {
  id: string;
  createdAt: string;
  role: string;
  productName: string;
  sku: string;
  sourceUrl?: string;
  formData: Record<string, unknown>;
  generatedData: Record<string, unknown>;
  options?: {
    includeWhyChoose?: boolean;
    includeFaq?: boolean;
    includeCta?: boolean;
    whyChoosePreset?: string;
    wooViewMode?: "html" | "plain";
  };
  version: number;
}

export const HISTORY_STORAGE_KEY = "listing-generator:history";
const MAX_HISTORY_ITEMS = 50;

export function createMemoryHistoryStorage(): HistoryStorageLike {
  const store = new Map<string, string>();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    },
  };
}

function getDefaultStorage(explicit?: HistoryStorageLike): HistoryStorageLike | null {
  if (explicit) return explicit;
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return null;
}

function safeParse(raw: string | null): GenerationHistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function listGenerationHistory(storage?: HistoryStorageLike): GenerationHistoryEntry[] {
  const target = getDefaultStorage(storage);
  if (!target) return [];
  return safeParse(target.getItem(HISTORY_STORAGE_KEY)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveGenerationHistory(entry: GenerationHistoryEntry, storage?: HistoryStorageLike): void {
  const target = getDefaultStorage(storage);
  if (!target) return;
  const current = listGenerationHistory(target).filter((item) => item.id !== entry.id);
  const next = [entry, ...current].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, MAX_HISTORY_ITEMS);
  target.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
}

export function loadGenerationHistory(id: string, storage?: HistoryStorageLike): GenerationHistoryEntry | null {
  return listGenerationHistory(storage).find((item) => item.id === id) ?? null;
}

export function removeGenerationHistory(id: string, storage?: HistoryStorageLike): void {
  const target = getDefaultStorage(storage);
  if (!target) return;
  const next = listGenerationHistory(target).filter((item) => item.id !== id);
  target.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
}

export function clearGenerationHistory(storage?: HistoryStorageLike): void {
  const target = getDefaultStorage(storage);
  if (!target) return;
  target.removeItem(HISTORY_STORAGE_KEY);
}

export function makeGenerationHistoryEntry(params: {
  role: string;
  productName: string;
  sku: string;
  sourceUrl?: string;
  formData: Record<string, unknown>;
  generatedData: Record<string, unknown>;
  options?: GenerationHistoryEntry["options"];
  createdAt?: string;
}): GenerationHistoryEntry {
  const createdAt = params.createdAt ?? new Date().toISOString();
  return {
    id: `${createdAt}-${params.sku || params.productName}`.replace(/[^a-zA-Z0-9_-]+/g, "-"),
    createdAt,
    role: params.role,
    productName: params.productName,
    sku: params.sku,
    sourceUrl: params.sourceUrl,
    formData: params.formData,
    generatedData: params.generatedData,
    options: params.options,
    version: 1,
  };
}
