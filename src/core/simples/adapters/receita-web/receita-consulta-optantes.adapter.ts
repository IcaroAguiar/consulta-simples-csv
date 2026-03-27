import type {
  SimplesLookupOptions,
  SimplesLookupPort,
} from "../../simples-lookup.port";
import type { SimplesLookupResult } from "../../simples-lookup.types";
import { ReceitaBrowserClient } from "./receita-browser.client";
import { parseReceitaResult } from "./receita-result.parser";

export class ReceitaConsultaOptantesAdapter implements SimplesLookupPort {
  async lookup(
    cnpj: string,
    options?: SimplesLookupOptions,
  ): Promise<SimplesLookupResult> {
    const client = new ReceitaBrowserClient({ headless: false });

    try {
      await client.connect(options?.signal);

      const navigateResult = await client.navigate(options?.signal);
      if (!navigateResult.success) {
        return {
          cnpj,
          simplesNacional: null,
          simei: null,
          source: "receita-web",
          status: "TEMPORARY_ERROR",
          message: navigateResult.error ?? "Falha ao navegar para página",
        };
      }

      const fillResult = await client.fillCnpj(cnpj, options?.signal);
      if (!fillResult.success) {
        return {
          cnpj,
          simplesNacional: null,
          simei: null,
          source: "receita-web",
          status: "TEMPORARY_ERROR",
          message: fillResult.error ?? "Falha ao preencher CNPJ",
        };
      }

      const submitResult = await client.submit(options?.signal);
      if (!submitResult.success) {
        return {
          cnpj,
          simplesNacional: null,
          simei: null,
          source: "receita-web",
          status: "TEMPORARY_ERROR",
          message: submitResult.error ?? "Falha ao submeter formulário",
        };
      }

      const waitResult = await client.waitResult(options?.signal);
      if (!waitResult.success) {
        return {
          cnpj,
          simplesNacional: null,
          simei: null,
          source: "receita-web",
          status: "TEMPORARY_ERROR",
          message: waitResult.error ?? "Falha ao aguardar resultado",
        };
      }

      const hasCaptcha = await client.hasCaptcha(options?.signal);
      const hasError = await client.hasError(options?.signal);
      const hasResult = await client.hasResult(options?.signal);

      return parseReceitaResult({
        html: waitResult.html,
        cnpj,
        hasCaptcha,
        hasError,
        hasResult,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return {
          cnpj,
          simplesNacional: null,
          simei: null,
          source: "system",
          status: "CANCELLED",
          message: "Processamento cancelado antes desta consulta",
        };
      }

      throw error;
    } finally {
      await client.disconnect();
    }
  }
}
