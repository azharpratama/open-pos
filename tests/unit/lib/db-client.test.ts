import { describe, expect, it } from "vitest";

import { describeDbError } from "@/lib/db-client";

describe("describeDbError", () => {
  it("explains a refused local Postgres connection", () => {
    const err = Object.assign(
      new Error("connect ECONNREFUSED 127.0.0.1:5432"),
      { code: "ECONNREFUSED" },
    );

    expect(describeDbError(err)).toEqual({
      message: expect.stringContaining("Database lokal belum berjalan"),
      code: "ECONNREFUSED",
    });
  });

  it("passes unrelated database errors through unchanged", () => {
    const err = Object.assign(new Error('relation "orders" does not exist'), {
      code: "42P01",
    });

    expect(describeDbError(err)).toEqual({
      message: 'relation "orders" does not exist',
      code: "42P01",
    });
  });
});
