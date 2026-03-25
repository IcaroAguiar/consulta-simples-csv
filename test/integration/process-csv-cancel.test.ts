import { describe, expect, it } from "vitest";

import { processCsv } from "../../src/core/app/process-csv.use-case";
import type {
  SimplesLookupOptions,
  SimplesLookupPort,
} from "../../src/core/simples/simples-lookup.port";
import type { SimplesLookupResult } from "../../src/core/simples/simples-lookup.types";

class SlowFakeLookupAdapter implements SimplesLookupPort {
  calls: string[] = [];

  async lookup(
    cnpj: string,
    options: SimplesLookupOptions = {},
  ): Promise<SimplesLookupResult> {
    this.calls.push(cnpj);
    await new Promise((resolve) => setTimeout(resolve, 5));

    if (options.signal?.aborted) {
      throw new Error("lookup should not start after cancellation");
    }

    return {
      cnpj,
      simplesNacional: true,
      simei: false,
      source: "fake",
      status: "SUCCESS",
    };
  }
}

describe("processCsv cancellation", () => {
  it("stops scheduling new unique lookups and marks the remaining rows as cancelled", async () => {
    const csv = [
      "nome;cpf_cnpj",
      "Empresa A;11.222.333/0001-81",
      "Empresa B;03.426.484/0001-23",
      "Empresa C;61.741.631/0001-56",
    ].join("\n");
    const adapter = new SlowFakeLookupAdapter();
    const controller = new AbortController();

    const result = await processCsv(csv, adapter, {
      signal: controller.signal,
      onLookupProgress() {
        controller.abort();
      },
    });

    expect(result.runStatus).toBe("CANCELLED");
    expect(result.summary.totalCnpjsUnicosConsultados).toBe(1);
    expect(result.summary.totalErros).toBe(0);
    expect(adapter.calls).toHaveLength(1);
    expect(result.outputCsv).toContain("CANCELLED");
  });
});
