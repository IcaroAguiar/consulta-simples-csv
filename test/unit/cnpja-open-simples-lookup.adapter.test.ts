import { describe, expect, it } from "vitest";

import {
  mapCnpjaOfficeResponse,
  mapCnpjaResponseError,
} from "../../src/core/simples/adapters/cnpja-open-simples-lookup.adapter";

describe("mapCnpjaOfficeResponse", () => {
  it("maps simples and simei from the provider payload", () => {
    const result = mapCnpjaOfficeResponse({
      taxId: "03426484000123",
      company: {
        simples: { optant: false, since: null },
        simei: { optant: false, since: null },
      },
    });

    expect(result).toMatchObject({
      cnpj: "03426484000123",
      simplesNacional: false,
      simei: false,
      source: "cnpja-open",
      status: "SUCCESS",
    });
  });

  it("treats missing simples data as permanent error", () => {
    const result = mapCnpjaOfficeResponse({
      taxId: "03426484000123",
      company: {},
    });

    expect(result).toMatchObject({
      cnpj: "03426484000123",
      status: "PERMANENT_ERROR",
      source: "cnpja-open",
    });
  });
});

describe("mapCnpjaResponseError", () => {
  it("maps 404 to not found", () => {
    expect(mapCnpjaResponseError("03426484000123", 404)).toMatchObject({
      status: "NOT_FOUND",
      source: "cnpja-open",
    });
  });

  it("maps 429 to temporary error", () => {
    expect(mapCnpjaResponseError("03426484000123", 429)).toMatchObject({
      status: "TEMPORARY_ERROR",
      source: "cnpja-open",
    });
  });

  it("maps 400 to permanent error", () => {
    expect(mapCnpjaResponseError("03426484000123", 400)).toMatchObject({
      status: "PERMANENT_ERROR",
      source: "cnpja-open",
    });
  });
});
