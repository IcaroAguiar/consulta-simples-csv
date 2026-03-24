import { describe, expect, it } from "vitest";

import type {
  HttpClient,
  HttpResponse,
} from "../../src/core/infra/http-client";
import { CnpjaOpenSimplesLookupAdapter } from "../../src/core/simples/adapters/cnpja-open-simples-lookup.adapter";

class FakeRateLimiter {
  async waitTurn(): Promise<void> {}
}

class SequentialHttpClient implements HttpClient {
  private index = 0;

  constructor(private readonly responses: Array<HttpResponse>) {}

  async get(): Promise<HttpResponse> {
    const response = this.responses[this.index];
    this.index += 1;

    if (!response) {
      throw new Error("No more responses configured");
    }

    return response;
  }
}

describe("CnpjaOpenSimplesLookupAdapter retry", () => {
  it("retries once after a temporary provider error", async () => {
    const adapter = new CnpjaOpenSimplesLookupAdapter(
      new SequentialHttpClient([
        {
          status: 429,
          json: async () => ({}),
        },
        {
          status: 200,
          json: async () => ({
            taxId: "03426484000123",
            company: {
              simples: { optant: false, since: null },
              simei: { optant: false, since: null },
            },
          }),
        },
      ]),
      new FakeRateLimiter(),
    );

    await expect(adapter.lookup("03426484000123")).resolves.toMatchObject({
      status: "SUCCESS",
      source: "cnpja-open",
    });
  });
});
