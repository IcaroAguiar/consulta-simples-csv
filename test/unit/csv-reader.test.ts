import { describe, expect, it } from "vitest";

import { readCsv } from "../../src/core/ingestion/csv-reader";

describe("readCsv", () => {
  it("keeps headers when the file contains only the header row", () => {
    const result = readCsv("cnpj;nome\n");

    expect(result.headers).toEqual(["cnpj", "nome"]);
    expect(result.rows).toEqual([]);
    expect(result.delimiter).toBe(";");
  });
});
