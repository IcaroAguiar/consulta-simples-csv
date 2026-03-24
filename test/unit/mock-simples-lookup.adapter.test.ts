import { describe, expect, it } from "vitest";

import { MockSimplesLookupAdapter } from "../../src/core/simples/adapters/mock-simples-lookup.adapter";

describe("MockSimplesLookupAdapter", () => {
  it("returns fixture values for known cnpjs", async () => {
    const adapter = new MockSimplesLookupAdapter();

    await expect(adapter.lookup("11222333000181")).resolves.toMatchObject({
      cnpj: "11222333000181",
      simplesNacional: true,
      simei: false,
      source: "mock",
      status: "SUCCESS",
    });
  });

  it("returns not found for unknown but valid cnpj", async () => {
    const adapter = new MockSimplesLookupAdapter();

    await expect(adapter.lookup("03426484000123")).resolves.toMatchObject({
      status: "NOT_FOUND",
      source: "mock",
    });
  });
});
