import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/menu/route";

describe("GET /api/menu", () => {
  it("fetches the menu from the live database and returns structured data", async () => {
    const res = await GET();
    
    expect(res.status).toBe(200);
    
    const body = await res.json();
    expect(body).toHaveProperty("data");
    
    expect(Array.isArray(body.data)).toBe(true);
    
    // Check if the first item (if any) has the expected shape
    if (body.data.length > 0) {
      const firstItem = body.data[0];
      expect(firstItem).toHaveProperty("id");
      expect(firstItem).toHaveProperty("name");
      expect(firstItem).toHaveProperty("price");
      expect(firstItem).toHaveProperty("category");
      expect(firstItem).toHaveProperty("available");
      expect(Array.isArray(firstItem.recipe)).toBe(true);
    }
  });
});
