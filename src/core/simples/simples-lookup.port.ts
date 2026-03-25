import type { SimplesLookupResult } from "./simples-lookup.types";

export type SimplesLookupOptions = {
  signal?: AbortSignal;
};

export interface SimplesLookupPort {
  lookup(
    cnpj: string,
    options?: SimplesLookupOptions,
  ): Promise<SimplesLookupResult>;
}
