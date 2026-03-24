import type { SimplesLookupPort } from "../simples-lookup.port";
import type { SimplesLookupResult } from "../simples-lookup.types";

const FIXTURES: Record<string, Omit<SimplesLookupResult, "cnpj">> = {
  "11222333000181": {
    simplesNacional: true,
    simei: false,
    source: "mock",
    status: "SUCCESS",
  },
  "99888777000166": {
    simplesNacional: false,
    simei: false,
    source: "mock",
    status: "SUCCESS",
  },
};

export class MockSimplesLookupAdapter implements SimplesLookupPort {
  async lookup(cnpj: string): Promise<SimplesLookupResult> {
    const fixture = FIXTURES[cnpj];

    if (!fixture) {
      return {
        cnpj,
        simplesNacional: null,
        simei: null,
        source: "mock",
        status: "NOT_FOUND",
      };
    }

    return {
      cnpj,
      ...fixture,
    };
  }
}
