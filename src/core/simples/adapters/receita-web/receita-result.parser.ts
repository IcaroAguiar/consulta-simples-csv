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

// Patterns para encontrar o status de optante
const SIMPLES_NACIONAL_ROW_PATTERN =
  /simples\s*nacional[\s\S]*?(optante|não\s*optante)/i;
const SIMEI_ROW_PATTERN = /simei[\s\S]*?(optante|não\s*optante)/i;

// Pattern para detectar que há dados na tabela (não é só mensagem vzia)
const TABLE_DATA_PATTERN = /<td[^>]*>.*?<\/td>/is;
const OPTION_ROW_PATTERN = /<tr[^>]*>[\s\S]*?(optante|não\s*optante)[\s\S]*?<\/tr>/i;

function hasTableData(html: string): boolean {
  // Verifica se há dados na tabela, não só mensagem de "não encontrado"
  return TABLE_DATA_PATTERN.test(html) || OPTION_ROW_PATTERN.test(html);
}

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

  // Verificar "não encontrado" ANTES de "inválido" para evitar falso positivo
  if (containsIndicators(html, RECEITA_TEXT_INDICATORS.notFound)) {
    return "NOT_FOUND";
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

  // 1. CAPTCHA detectado
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

  // 2. Container de resultado existe
  if (hasResult) {
    // 2a. Verificar se é mensagem de "não encontrado"
    if (containsIndicators(html, RECEITA_TEXT_INDICATORS.notFound)) {
      return {
        cnpj,
        simplesNacional: null,
        simei: null,
        source: "receita-web",
        status: "NOT_FOUND",
        message: "CNPJ não encontrado no portal da Receita",
        raw: { htmlLength: html.length },
      };
    }

    // 2b. Verificar se há dados na tabela
    if (hasTableData(html)) {
      const optantStatus = parseOptantStatus(html);

      // Se conseguiu extrair pelo menos um status
      if (
        optantStatus.simplesNacional !== null ||
        optantStatus.simei !== null
      ) {
        return {
          cnpj,
          simplesNacional: optantStatus.simplesNacional,
          simei: optantStatus.simei,
          source: "receita-web",
          status: "SUCCESS",
          raw: { htmlLength: html.length },
        };
      }
    }

    // 2c. Container existe mas não tem dados reconhecíveis
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

    // Container existe sem dados reconhecíveis
    return {
      cnpj,
      simplesNacional: null,
      simei: null,
      source: "receita-web",
      status: "UNPARSABLE_RESULT",
      message: "Container de resultado existe mas dados não reconhecidos",
      raw: { htmlLength: html.length },
    };
  }

  // 3. Sem container de resultado
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

  // 4. Nem resultado nem erro detectado
  return {
    cnpj,
    simplesNacional: null,
    simei: null,
    source: "receita-web",
    status: "UNPARSABLE_RESULT",
    message: "Nenhuma estrutura reconhecída na página",
    raw: { htmlLength: html.length },
  };
}
