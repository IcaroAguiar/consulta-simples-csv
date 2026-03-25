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

  it("reads tab-separated files without altering cell content", () => {
    const result = readCsv("\uFEFFcnpj\tnome\r\n123\t  Empresa A  \r\n");

    expect(result.delimiter).toBe("\t");
    expect(result.headers).toEqual(["cnpj", "nome"]);
    expect(result.rows).toEqual([{ cnpj: "123", nome: "  Empresa A  " }]);
  });

  it("preserves multiline quoted cells", () => {
    const result = readCsv('cnpj;descricao\r\n123;"Linha 1\r\nLinha 2"\r\n');

    expect(result.delimiter).toBe(";");
    expect(result.rows).toEqual([
      { cnpj: "123", descricao: "Linha 1\r\nLinha 2" },
    ]);
  });

  it("does not reject valid csv when later fields contain literal tabs", () => {
    const result = readCsv("nome;descricao\nEmpresa A;Texto\tcom\tabas\n");

    expect(result.delimiter).toBe(";");
    expect(result.rows).toEqual([
      { nome: "Empresa A", descricao: "Texto\tcom\tabas" },
    ]);
  });

  it("does not reject valid csv when the header contains a literal comma", () => {
    const result = readCsv("nome;descricao,extra\nEmpresa A;Valor\n");

    expect(result.delimiter).toBe(";");
    expect(result.headers).toEqual(["nome", "descricao,extra"]);
    expect(result.rows).toEqual([
      { nome: "Empresa A", "descricao,extra": "Valor" },
    ]);
  });

  it("ignores textual preamble before the actual table header", () => {
    const result = readCsv(
      [
        "Tabela 1",
        ";;;;;",
        "Código Fornecedor;Nome 1;CNPJ;Concat;EXT.TEXTO;Regime",
        "513441;PRESMET;23843196000181;PRESMET;PRESMET;Normal",
      ].join("\n"),
    );

    expect(result.delimiter).toBe(";");
    expect(result.headers).toEqual([
      "Código Fornecedor",
      "Nome 1",
      "CNPJ",
      "Concat",
      "EXT.TEXTO",
      "Regime",
    ]);
    expect(result.rows).toEqual([
      {
        "Código Fornecedor": "513441",
        "Nome 1": "PRESMET",
        CNPJ: "23843196000181",
        Concat: "PRESMET",
        "EXT.TEXTO": "PRESMET",
        Regime: "Normal",
      },
    ]);
    expect(result.rowLineNumbers).toEqual([4]);
  });

  it("keeps single-column files as a single column", () => {
    const result = readCsv("cnpj\n123\n456\n");

    expect(result.delimiter).toBe(";");
    expect(result.headers).toEqual(["cnpj"]);
    expect(result.rows).toEqual([{ cnpj: "123" }, { cnpj: "456" }]);
  });

  it("fails explicitly when the delimiter is ambiguous", () => {
    expect(() => readCsv("cnpj;nome,razao\n123;Empresa A,LTDA\n")).toThrow(
      "Não foi possível determinar o delimitador do CSV de forma confiável. Use um arquivo com separador consistente (, ; ou tab).",
    );
  });

  it("fails when a single-column file has delimiters in later lines", () => {
    expect(() => readCsv("cnpj\n123\n456;Empresa A\n")).toThrow(
      "O arquivo parece ser de uma coluna única, mas algumas linhas usam separador. Mantenha o arquivo consistente ou remova os delimitadores extras.",
    );
  });
});
