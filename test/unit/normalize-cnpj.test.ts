import { describe, expect, it } from "vitest";

import { normalizeCnpj } from "../../src/core/cnpj/normalize-cnpj";

describe("normalizeCnpj", () => {
  it("remove punctuation and whitespace", () => {
    expect(normalizeCnpj(" 03.426.484/0001-23 ")).toBe("03426484000123");
  });

  it("returns only digits even with mixed text", () => {
    expect(normalizeCnpj("CNPJ: 03.426.484/0001-23")).toBe("03426484000123");
  });
});
