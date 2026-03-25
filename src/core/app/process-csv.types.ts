export type ProcessCsvSummary = {
  totalLinhas: number;
  totalCnpjsEncontrados: number;
  totalCnpjsValidos: number;
  totalCnpjsUnicosConsultados: number;
  totalOptantesSimples: number;
  totalNaoOptantesSimples: number;
  totalErros: number;
};

export type LookupProgress = {
  completedUniqueLookups: number;
  totalUniqueLookups: number;
  currentCnpj: string;
  elapsedMs: number;
  estimatedRemainingMs: number;
};

export type ProcessCsvRunStatus = "SUCCESS" | "CANCELLED";
