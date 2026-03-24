import { describe, expect, it } from "vitest";

import { detectCnpjColumn } from "../../src/core/ingestion/detect-cnpj-column";

describe("detectCnpjColumn", () => {
  it("prefers explicit override when present", () => {
    expect(
      detectCnpjColumn(["documento", "nome"], { override: "documento" }),
    ).toBe("documento");
  });

  it("matches override with trim and case-insensitive comparison", () => {
    expect(
      detectCnpjColumn(["cpf_cnpj", "nome"], { override: " CPF_CNPJ " }),
    ).toBe("cpf_cnpj");
  });

  it("detects known header names case-insensitively", () => {
    expect(detectCnpjColumn(["Nome", "CNPJ", "Cidade"])).toBe("CNPJ");
  });

  it("detects known headers even when the first header contains a BOM", () => {
    expect(detectCnpjColumn(["\uFEFFcnpj", "nome"])).toBe("\uFEFFcnpj");
  });

  it("returns null when no supported column is present", () => {
    expect(detectCnpjColumn(["nome", "cidade"])).toBeNull();
  });
});
