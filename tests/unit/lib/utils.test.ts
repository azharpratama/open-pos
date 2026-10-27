import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (Tailwind class merger)", () => {
  it("merges basic classes", () => {
    expect(cn("p-4", "m-2")).toBe("p-4 m-2");
  });

  it("handles conditional classes", () => {
    expect(cn("p-4", true && "text-red-500", false && "hidden")).toBe("p-4 text-red-500");
  });

  it("handles arrays", () => {
    expect(cn(["p-4", "m-2"])).toBe("p-4 m-2");
  });

  it("resolves Tailwind conflicts using tailwind-merge", () => {
    // p-4 and p-8 conflict (padding), the last one should win
    expect(cn("p-4", "p-8")).toBe("p-8");
    
    // text-red-500 and text-blue-500 conflict, blue should win
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles undefined, null, and empty strings gracefully", () => {
    expect(cn("p-4", null, undefined, "", "m-2")).toBe("p-4 m-2");
  });
});
