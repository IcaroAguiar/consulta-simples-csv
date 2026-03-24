import { describe, expect, it } from "vitest";

import { attemptAutoSave } from "../../src/renderer/ui/auto-save";

describe("attemptAutoSave", () => {
  it("returns the saved path on success", async () => {
    const result = await attemptAutoSave(
      async () => "/tmp/clientes-processado.csv",
      "/tmp/clientes.csv",
      "conteudo",
    );

    expect(result).toEqual({
      savedPath: "/tmp/clientes-processado.csv",
      warningMessage: null,
    });
  });

  it("returns a warning instead of throwing on save failure", async () => {
    const result = await attemptAutoSave(
      async () => {
        throw new Error("Permissão negada");
      },
      "/tmp/clientes.csv",
      "conteudo",
    );

    expect(result).toEqual({
      savedPath: null,
      warningMessage:
        "Processamento concluído, mas o auto-save falhou: Permissão negada",
    });
  });
});
