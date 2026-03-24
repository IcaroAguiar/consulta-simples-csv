import { normalizeCnpj } from "../cnpj/normalize-cnpj";
import { validateCnpj } from "../cnpj/validate-cnpj";
import { writeCsv } from "../export/csv-writer";
import { readCsv } from "../ingestion/csv-reader";
import { detectCnpjColumn } from "../ingestion/detect-cnpj-column";
import type { SimplesLookupPort } from "../simples/simples-lookup.port";
import type { SimplesLookupResult } from "../simples/simples-lookup.types";
import type { LookupProgress, ProcessCsvSummary } from "./process-csv.types";

type ProcessCsvOptions = {
  cnpjColumn?: string;
  onLookupProgress?: (progress: LookupProgress) => void;
};

type ProcessCsvResult = {
  outputCsv: string;
  summary: ProcessCsvSummary;
};

export async function processCsv(
  inputCsv: string,
  provider: SimplesLookupPort,
  options: ProcessCsvOptions = {},
): Promise<ProcessCsvResult> {
  const { delimiter, headers, rows } = readCsv(inputCsv);
  const cnpjColumn = detectCnpjColumn(
    headers,
    options.cnpjColumn ? { override: options.cnpjColumn } : {},
  );

  if (!cnpjColumn) {
    throw new Error("Nenhuma coluna de CNPJ suportada foi encontrada");
  }

  const lookupCache = new Map<string, SimplesLookupResult>();
  const uniqueValidCnpjs = collectUniqueValidCnpjs(rows, cnpjColumn);
  let completedUniqueLookups = 0;
  let totalCnpjsEncontrados = 0;
  let totalCnpjsValidos = 0;
  const outputColumns = [
    ...headers,
    "cnpj_original",
    "cnpj_normalizado",
    "cnpj_valido",
    "simples_nacional",
    "simei",
    "status",
    "fonte",
    "mensagem",
    "linha",
  ];

  const outputRows: Array<Record<string, string>> = [];

  for (const [index, row] of rows.entries()) {
    const cnpjOriginal = row[cnpjColumn] ?? "";
    const cnpjNormalizado = normalizeCnpj(cnpjOriginal);
    const cnpjValido = validateCnpj(cnpjNormalizado);

    if (cnpjOriginal) {
      totalCnpjsEncontrados += 1;
    }

    let lookupResult: SimplesLookupResult;

    if (!cnpjValido) {
      lookupResult = {
        cnpj: cnpjNormalizado,
        simplesNacional: null,
        simei: null,
        source: "system",
        status: "INVALID_CNPJ",
        message: "CNPJ invalido",
      };
    } else {
      totalCnpjsValidos += 1;

      const cachedResult = lookupCache.get(cnpjNormalizado);
      if (cachedResult) {
        lookupResult = cachedResult;
      } else {
        lookupResult = await provider.lookup(cnpjNormalizado);
        lookupCache.set(cnpjNormalizado, lookupResult);
        completedUniqueLookups += 1;
        options.onLookupProgress?.({
          completedUniqueLookups,
          totalUniqueLookups: uniqueValidCnpjs.length,
          currentCnpj: cnpjNormalizado,
          estimatedRemainingMs: estimateRemainingMs(
            completedUniqueLookups,
            uniqueValidCnpjs.length,
          ),
        });
      }
    }

    outputRows.push({
      ...row,
      cnpj_original: cnpjOriginal,
      cnpj_normalizado: cnpjNormalizado,
      cnpj_valido: String(cnpjValido),
      simples_nacional: toCsvValue(lookupResult.simplesNacional),
      simei: toCsvValue(lookupResult.simei),
      status: lookupResult.status,
      fonte: lookupResult.source,
      mensagem: lookupResult.message ?? "",
      linha: String(index + 1),
    });
  }

  const totalOptantesSimples = outputRows.filter(
    (row) => row.simples_nacional === "true",
  ).length;
  const totalNaoOptantesSimples = outputRows.filter(
    (row) => row.simples_nacional === "false",
  ).length;
  const totalErros = outputRows.filter(
    (row) => row.status !== "SUCCESS",
  ).length;

  return {
    outputCsv: writeCsv(outputRows, delimiter, outputColumns),
    summary: {
      totalLinhas: rows.length,
      totalCnpjsEncontrados,
      totalCnpjsValidos,
      totalCnpjsUnicosConsultados: lookupCache.size,
      totalOptantesSimples,
      totalNaoOptantesSimples,
      totalErros,
    },
  };
}

function toCsvValue(value: boolean | null): string {
  if (value === null) {
    return "";
  }

  return String(value);
}

function collectUniqueValidCnpjs(
  rows: Array<Record<string, string>>,
  cnpjColumn: string,
): string[] {
  const uniqueValid = new Set<string>();

  for (const row of rows) {
    const cnpjOriginal = row[cnpjColumn] ?? "";
    const cnpjNormalizado = normalizeCnpj(cnpjOriginal);

    if (validateCnpj(cnpjNormalizado)) {
      uniqueValid.add(cnpjNormalizado);
    }
  }

  return Array.from(uniqueValid);
}

function estimateRemainingMs(
  completedUniqueLookups: number,
  totalUniqueLookups: number,
): number {
  const remainingLookups = Math.max(
    0,
    totalUniqueLookups - completedUniqueLookups,
  );

  return remainingLookups * 12_000;
}
