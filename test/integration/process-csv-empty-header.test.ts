import { describe, expect, it } from "vitest";

import { processCsv } from "../../src/core/app/process-csv.use-case";
import { MockSimplesLookupAdapter } from "../../src/core/simples/adapters/mock-simples-lookup.adapter";

describe("processCsv with empty files", () => {
  it("returns an output with headers even when there are no data rows", async () => {
    const result = await processCsv(
      "cnpj;nome\n",
      new MockSimplesLookupAdapter(),
    );

    expect(result.summary.totalLinhas).toBe(0);
    expect(result.outputCsv).toContain("cnpj_original");
  });
});
