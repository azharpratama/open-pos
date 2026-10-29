import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEMO_DEPLOYMENT_ERROR,
  describeDbError,
  isDemoDeployment,
} from "@/lib/db-client";

describe("describeDbError", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  it("tells a Vercel user the deployment is a sandbox, not a broken database", () => {
    vi.stubEnv("VERCEL", "1");
    const err = Object.assign(
      new Error("connect ECONNREFUSED 127.0.0.1:5432"),
      { code: "ECONNREFUSED" },
    );

    expect(describeDbError(err).message).toBe(DEMO_DEPLOYMENT_ERROR);
    expect(describeDbError(err).message).not.toContain("brew");
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

describe("isDemoDeployment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is true when no database is configured", () => {
    vi.stubEnv("DATABASE_URL", "");
    expect(isDemoDeployment()).toBe(true);
  });

  it("is false when a database is configured", () => {
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@db.example.com:5432/app");
    expect(isDemoDeployment()).toBe(false);
  });
});
