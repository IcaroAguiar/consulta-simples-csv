import { describe, expect, it } from "vitest";

import { extractMessage } from "../../src/renderer/ui/app-helpers";

describe("extractMessage", () => {
  it("returns friendly guidance for xlsx content sent as csv", () => {
    const error = new Error(
      "Error invoking remote method 'csv:process': Error: Invalid Opening Quote: a quote is found on field 0 at line 1, value is \"PK\\u0003\\u0004[Content_Types].xml\"",
    );

    expect(extractMessage(error, "Falha ao processar o CSV.")).toBe(
      "O arquivo selecionado parece ser uma planilha do Excel (.xlsx), não um CSV. Exporte a planilha como CSV UTF-8 e tente novamente.",
    );
  });

  it("returns friendly guidance for malformed csv content", () => {
    const error = new Error(
      "Error invoking remote method 'csv:process': Error: Invalid Opening Quote: a quote is found on field 2 at line 15",
    );

    expect(extractMessage(error, "Falha ao processar o CSV.")).toBe(
      "O arquivo selecionado não parece ser um CSV válido ou está com linhas inconsistentes. Revise o delimitador, as aspas e a codificação do arquivo, e tente novamente.",
    );
  });

  it("returns friendly guidance for ambiguous csv delimiters", () => {
    const error = new Error(
      "Error invoking remote method 'csv:process': Error: Invalid Record Length: expect 1, got 4 on line 208",
    );

    expect(extractMessage(error, "Falha ao processar o CSV.")).toBe(
      "O arquivo selecionado parece usar um delimitador diferente do esperado ou tem linhas quebradas. Revise se o arquivo está separado por ponto e vírgula, vírgula ou tabulação, e tente novamente.",
    );
  });

  it("keeps friendly portuguese messages untouched", () => {
    const error = new Error(
      "O arquivo selecionado parece ser uma planilha do Excel (.xlsx), não um CSV. Exporte a planilha como CSV UTF-8 e tente novamente.",
    );

    expect(extractMessage(error, "Falha ao processar o CSV.")).toBe(
      error.message,
    );
  });

  it("falls back when the error is unknown", () => {
    expect(
      extractMessage(new Error("socket hang up"), "Falha ao salvar o CSV."),
    ).toBe("Falha ao salvar o CSV.");
  });
});
