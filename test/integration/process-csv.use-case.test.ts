import { describe, expect, it } from "vitest";

import { processCsv } from "../../src/core/app/process-csv.use-case";
import { MockSimplesLookupAdapter } from "../../src/core/simples/adapters/mock-simples-lookup.adapter";

describe("processCsv", () => {
  it("enriches rows, reuses duplicate lookups, and preserves original columns", async () => {
    const csv = [
      "nome;cpf_cnpj",
      "Empresa A;11.222.333/0001-81",
      "Empresa B;11.222.333/0001-81",
      "Empresa C;03.426.484/0001-23",
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
      "Empresa A;11.222.333/0001-81;11.222.333/0001-81;11222333000181;true;true;false;SUCCESS;mock;;1",
    );
    expect(result.outputCsv).toContain(
      "Empresa B;11.222.333/0001-81;11.222.333/0001-81;11222333000181;true;true;false;SUCCESS;mock;;2",
    );
    expect(result.outputCsv).toContain(
      "Empresa C;03.426.484/0001-23;03.426.484/0001-23;03426484000123;true;;;NOT_FOUND;mock;;3",
    );
    expect(result.outputCsv).toContain(
      "Empresa D;123;123;123;false;;;INVALID_CNPJ;system;CNPJ invalido;4",
    );
  });
});
