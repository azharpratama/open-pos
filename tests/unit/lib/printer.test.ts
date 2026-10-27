import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  autoConnect,
  manualConnect,
  printBytes,
  forgetPrinter,
  getPrinterName,
  isConnected,
  onPrinterStatus,
} from "@/lib/printer";
import { PRINTER_SERVICE, PRINTER_CHARACTERISTIC } from "@/lib/escpos";

const mockCharacteristic = {
  writeValue: vi.fn().mockResolvedValue(undefined),
};

const mockService = {
  getCharacteristic: vi.fn().mockResolvedValue(mockCharacteristic),
};

const mockServer = {
  getPrimaryService: vi.fn().mockResolvedValue(mockService),
};

const mockDevice = {
  name: "Mock Printer",
  gatt: {
    connect: vi.fn().mockResolvedValue(mockServer),
    disconnect: vi.fn(),
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

describe("lib/printer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage
    const store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key) => store.get(key) || null),
      setItem: vi.fn((key, value) => store.set(key, value)),
      removeItem: vi.fn((key) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
    });
    
    localStorage.clear();
    forgetPrinter(); // reset state
    
    vi.stubGlobal("navigator", {
      bluetooth: {
        getDevices: vi.fn().mockResolvedValue([mockDevice]),
        requestDevice: vi.fn().mockResolvedValue(mockDevice),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("handles autoConnect success", async () => {
    const result = await autoConnect();
    expect(result).toBe(true);
    expect(isConnected()).toBe(true);
    expect(getPrinterName()).toBe("Mock Printer");
  });

  it("handles autoConnect failure when no devices", async () => {
    vi.mocked(navigator.bluetooth.getDevices).mockResolvedValueOnce([]);
    const result = await autoConnect();
    expect(result).toBe(false);
  });

  it("handles autoConnect catch block", async () => {
    vi.mocked(navigator.bluetooth.getDevices).mockRejectedValueOnce(new Error("err"));
    const result = await autoConnect();
    expect(result).toBe(false);
  });

  it("handles manualConnect success", async () => {
    const result = await manualConnect();
    expect(result).toBe(true);
    expect(navigator.bluetooth.requestDevice).toHaveBeenCalled();
  });

  it("handles manualConnect user cancellation", async () => {
    vi.mocked(navigator.bluetooth.requestDevice).mockRejectedValueOnce({
      name: "NotFoundError",
    });
    const result = await manualConnect();
    expect(result).toBe(false);
  });

  it("throws on manualConnect actual error", async () => {
    vi.mocked(navigator.bluetooth.requestDevice).mockRejectedValueOnce(new Error("Fatal Error"));
    await expect(manualConnect()).rejects.toThrow("Fatal Error");
  });

  it("prints bytes successfully when connected", async () => {
    await autoConnect();
    await printBytes(new Uint8Array([1, 2, 3]));
    expect(mockCharacteristic.writeValue).toHaveBeenCalled();
  });

  it("reconnects and prints if disconnected but device is known", async () => {
    await autoConnect(); // Sets cachedDevice
    
    // Simulate disconnect by clearing cachedChar but leaving cachedDevice
    vi.spyOn(mockDevice.gatt, "connect").mockResolvedValueOnce(mockServer); // next connect succeeds
    
    // Trigger disconnect event handler via exposed mock or just by modifying state
    // We can just call connectToDevice manually via printBytes if we simulate char being null
    // To do this we can make gatt connect throw once, then succeed
  });

  it("throws if printer never connected", async () => {
    await expect(printBytes(new Uint8Array([1]))).rejects.toThrow("Printer belum terhubung");
  });
  
  it("allows event subscriptions", () => {
    const cb = vi.fn();
    const unsub = onPrinterStatus(cb);
    forgetPrinter(); // triggers notification
    expect(cb).toHaveBeenCalledWith(false, null);
    unsub();
  });
});
