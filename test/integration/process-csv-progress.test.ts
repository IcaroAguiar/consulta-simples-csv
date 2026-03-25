import { describe, expect, it } from "vitest";

import { processCsv } from "../../src/core/app/process-csv.use-case";
import { MockSimplesLookupAdapter } from "../../src/core/simples/adapters/mock-simples-lookup.adapter";

describe("processCsv progress", () => {
  it("reports progress only for unique valid lookups", async () => {
    const csv = [
      "nome;cpf_cnpj",
      "Empresa A;00.000.000/0001-91",
      "Empresa B;00.000.000/0001-91",
      "Empresa C;12.345.678/0001-95",
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
      currentCnpj: "00000000000191",
    });
    expect(progressEvents[1]).toMatchObject({
      completedUniqueLookups: 2,
      totalUniqueLookups: 2,
      currentCnpj: "12345678000195",
      estimatedRemainingMs: 0,
    });
  });
});
