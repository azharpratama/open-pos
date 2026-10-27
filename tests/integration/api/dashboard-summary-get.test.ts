import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/dashboard/summary/route";

describe("GET /api/dashboard/summary", () => {
  it("fetches dashboard summary from the live database", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    
    const body = await res.json();
    expect(body).toHaveProperty("data");
    
    const data = body.data;
    expect(typeof data.revenueToday).toBe("number");
    expect(typeof data.revenueWeek).toBe("number");
    expect(typeof data.revenueMonth).toBe("number");
    
    expect(typeof data.expenseToday).toBe("number");
    expect(typeof data.expenseWeek).toBe("number");
    expect(typeof data.expenseMonth).toBe("number");
    
    expect(typeof data.profitToday).toBe("number");
    expect(typeof data.profitWeek).toBe("number");
    expect(typeof data.profitMonth).toBe("number");
    
    expect(typeof data.txToday).toBe("number");
    
    expect(Array.isArray(data.trend)).toBe(true);
  });
});
