import type {
  SimplesLookupResult,
  SimplesLookupStatus,
} from "../../simples-lookup.types";
import { RECEITA_TEXT_INDICATORS } from "./receita.selectors.js";

export type ParseReceitaResultInput = {
  html: string;
  cnpj: string;
  hasCaptcha: boolean;
  hasError: boolean;
  hasResult: boolean;
};

type ParsedOptantStatus = {
  simplesNacional: boolean | null;
  simei: boolean | null;
};

function containsIndicators(
  text: string,
  indicators: readonly string[],
): boolean {
  const lowerText = text.toLowerCase();
  return indicators.some((indicator) =>
    lowerText.includes(indicator.toLowerCase()),
  );
}

const SIMPLES_NACIONAL_ROW_PATTERN =
  /simples\s*nacional[\s\S]*?(optante|não\s*optante)/i;
const SIMEI_ROW_PATTERN = /simei[\s\S]*?(optante|não\s*optante)/i;

function parseOptantStatus(html: string): ParsedOptantStatus {
  const result: ParsedOptantStatus = {
    simplesNacional: null,
    simei: null,
  };

  const simplesMatch = html.match(SIMPLES_NACIONAL_ROW_PATTERN);
  if (simplesMatch?.[1]) {
    const value = simplesMatch[1].toLowerCase().trim();
    if (value.includes("não") || value.includes("nao")) {
      result.simplesNacional = false;
    } else {
      result.simplesNacional = true;
    }
  }

  const simeiMatch = html.match(SIMEI_ROW_PATTERN);
  if (simeiMatch?.[1]) {
    const value = simeiMatch[1].toLowerCase().trim();
    if (value.includes("não") || value.includes("nao")) {
      result.simei = false;
    } else {
      result.simei = true;
    }
  }

  return result;
}

function classifyError(
  html: string,
  hasCaptcha: boolean,
  hasError: boolean,
): SimplesLookupStatus {
  if (hasCaptcha) {
    return "CAPTCHA_REQUIRED";
  }

  if (containsIndicators(html, RECEITA_TEXT_INDICATORS.blocked)) {
    return "BLOCKED";
  }

  if (containsIndicators(html, RECEITA_TEXT_INDICATORS.invalidCnpj)) {
    return "INVALID_CNPJ";
  }

  if (hasError) {
    return "TEMPORARY_ERROR";
  }

  return "UNPARSABLE_RESULT";
}

export function parseReceitaResult(
  input: ParseReceitaResultInput,
): SimplesLookupResult {
  const { html, cnpj, hasCaptcha, hasError, hasResult } = input;

  if (hasCaptcha) {
    return {
      cnpj,
      simplesNacional: null,
      simei: null,
      source: "receita-web",
      status: "CAPTCHA_REQUIRED",
      message: "CAPTCHA detectado na página",
      raw: { htmlLength: html.length },
    };
  }

  if (!hasResult && !hasError) {
    return {
      cnpj,
      simplesNacional: null,
      simei: null,
      source: "receita-web",
      status: "UNPARSABLE_RESULT",
      message: "Nenhum resultado ou erro detectado na página",
      raw: { htmlLength: html.length },
    };
  }

  if (hasError) {
    const errorStatus = classifyError(html, hasCaptcha, hasError);
    return {
      cnpj,
      simplesNacional: null,
      simei: null,
      source: "receita-web",
      status: errorStatus,
      message: `Erro detectado: ${errorStatus}`,
      raw: { htmlLength: html.length },
    };
  }

  const optantStatus = parseOptantStatus(html);

  if (optantStatus.simplesNacional === null && optantStatus.simei === null) {
    return {
      cnpj,
      simplesNacional: null,
      simei: null,
      source: "receita-web",
      status: "UNPARSABLE_RESULT",
      message: "Não foi possível extrair status do Simples Nacional",
      raw: { htmlLength: html.length },
    };
  }

  return {
    cnpj,
    simplesNacional: optantStatus.simplesNacional,
    simei: optantStatus.simei,
    source: "receita-web",
    status: "SUCCESS",
    raw: { htmlLength: html.length },
  };
}
