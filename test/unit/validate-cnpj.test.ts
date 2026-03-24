import { describe, expect, it } from "vitest";

import { validateCnpj } from "../../src/core/cnpj/validate-cnpj";

describe("validateCnpj", () => {
  it("accepts a valid CNPJ", () => {
    expect(validateCnpj("03426484000123")).toBe(true);
  });

  it("rejects invalid repeated digits", () => {
    expect(validateCnpj("11111111111111")).toBe(false);
  });

  it("rejects invalid checksum", () => {
    expect(validateCnpj("03426484000124")).toBe(false);
  });
});
