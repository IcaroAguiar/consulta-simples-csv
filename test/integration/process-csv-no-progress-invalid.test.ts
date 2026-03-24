import { describe, expect, it } from "vitest";

import { processCsv } from "../../src/core/app/process-csv.use-case";
import { MockSimplesLookupAdapter } from "../../src/core/simples/adapters/mock-simples-lookup.adapter";

describe("processCsv without valid lookups", () => {
  it("does not emit progress when there are no valid unique cnpjs", async () => {
    const csv = ["nome;cpf_cnpj", "Empresa A;123", "Empresa B;"].join("\n");
    const progressEvents: number[] = [];

    const result = await processCsv(csv, new MockSimplesLookupAdapter(), {
      onLookupProgress(progress) {
        progressEvents.push(progress.completedUniqueLookups);
      },
    });

    expect(progressEvents).toEqual([]);
    expect(result.summary.totalCnpjsValidos).toBe(0);
    expect(result.summary.totalCnpjsUnicosConsultados).toBe(0);
    expect(result.summary.totalErros).toBe(2);
  });
});
