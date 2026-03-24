import type { HttpClient } from "../../infra/http-client";
import { FetchHttpClient } from "../../infra/http-client";
import { RateLimiter } from "../../infra/rate-limiter";
import type { SimplesLookupPort } from "../simples-lookup.port";
import type { SimplesLookupResult } from "../simples-lookup.types";

type CnpjaOfficePayload = {
  taxId?: unknown;
  company?: {
    simples?: {
      optant?: unknown;
      since?: unknown;
    };
    simei?: {
      optant?: unknown;
      since?: unknown;
    };
  };
};

type WaitTurnPort = {
  waitTurn(): Promise<void>;
};

export class CnpjaOpenSimplesLookupAdapter implements SimplesLookupPort {
  constructor(
    private readonly httpClient: HttpClient = new FetchHttpClient(),
    private readonly rateLimiter: WaitTurnPort = new RateLimiter(12_000),
  ) {}

  async lookup(cnpj: string): Promise<SimplesLookupResult> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await this.rateLimiter.waitTurn();

      try {
        const response = await this.httpClient.get(
          `https://open.cnpja.com/office/${cnpj}`,
        );

        if (response.status >= 400) {
          const errorResult = mapCnpjaResponseError(cnpj, response.status);

          if (errorResult.status === "TEMPORARY_ERROR" && attempt < 1) {
            continue;
          }

          return errorResult;
        }

        const payload = (await response.json()) as CnpjaOfficePayload;
        return mapCnpjaOfficeResponse(payload);
      } catch (error) {
        if (attempt < 1) {
          continue;
        }

        return {
          cnpj,
          simplesNacional: null,
          simei: null,
          source: "cnpja-open",
          status: "TEMPORARY_ERROR",
          message: error instanceof Error ? error.message : "Falha na consulta",
        };
      }
    }

    return {
      cnpj,
      simplesNacional: null,
      simei: null,
      source: "cnpja-open",
      status: "TEMPORARY_ERROR",
      message: "Falha temporaria apos retry",
    };
  }
}

export function mapCnpjaOfficeResponse(
  payload: CnpjaOfficePayload,
): SimplesLookupResult {
  const cnpj = typeof payload.taxId === "string" ? payload.taxId : "";
  const simplesOptant = payload.company?.simples?.optant;
  const simeiOptant = payload.company?.simei?.optant;

  if (typeof simplesOptant !== "boolean" || typeof simeiOptant !== "boolean") {
    return {
      cnpj,
      simplesNacional: null,
      simei: null,
      source: "cnpja-open",
      status: "PERMANENT_ERROR",
      message: "Payload inesperado do provider",
      raw: payload,
    };
  }

  return {
    cnpj,
    simplesNacional: simplesOptant,
    simei: simeiOptant,
    source: "cnpja-open",
    status: "SUCCESS",
    raw: payload,
  };
}

export function mapCnpjaResponseError(
  cnpj: string,
  statusCode: number,
): SimplesLookupResult {
  if (statusCode === 404) {
    return {
      cnpj,
      simplesNacional: null,
      simei: null,
      source: "cnpja-open",
      status: "NOT_FOUND",
      message: "CNPJ nao encontrado",
    };
  }

  if (statusCode === 429 || statusCode >= 500) {
    return {
      cnpj,
      simplesNacional: null,
      simei: null,
      source: "cnpja-open",
      status: "TEMPORARY_ERROR",
      message: `Erro temporario do provider (${statusCode})`,
    };
  }

  return {
    cnpj,
    simplesNacional: null,
    simei: null,
    source: "cnpja-open",
    status: "PERMANENT_ERROR",
    message: `Erro permanente do provider (${statusCode})`,
  };
}
