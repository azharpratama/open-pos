import { describe, it, expect } from "vitest";

/**
 * Tests for src/lib/clear-datasets.ts
 * Pure functions: isDatasetKey, withRequired.
 * Validates that the DATASETS metadata is internally consistent.
 */

import {
  DATASET_KEYS,
  DATASETS,
  DATASET_BY_KEY,
  isDatasetKey,
  withRequired,
  type DatasetKey,
} from "@/lib/clear-datasets";

// ---------- isDatasetKey ----------

describe("isDatasetKey", () => {
  it("returns true for every valid key", () => {
    for (const key of DATASET_KEYS) {
      expect(isDatasetKey(key)).toBe(true);
    }
  });

  it("returns false for unknown strings", () => {
    expect(isDatasetKey("unknown")).toBe(false);
    expect(isDatasetKey("")).toBe(false);
    expect(isDatasetKey("SALES")).toBe(false); // case-sensitive
  });

  it("returns false for non-string types", () => {
    expect(isDatasetKey(null)).toBe(false);
    expect(isDatasetKey(undefined)).toBe(false);
    expect(isDatasetKey(123)).toBe(false);
    expect(isDatasetKey({})).toBe(false);
    expect(isDatasetKey([])).toBe(false);
  });
});

// ---------- DATASETS metadata consistency ----------

describe("DATASETS metadata", () => {
  it("every key in DATASETS appears in DATASET_KEYS", () => {
    for (const d of DATASETS) {
      expect(DATASET_KEYS).toContain(d.key);
    }
  });

  it("DATASET_BY_KEY has an entry for every key in DATASET_KEYS", () => {
    for (const key of DATASET_KEYS) {
      expect(DATASET_BY_KEY[key]).toBeDefined();
      expect(DATASET_BY_KEY[key].key).toBe(key);
    }
  });

  it("all `requires` entries point to valid DatasetKeys", () => {
    for (const d of DATASETS) {
      for (const req of d.requires) {
        expect(DATASET_KEYS).toContain(req);
      }
    }
  });

  it("no dataset requires itself (no self-loop)", () => {
    for (const d of DATASETS) {
      expect(d.requires).not.toContain(d.key);
    }
  });

  it("every dataset has a non-empty label, description, and tables field", () => {
    for (const d of DATASETS) {
      expect(d.label.trim().length).toBeGreaterThan(0);
      expect(d.description.trim().length).toBeGreaterThan(0);
      expect(d.tables.trim().length).toBeGreaterThan(0);
    }
  });
});

// ---------- withRequired ----------

describe("withRequired", () => {
  it("includes the key itself", () => {
    const result = withRequired(["sales"]);
    expect(result.has("sales")).toBe(true);
  });

  it("menu requires sales — selecting menu auto-includes sales", () => {
    const result = withRequired(["menu"]);
    expect(result.has("menu")).toBe(true);
    expect(result.has("sales")).toBe(true);
  });

  it("inventory requires procurement — selecting inventory auto-includes procurement", () => {
    const result = withRequired(["inventory"]);
    expect(result.has("inventory")).toBe(true);
    expect(result.has("procurement")).toBe(true);
  });

  it("dataset with no requirements returns only itself", () => {
    const result = withRequired(["sales"]);
    // sales.requires = [] → only sales
    expect([...result]).toEqual(["sales"]);
  });

  it("selecting everything returns all keys", () => {
    const result = withRequired(DATASET_KEYS);
    for (const key of DATASET_KEYS) {
      expect(result.has(key as DatasetKey)).toBe(true);
    }
  });

  it("is idempotent — calling twice with same input gives same result", () => {
    const a = withRequired(["menu", "inventory"]);
    const b = withRequired(["menu", "inventory"]);
    expect([...a].sort()).toEqual([...b].sort());
  });

  it("empty input returns empty set", () => {
    const result = withRequired([]);
    expect(result.size).toBe(0);
  });

  it("does not produce duplicates even when multiple paths lead to the same required key", () => {
    // Both menu (→ sales) and sales direct — sales should appear only once
    const result = withRequired(["menu", "sales"]);
    const arr = [...result];
    const unique = new Set(arr);
    expect(arr.length).toBe(unique.size);
  });
});
