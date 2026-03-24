import { CnpjaOpenSimplesLookupAdapter } from "./adapters/cnpja-open-simples-lookup.adapter";
import { MockSimplesLookupAdapter } from "./adapters/mock-simples-lookup.adapter";
import type { SimplesLookupPort } from "./simples-lookup.port";

export type SimplesProviderName = "mock" | "cnpja-open";

export function createSimplesLookupProvider(
  providerName: SimplesProviderName,
): SimplesLookupPort {
  if (providerName === "cnpja-open") {
    return new CnpjaOpenSimplesLookupAdapter();
  }

  return new MockSimplesLookupAdapter();
}
