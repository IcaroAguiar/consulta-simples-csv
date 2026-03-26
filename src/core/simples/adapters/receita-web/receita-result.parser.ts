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

function containsText(text: string, indicators: readonly string[]): boolean {
  const lowerText = text.toLowerCase();
  return indicators.some((indicator) =>
    lowerText.includes(indicator.toLowerCase()),
  );
}

function parseOptantStatus(html: string): ParsedOptantStatus {
  const result: ParsedOptantStatus = {
    simplesNacional: null,
    simei: null,
  };

  const lowerHtml = html.toLowerCase();

  // Simples Nacional
  if (lowerHtml.includes("não optante pelo simples nacional")) {
    result.simplesNacional = false;
  } else if (
    lowerHtml.includes("optante pelo simples nacional") &&
    !lowerHtml.includes("não optante")
  ) {
    result.simplesNacional = true;
  }

  // SIMEI
  if (
    lowerHtml.includes("não enquadrado no simei") ||
    lowerHtml.includes("não optante pelo simei")
  ) {
    result.simei = false;
  } else if (
    lowerHtml.includes("enquadrado no simei") ||
    lowerHtml.includes("optante pelo simei")
  ) {
    result.simei = true;
  }

  return result;
}

function classifyError(
  html: string,
  hasCaptcha: boolean,
  hasError: boolean,
): SimplesLookupStatus {
  // Check for CAPTCHA first - either image elements or text indicators
  if (hasCaptcha || containsText(html, RECEITA_TEXT_INDICATORS.captcha)) {
    return "CAPTCHA_REQUIRED";
  }

  if (containsText(html, RECEITA_TEXT_INDICATORS.blocked)) {
    return "BLOCKED";
  }

  if (containsText(html, RECEITA_TEXT_INDICATORS.notFound)) {
    return "NOT_FOUND";
  }

  if (containsText(html, RECEITA_TEXT_INDICATORS.invalidCnpj)) {
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

  // 1. CAPTCHA detectado (imagem ou texto)
  if (hasCaptcha || containsText(html, RECEITA_TEXT_INDICATORS.captcha)) {
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

  // 2. Verificar se há resultado de optante
  const optantStatus = parseOptantStatus(html);

  // Se conseguiu extrair status de optante, retornar SUCCESS
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

  // 3. Verificar "não encontrado"
  if (containsText(html, RECEITA_TEXT_INDICATORS.notFound)) {
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

  // 4. Verificar erro
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

  // 5. Sem estrutura reconhecida
  return {
    cnpj,
    simplesNacional: null,
    simei: null,
    source: "receita-web",
    status: "UNPARSABLE_RESULT",
    message: "Nenhuma estrutura reconhecida na página",
    raw: { htmlLength: html.length },
  };
}
