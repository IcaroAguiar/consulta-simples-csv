import { describe, expect, it } from "vitest";

import { processCsv } from "../../src/core/app/process-csv.use-case";
import { MockSimplesLookupAdapter } from "../../src/core/simples/adapters/mock-simples-lookup.adapter";

describe("processCsv progress", () => {
  it("reports progress only for unique valid lookups", async () => {
    const csv = [
      "nome;cpf_cnpj",
      "Empresa A;11.222.333/0001-81",
      "Empresa B;11.222.333/0001-81",
      "Empresa C;03.426.484/0001-23",
      "Empresa D;123",
    ].join("\n");

    const progressEvents: Array<{
      completedUniqueLookups: number;
      totalUniqueLookups: number;
      currentCnpj: string;
      estimatedRemainingMs: number;
    }> = [];

    await processCsv(csv, new MockSimplesLookupAdapter(), {
      onLookupProgress(progress) {
        progressEvents.push(progress);
      },
    });

    expect(progressEvents).toHaveLength(2);
    expect(progressEvents[0]).toMatchObject({
      completedUniqueLookups: 1,
      totalUniqueLookups: 2,
      currentCnpj: "11222333000181",
    });
    expect(progressEvents[1]).toMatchObject({
      completedUniqueLookups: 2,
      totalUniqueLookups: 2,
      currentCnpj: "03426484000123",
      estimatedRemainingMs: 0,
    });
  });
});
