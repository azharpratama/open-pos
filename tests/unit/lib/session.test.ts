import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the global window object and sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// Save the original window to restore it later if needed, though in Node env
// it's undefined to begin with.
const originalWindow = global.window;

import {
  setRole,
  getRole,
  clearRole,
  setShiftOpen,
  getShiftOpenSnapshot,
  getShiftOpenServerSnapshot,
  subscribeShiftOpen,
} from "@/lib/session";

describe("Session Management", () => {
  beforeEach(() => {
    // Inject our mocked window into the Node global scope
    global.window = {
      sessionStorage: sessionStorageMock,
    } as any;
    sessionStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe("Role Management", () => {
    it("sets and gets a role", () => {
      setRole("KASIR");
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith("openpos:role", "KASIR");
      expect(getRole()).toBe("KASIR");
    });

    it("returns null for unknown role", () => {
      sessionStorageMock.setItem("openpos:role", "HACKER");
      expect(getRole()).toBeNull();
    });

    it("clears the role", () => {
      setRole("OWNER");
      clearRole();
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith("openpos:role");
      expect(getRole()).toBeNull();
    });

    it("handles SSR context safely (window undefined)", () => {
      global.window = undefined as any;
      expect(() => setRole("OWNER")).not.toThrow();
      expect(getRole()).toBeNull();
      expect(() => clearRole()).not.toThrow();
    });
  });

  describe("Shift Management", () => {
    it("opens a shift", () => {
      setShiftOpen(true);
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith("openpos:shift-open", "1");
      expect(getShiftOpenSnapshot()).toBe(true);
    });

    it("closes a shift", () => {
      setShiftOpen(true);
      setShiftOpen(false);

      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith("openpos:shift-open");
      expect(getShiftOpenSnapshot()).toBe(false);
    });

    // Revenue is deliberately NOT kept here any more: a sessionStorage counter
    // read 0 on every other tab, device, and re-login. It now comes from the
    // server (see fetchTodayRevenue in lib/shifts), so opening or closing a
    // shift must not touch any revenue key.
    it("never writes a revenue key", () => {
      setShiftOpen(true);
      setShiftOpen(false);

      const touched = [
        ...sessionStorageMock.setItem.mock.calls,
        ...sessionStorageMock.removeItem.mock.calls,
      ].map((call) => call[0]);
      expect(touched).not.toContain("openpos:shift-revenue");
    });

    it("triggers subscribers on shift state change", () => {
      const listener = vi.fn();
      const unsubscribe = subscribeShiftOpen(listener);
      
      setShiftOpen(true);
      expect(listener).toHaveBeenCalledTimes(1);
      
      setShiftOpen(false);
      expect(listener).toHaveBeenCalledTimes(2);
      
      unsubscribe();
      setShiftOpen(true);
      expect(listener).toHaveBeenCalledTimes(2); // Should not increase
    });

    it("handles SSR contexts for shift state", () => {
      expect(getShiftOpenServerSnapshot()).toBe(false);
      global.window = undefined as any;
      expect(getShiftOpenSnapshot()).toBe(false);
      expect(() => setShiftOpen(true)).not.toThrow();
    });
  });

});
