import type { SimplesLookupResult } from "./simples-lookup.types";

export interface SimplesLookupPort {
  lookup(cnpj: string): Promise<SimplesLookupResult>;
}
