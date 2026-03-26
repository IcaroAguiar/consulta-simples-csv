import { CnpjaOpenSimplesLookupAdapter } from "./adapters/cnpja-open-simples-lookup.adapter";
import { MockSimplesLookupAdapter } from "./adapters/mock-simples-lookup.adapter";
import { ReceitaConsultaOptantesAdapter } from "./adapters/receita-web/receita-consulta-optantes.adapter";
import type { SimplesLookupPort } from "./simples-lookup.port";

export type SimplesProviderName = "mock" | "cnpja-open" | "receita-web";

export function createSimplesLookupProvider(
  providerName: SimplesProviderName,
): SimplesLookupPort {
  if (providerName === "cnpja-open") {
    return new CnpjaOpenSimplesLookupAdapter();
  }

  if (providerName === "receita-web") {
    return new ReceitaConsultaOptantesAdapter();
  }

  return new MockSimplesLookupAdapter();
}
