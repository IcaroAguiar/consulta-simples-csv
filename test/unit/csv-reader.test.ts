import { describe, expect, it } from "vitest";

import { readCsv } from "../../src/core/ingestion/csv-reader";

describe("readCsv", () => {
  it("keeps headers when the file contains only the header row", () => {
    const result = readCsv("cnpj;nome\n");

    expect(result.headers).toEqual(["cnpj", "nome"]);
    expect(result.rows).toEqual([]);
    expect(result.delimiter).toBe(";");
  });

  it("fails with a friendly message when the input looks like an xlsx file", () => {
    expect(() => readCsv("PK\u0003\u0004[Content_Types].xml")).toThrow(
      "O arquivo selecionado parece ser uma planilha do Excel (.xlsx), não um CSV. Exporte a planilha como CSV UTF-8 e tente novamente.",
    );
  });
});
