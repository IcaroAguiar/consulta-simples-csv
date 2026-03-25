import { describe, expect, it } from "vitest";

import { processCsv } from "../../src/core/app/process-csv.use-case";
import { MockSimplesLookupAdapter } from "../../src/core/simples/adapters/mock-simples-lookup.adapter";

describe("processCsv", () => {
  it("enriches rows, reuses duplicate lookups, and preserves original columns", async () => {
    const csv = [
      "nome;cpf_cnpj",
      "Empresa A;00.000.000/0001-91",
      "Empresa B;00.000.000/0001-91",
      "Empresa C;12.345.678/0001-95",
      "Empresa D;123",
    ].join("\n");

    const provider = new MockSimplesLookupAdapter();

    const result = await processCsv(csv, provider);

    expect(result.summary.totalLinhas).toBe(4);
    expect(result.summary.totalCnpjsEncontrados).toBe(4);
    expect(result.summary.totalCnpjsValidos).toBe(3);
    expect(result.summary.totalCnpjsUnicosConsultados).toBe(2);
    expect(result.outputCsv).toContain("simples_nacional");
    expect(result.outputCsv).toContain(
      "Empresa A;00.000.000/0001-91;00.000.000/0001-91;00000000000191;true;true;false;SUCCESS;mock;;1",
    );
    expect(result.outputCsv).toContain(
      "Empresa B;00.000.000/0001-91;00.000.000/0001-91;00000000000191;true;true;false;SUCCESS;mock;;2",
    );
    expect(result.outputCsv).toContain(
      "Empresa C;12.345.678/0001-95;12.345.678/0001-95;12345678000195;true;false;false;SUCCESS;mock;;3",
    );
    expect(result.outputCsv).toContain(
      "Empresa D;123;123;123;false;;;INVALID_CNPJ;system;CNPJ invalido;4",
    );
  });
});
