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
      "Empresa A;00.000.000/0001-91;00.000.000/0001-91;00000000000191;true;true;false;SUCCESS;mock;;2",
    );
    expect(result.outputCsv).toContain(
      "Empresa B;00.000.000/0001-91;00.000.000/0001-91;00000000000191;true;true;false;SUCCESS;mock;;3",
    );
    expect(result.outputCsv).toContain(
      "Empresa C;12.345.678/0001-95;12.345.678/0001-95;12345678000195;true;false;false;SUCCESS;mock;;4",
    );
    expect(result.outputCsv).toContain(
      "Empresa D;123;123;123;false;;;INVALID_CNPJ;system;CNPJ invalido;5",
    );
  });

  it("keeps tab-separated input and output aligned end to end", async () => {
    const csv = [
      "\uFEFFnome\tcpf_cnpj",
      "Empresa A\t00.000.000/0001-91",
      "Empresa B\t12.345.678/0001-95",
    ].join("\r\n");

    const provider = new MockSimplesLookupAdapter();

    const result = await processCsv(csv, provider);

    expect(result.summary.totalLinhas).toBe(2);
    expect(result.summary.totalCnpjsUnicosConsultados).toBe(2);
    expect(result.outputCsv.startsWith("nome\tcpf_cnpj\tcnpj_original")).toBe(
      true,
    );
    expect(result.outputCsv).toContain(
      "Empresa A\t00.000.000/0001-91\t00.000.000/0001-91\t00000000000191\ttrue\ttrue\tfalse\tSUCCESS\tmock\t\t2",
    );
  });

  it("processes single-column input end to end", async () => {
    const csv = ["cnpj", "00.000.000/0001-91", "12.345.678/0001-95"].join("\n");

    const provider = new MockSimplesLookupAdapter();

    const result = await processCsv(csv, provider);

    expect(result.summary.totalLinhas).toBe(2);
    expect(result.summary.totalCnpjsUnicosConsultados).toBe(2);
    expect(result.outputCsv.startsWith("cnpj;cnpj_original")).toBe(true);
    expect(result.outputCsv).toContain(
      "00.000.000/0001-91;00.000.000/0001-91;00000000000191;true;true;false;SUCCESS;mock;;2",
    );
  });

  it("ignores preamble lines before the actual csv header", async () => {
    const csv = [
      "Tabela 1",
      ";;;;;",
      "Código Fornecedor;Nome 1;CNPJ;Concat;EXT.TEXTO;Regime",
      "513441;PRESMET;23.843.196/0001-81;PRESMET;PRESMET;Normal",
      "513656;BRASIL TELERADIO;05.051.624/0001-51;BRASIL;BRASIL;Simples Nacional",
    ].join("\n");

    const provider = new MockSimplesLookupAdapter();

    const result = await processCsv(csv, provider);

    expect(result.summary.totalLinhas).toBe(2);
    expect(result.summary.totalCnpjsEncontrados).toBe(2);
    expect(result.summary.totalCnpjsUnicosConsultados).toBe(2);
    expect(result.outputCsv.startsWith("Código Fornecedor;Nome 1;CNPJ")).toBe(
      true,
    );
    expect(result.outputCsv).not.toContain("Tabela 1");
    expect(result.outputCsv).toContain(
      "513441;PRESMET;23.843.196/0001-81;PRESMET;PRESMET;Normal;23.843.196/0001-81;23843196000181;true;",
    );
    expect(result.outputCsv).toContain(
      "513656;BRASIL TELERADIO;05.051.624/0001-51;BRASIL;BRASIL;Simples Nacional;05.051.624/0001-51;05051624000151;true;",
    );
    expect(result.outputCsv).toContain(";mock;;4");
    expect(result.outputCsv).toContain(";mock;;5");
  });
});
