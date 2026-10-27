import { config } from "dotenv";
import { resolve } from "path";
import { vi } from "vitest";

// Load .env.local for integration tests
config({ path: resolve(__dirname, "../.env.local") });

// Mock next/headers to prevent 'cookies was called outside a request scope'
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(() => []),
  })),
}));
