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
  estimatedRemainingMs: number;
};
