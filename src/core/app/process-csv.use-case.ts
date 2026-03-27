import { normalizeCnpj } from "../cnpj/normalize-cnpj";
import { validateCnpj } from "../cnpj/validate-cnpj";
import { writeCsv } from "../export/csv-writer";
import { AbortError } from "../infra/rate-limiter";
import { readCsv } from "../ingestion/csv-reader";
import { detectCnpjColumn } from "../ingestion/detect-cnpj-column";
import type { SimplesLookupPort } from "../simples/simples-lookup.port";
import type { SimplesLookupResult } from "../simples/simples-lookup.types";
import { estimateObservedRemainingMs } from "./eta";
import type {
  LookupProgress,
  ProcessCsvRunStatus,
  ProcessCsvSummary,
} from "./process-csv.types";

type ProcessCsvOptions = {
  cnpjColumn?: string;
  onLookupProgress?: (progress: LookupProgress) => void;
  signal?: AbortSignal;
};

type ProcessCsvResult = {
  outputCsv: string;
  summary: ProcessCsvSummary;
  runStatus: ProcessCsvRunStatus;
};

const ERROR_STATUSES = new Set<SimplesLookupResult["status"]>([
  "INVALID_CNPJ",
  "NOT_FOUND",
  "TEMPORARY_ERROR",
  "PERMANENT_ERROR",
  "BLOCKED",
  "CAPTCHA_REQUIRED",
  "UNPARSABLE_RESULT",
]);

export async function processCsv(
  inputCsv: string,
  provider: SimplesLookupPort,
  options: ProcessCsvOptions = {},
): Promise<ProcessCsvResult> {
  const { delimiter, headers, rowLineNumbers, rows } = readCsv(inputCsv);
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
  let runStatus: ProcessCsvRunStatus = "SUCCESS";
  const startedAt = Date.now();
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
    if (isCancellationBoundary(options.signal)) {
      runStatus = "CANCELLED";
    }

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
    } else if (runStatus === "CANCELLED") {
      const cachedResult = lookupCache.get(cnpjNormalizado);
      lookupResult = cachedResult ?? {
        cnpj: cnpjNormalizado,
        simplesNacional: null,
        simei: null,
        source: "system",
        status: "CANCELLED",
        message: "Processamento cancelado antes desta consulta",
      };
    } else {
      totalCnpjsValidos += 1;

      const cachedResult = lookupCache.get(cnpjNormalizado);
      if (cachedResult) {
        lookupResult = cachedResult;
      } else {
        try {
          lookupResult = await provider.lookup(
            cnpjNormalizado,
            options.signal ? { signal: options.signal } : undefined,
          );
        } catch (error) {
          if (error instanceof AbortError) {
            runStatus = "CANCELLED";
            lookupResult = {
              cnpj: cnpjNormalizado,
              simplesNacional: null,
              simei: null,
              source: "system",
              status: "CANCELLED",
              message: "Processamento cancelado antes desta consulta",
            };
          } else {
            throw error;
          }
        }

        if (lookupResult.status === "CANCELLED") {
          runStatus = "CANCELLED";
        }

        if (runStatus === "SUCCESS") {
          lookupCache.set(cnpjNormalizado, lookupResult);
          completedUniqueLookups += 1;
          options.onLookupProgress?.({
            completedUniqueLookups,
            totalUniqueLookups: uniqueValidCnpjs.length,
            currentCnpj: cnpjNormalizado,
            elapsedMs: Date.now() - startedAt,
            estimatedRemainingMs: estimateObservedRemainingMs(
              Date.now() - startedAt,
              completedUniqueLookups,
              uniqueValidCnpjs.length,
            ),
          });
        }
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
      linha: String(rowLineNumbers[index] ?? index + 1),
    });
  }

  const totalOptantesSimples = outputRows.filter(
    (row) => row.simples_nacional === "true",
  ).length;
  const totalNaoOptantesSimples = outputRows.filter(
    (row) => row.simples_nacional === "false",
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
      totalErros: outputRows.filter((row) =>
        ERROR_STATUSES.has(row.status as SimplesLookupResult["status"]),
      ).length,
    },
    runStatus,
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

function isCancellationBoundary(signal?: AbortSignal): boolean {
  return signal?.aborted === true;
}
