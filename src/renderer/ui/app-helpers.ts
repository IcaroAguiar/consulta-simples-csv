import type { LookupProgress } from "../../main/types";
import type { ProcessCsvResult, UiState, UiStatus } from "./app.types";
import { countdownRemainingMs, formatProgressLine } from "./operational-copy";

const XLSX_GUIDANCE_MESSAGE =
  "O arquivo selecionado parece ser uma planilha do Excel (.xlsx), não um CSV. Exporte a planilha como CSV UTF-8 e tente novamente.";

const MALFORMED_CSV_GUIDANCE_MESSAGE =
  "O arquivo selecionado não parece ser um CSV válido ou está com linhas inconsistentes. Revise o delimitador, as aspas e a codificação do arquivo, e tente novamente.";

const AMBIGUOUS_CSV_GUIDANCE_MESSAGE =
  "O arquivo selecionado parece usar um delimitador diferente do esperado ou tem linhas quebradas. Revise se o arquivo está separado por ponto e vírgula, vírgula ou tabulação, e tente novamente.";

export function getStatusPillVariant(
  status: UiStatus,
): "default" | "muted" | "success" | "danger" {
  switch (status) {
    case "processing":
      return "default";
    case "success":
      return "success";
    case "cancelled":
    case "error":
      return "danger";
    default:
      return "muted";
  }
}

export function renderStatusLabel(status: UiStatus): string {
  if (status === "processing") return "Processando";
  if (status === "success") return "Concluído";
  if (status === "cancelled") return "Cancelado";
  if (status === "error") return "Erro";
  if (status === "loading") return "Carregando";
  return "Aguardando";
}

export function renderStatusText(state: UiState): string {
  if (state.status === "processing" && state.progress) {
    return formatProgressLine(getLiveProgress(state));
  }

  if (state.status === "success" && state.summary) {
    return `${state.summary.totalLinhas} linhas processadas • ${state.summary.totalCnpjsUnicosConsultados} consultas únicas`;
  }

  if (state.status === "cancelled" && state.summary) {
    return `${state.summary.totalCnpjsUnicosConsultados} consultas antes do cancelamento`;
  }

  return state.message;
}

export function renderSummary(summary: UiState["summary"]): string {
  if (!summary) {
    return `
      <div class="summary__empty">
        Execute o processamento para ver os resultados aqui
      </div>
    `;
  }

  return `
    <dl class="summary__grid">
      <div><dt>Total de linhas</dt><dd>${summary.totalLinhas}</dd></div>
      <div><dt>CNPJs únicos</dt><dd>${summary.totalCnpjsUnicosConsultados}</dd></div>
      <div><dt>Optantes Simples</dt><dd>${summary.totalOptantesSimples}</dd></div>
      <div><dt>Não optantes</dt><dd>${summary.totalNaoOptantesSimples}</dd></div>
      <div><dt>CNPJs inválidos</dt><dd>${summary.totalCnpjsValidos - summary.totalOptantesSimples - summary.totalNaoOptantesSimples}</dd></div>
      <div><dt>Erros</dt><dd>${summary.totalErros}</dd></div>
    </dl>
  `;
}

export function extractMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return normalizeUserFacingMessage(error.message, fallback);
  }

  return fallback;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getLiveProgress(state: UiState): LookupProgress | null {
  if (!state.progress || state.progressObservedAt === null) {
    return state.progress;
  }

  return {
    ...state.progress,
    elapsedMs:
      state.progress.elapsedMs +
      Math.max(0, state.now - state.progressObservedAt),
    estimatedRemainingMs: getLiveRemainingMs(state),
  };
}

export function buildCompletionMessage(result: ProcessCsvResult): string {
  if (result.runStatus === "CANCELLED") {
    return (
      result.warningMessage ??
      (result.savedPath
        ? "Processamento cancelado. CSV parcial salvo automaticamente."
        : "Processamento cancelado.")
    );
  }

  return (
    result.warningMessage ??
    (result.savedPath
      ? "Concluído! Arquivo salvo automaticamente."
      : "Processamento concluído.")
  );
}

function getLiveRemainingMs(state: UiState): number {
  if (!state.progress || state.progressObservedAt === null) {
    return 0;
  }

  return countdownRemainingMs(
    state.progress.estimatedRemainingMs,
    state.now - state.progressObservedAt,
  );
}

function normalizeUserFacingMessage(
  rawMessage: string,
  fallback: string,
): string {
  const message = unwrapRemoteMethodMessage(rawMessage);

  if (isFriendlyPortugueseMessage(message)) {
    return message;
  }

  if (looksLikeExcelContent(message)) {
    return XLSX_GUIDANCE_MESSAGE;
  }

  if (looksLikeAmbiguousCsv(message)) {
    return AMBIGUOUS_CSV_GUIDANCE_MESSAGE;
  }

  if (looksLikeMalformedCsv(message)) {
    return MALFORMED_CSV_GUIDANCE_MESSAGE;
  }

  if (message.includes("Ja existe um processamento em andamento.")) {
    return "Já existe um processamento em andamento. Aguarde a conclusão atual ou cancele antes de iniciar outro lote.";
  }

  if (message.includes("Nenhuma coluna de CNPJ suportada foi encontrada")) {
    return "Não foi encontrada uma coluna de CNPJ compatível. Use uma coluna como cnpj, CNPJ, documento, cpf_cnpj ou cnpj_empresa.";
  }

  return fallback;
}

function unwrapRemoteMethodMessage(message: string): string {
  const remoteMethodPrefix = /Error invoking remote method '[^']+': Error:\s*/;

  return message.replace(remoteMethodPrefix, "").trim();
}

function isFriendlyPortugueseMessage(message: string): boolean {
  return (
    message.startsWith("Não ") ||
    message.startsWith("Nao ") ||
    message.startsWith("O arquivo ") ||
    message.startsWith("Já ") ||
    message.startsWith("Ja ") ||
    message.startsWith("Selecione ") ||
    message.startsWith("Processamento ")
  );
}

function looksLikeExcelContent(message: string): boolean {
  return (
    message.includes("PK\\u0003\\u0004") ||
    message.includes("PK\u0003\u0004") ||
    message.includes("[Content_Types].xml")
  );
}

function looksLikeMalformedCsv(message: string): boolean {
  return (
    message.includes("Invalid Opening Quote") ||
    message.includes("Invalid Closing Quote") ||
    message.includes("Quote Not Closed") ||
    message.includes("CSV_RECORD_INCONSISTENT")
  );
}

function looksLikeAmbiguousCsv(message: string): boolean {
  return (
    message.includes("Invalid Record Length") ||
    message.includes("CSV_RECORD_INCONSISTENT")
  );
}
