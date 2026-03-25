import type { SimplesProviderName } from "../../core/simples/simples-provider.factory";
import type {
  LookupProgress,
  ProcessCsvRunStatus,
  ProcessCsvSummary,
} from "../../main/types";
import { button, statusPill } from "./components";
import {
  buildDedupeLabel,
  countdownRemainingMs,
  formatCommandBarSummary,
  formatProgressLine,
  previewAutoSavePath,
} from "./operational-copy";

type PickCsvResult = {
  filePath: string;
  fileName: string;
  content: string;
};

type ProcessCsvResult = {
  outputCsv: string;
  summary: ProcessCsvSummary;
  runStatus: ProcessCsvRunStatus;
  savedPath: string | null;
  warningMessage: string | null;
};

type AppBridge = {
  pickCsvFile(): Promise<PickCsvResult | null>;
  processCsv(input: {
    content: string;
    provider: SimplesProviderName;
    cnpjColumn?: string;
    sourceFilePath?: string;
  }): Promise<ProcessCsvResult>;
  cancelProcessing(): Promise<boolean>;
  saveCsvFile(defaultName: string, content: string): Promise<string | null>;
  autoSaveCsvFile(sourceFilePath: string, content: string): Promise<string>;
  onLookupProgress(callback: (progress: LookupProgress) => void): () => void;
  getDefaults(): Promise<{ provider: SimplesProviderName }>;
};

declare global {
  interface Window {
    appBridge: AppBridge;
  }
}

type UiState = {
  fileName: string | null;
  filePath: string | null;
  content: string | null;
  provider: SimplesProviderName;
  cnpjColumn: string;
  status: "idle" | "loading" | "processing" | "success" | "cancelled" | "error";
  message: string;
  outputCsv: string | null;
  summary: ProcessCsvSummary | null;
  savedPath: string | null;
  progress: LookupProgress | null;
  progressObservedAt: number | null;
  now: number;
};

const initialState: UiState = {
  fileName: null,
  filePath: null,
  content: null,
  provider: "mock",
  cnpjColumn: "",
  status: "idle",
  message: "Selecione um arquivo CSV para começar o processamento.",
  outputCsv: null,
  summary: null,
  savedPath: null,
  progress: null,
  progressObservedAt: null,
  now: Date.now(),
};

export function mountApp(root: HTMLDivElement | null): void {
  if (!root) {
    return;
  }

  const state: UiState = { ...initialState };
  root.innerHTML = renderShell(state);

  const refs = {
    pickButton: root.querySelector<HTMLButtonElement>(
      '[data-action="pick-file"]',
    ),
    processButton: root.querySelector<HTMLButtonElement>(
      '[data-action="process-file"]',
    ),
    saveButton: root.querySelector<HTMLButtonElement>(
      '[data-action="save-file"]',
    ),
    cancelButton: root.querySelector<HTMLButtonElement>(
      '[data-action="cancel-processing"]',
    ),
    providerSelect: root.querySelector<HTMLSelectElement>(
      '[data-field="provider"]',
    ),
    columnInput: root.querySelector<HTMLInputElement>(
      '[data-field="cnpj-column"]',
    ),
    message: root.querySelector<HTMLElement>('[data-slot="message"]'),
    summary: root.querySelector<HTMLElement>('[data-slot="summary"]'),
    outputStatus: root.querySelector<HTMLElement>(
      '[data-slot="output-status"]',
    ),
    dedupeLabel: root.querySelector<HTMLElement>('[data-slot="dedupe-label"]'),
    progressLine: root.querySelector<HTMLElement>(
      '[data-slot="progress-line"]',
    ),
    progressBar: root.querySelector<HTMLElement>('[data-slot="progress-bar"]'),
    currentCnpj: root.querySelector<HTMLElement>('[data-slot="current-cnpj"]'),
  };

  void initializeDefaults();
  const unsubscribeProgress = window.appBridge.onLookupProgress((progress) => {
    state.progress = progress;
    state.progressObservedAt = Date.now();
    state.now = Date.now();
    if (state.status === "processing") {
      state.message = `Processando ${progress.completedUniqueLookups} de ${progress.totalUniqueLookups} CNPJs únicos...`;
      syncUi();
    }
  });
  const progressTicker = window.setInterval(() => {
    if (state.status === "processing" && state.progress) {
      state.now = Date.now();
      syncUi();
    }
  }, 1000);
  wireEvents();
  syncUi();
  window.addEventListener("beforeunload", () => {
    unsubscribeProgress();
    window.clearInterval(progressTicker);
  });

  async function initializeDefaults(): Promise<void> {
    try {
      const defaults = await window.appBridge.getDefaults();
      state.provider = defaults.provider;
      syncUi();
    } catch {
      state.provider = "mock";
      syncUi();
    }
  }

  function wireEvents(): void {
    refs.pickButton?.addEventListener("click", () => {
      void handlePickFile();
    });

    refs.processButton?.addEventListener("click", () => {
      void handleProcessFile();
    });

    refs.cancelButton?.addEventListener("click", () => {
      void handleCancelProcessing();
    });

    refs.saveButton?.addEventListener("click", () => {
      void handleSaveFile();
    });

    refs.providerSelect?.addEventListener("change", (event) => {
      state.provider = (event.currentTarget as HTMLSelectElement)
        .value as SimplesProviderName;
    });

    refs.columnInput?.addEventListener("input", (event) => {
      state.cnpjColumn = (event.currentTarget as HTMLInputElement).value;
    });
  }

  async function handlePickFile(): Promise<void> {
    state.status = "loading";
    state.message = "Abrindo seletor de arquivo...";
    syncUi();

    try {
      const result = await window.appBridge.pickCsvFile();
      if (!result) {
        state.status = "idle";
        state.message = "Seleção cancelada.";
        syncUi();
        return;
      }

      applyFile(result);
    } catch (error) {
      state.status = "error";
      state.message = extractMessage(
        error,
        "Não foi possível abrir o arquivo.",
      );
      syncUi();
    }
  }

  function applyFile(result: PickCsvResult): void {
    state.fileName = result.fileName;
    state.filePath = result.filePath;
    state.content = result.content;
    state.outputCsv = null;
    state.summary = null;
    state.savedPath = null;
    state.progress = null;
    state.progressObservedAt = null;
    state.now = Date.now();
    state.status = "idle";
    state.message = `Arquivo "${result.fileName}" carregado com sucesso. Clique em Processar para iniciar.`;
    syncUi();
  }

  async function handleProcessFile(): Promise<void> {
    if (!state.content) {
      state.status = "error";
      state.message = "Selecione um CSV antes de processar.";
      syncUi();
      return;
    }

    state.status = "processing";
    state.message = "Iniciando processamento...";
    state.progress = null;
    state.progressObservedAt = null;
    state.now = Date.now();
    syncUi();

    try {
      const result = await window.appBridge.processCsv({
        content: state.content,
        provider: state.provider,
        ...(state.filePath ? { sourceFilePath: state.filePath } : {}),
        ...(state.cnpjColumn.trim()
          ? { cnpjColumn: state.cnpjColumn.trim() }
          : {}),
      });

      state.outputCsv = result.outputCsv;
      state.summary = result.summary;
      state.savedPath = result.savedPath;
      state.status = result.runStatus === "CANCELLED" ? "cancelled" : "success";
      state.message = buildCompletionMessage(result);
      syncUi();
    } catch (error) {
      state.status = "error";
      state.message = extractMessage(error, "Falha ao processar o CSV.");
      syncUi();
    }
  }

  async function handleCancelProcessing(): Promise<void> {
    if (state.status !== "processing") {
      return;
    }

    try {
      const requested = await window.appBridge.cancelProcessing();
      state.message = requested
        ? "Cancelamento solicitado. O processamento será interrompido."
        : "Não havia processamento ativo.";
      syncUi();
    } catch (error) {
      state.message = extractMessage(error, "Não foi possível cancelar.");
      syncUi();
    }
  }

  async function handleSaveFile(): Promise<void> {
    if (!state.outputCsv || !state.fileName) {
      return;
    }

    state.status = "loading";
    state.message = "Abrindo diálogo de salvamento...";
    syncUi();

    try {
      const defaultName = state.fileName.replace(/\.csv$/i, "-processado.csv");
      const savedPath = await window.appBridge.saveCsvFile(
        defaultName,
        state.outputCsv,
      );

      if (!savedPath) {
        state.status = "success";
        state.message = "Salvamento cancelado pelo usuário.";
        syncUi();
        return;
      }

      state.savedPath = savedPath;
      state.status = "success";
      state.message = "Arquivo salvo com sucesso.";
      syncUi();
    } catch (error) {
      state.status = "error";
      state.message = extractMessage(error, "Falha ao salvar o CSV.");
      syncUi();
    }
  }

  function syncUi(): void {
    if (refs.message) {
      refs.message.textContent = state.message;
    }

    if (refs.providerSelect) {
      refs.providerSelect.value = state.provider;
    }

    if (refs.columnInput) {
      refs.columnInput.value = state.cnpjColumn;
    }

    if (refs.outputStatus) {
      refs.outputStatus.textContent = renderStatusText(state);
    }

    if (refs.dedupeLabel) {
      refs.dedupeLabel.textContent = state.summary
        ? buildDedupeLabel(state.summary)
        : "—";
    }

    if (refs.progressLine) {
      refs.progressLine.textContent = formatProgressLine(
        getLiveProgress(state),
      );
    }

    if (refs.progressBar) {
      const progressPercent = state.progress
        ? Math.min(
            100,
            Math.max(
              0,
              (state.progress.completedUniqueLookups /
                Math.max(1, state.progress.totalUniqueLookups)) *
                100,
            ),
          )
        : state.status === "success"
          ? 100
          : 0;

      refs.progressBar.style.width = `${progressPercent}%`;
    }

    if (refs.currentCnpj) {
      refs.currentCnpj.textContent = state.progress?.currentCnpj ?? "—";
    }

    if (refs.summary) {
      refs.summary.innerHTML = renderSummary(state.summary);
    }

    if (refs.processButton) {
      refs.processButton.disabled =
        state.status === "processing" || !state.content;
      refs.processButton.textContent =
        state.status === "processing" ? "Processando..." : "Processar";
    }

    if (refs.cancelButton) {
      refs.cancelButton.disabled = state.status !== "processing";
    }

    if (refs.saveButton) {
      refs.saveButton.disabled = !state.outputCsv;
    }
  }
}

function renderShell(state: UiState): string {
  const autoSavePreview = state.savedPath
    ? state.savedPath.split(/[/\\]/).pop()
    : state.filePath
      ? previewAutoSavePath(state.filePath).split(/[/\\]/).pop()
      : null;

  return `
    <main class="app-shell">
      <header class="topbar">
        <div class="brand-lockup">
          <span class="brand-mark" aria-hidden="true">CS</span>
          <div class="brand-lockup__copy">
            <strong>Consulta Simples CSV</strong>
            <span class="brand-subtitle">Validação de enquadramento no Simples Nacional</span>
          </div>
        </div>
        ${statusPill({ variant: getStatusPillVariant(state.status), children: renderStatusLabel(state.status) })}
      </header>

      <section class="intro">
        <div class="intro__card">
          <div class="intro__header">
            <h1 class="intro__title">Mesa de operação para lotes de CNPJs</h1>
            <div class="intro__badges">
              <span class="intro__badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                CSV local
              </span>
              <span class="intro__badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                ETA em tempo real
              </span>
              <span class="intro__badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                Auto-save
              </span>
            </div>
          </div>
          <p class="intro__text">
            Selecione um arquivo CSV contendo CNPJs para verificar o enquadramento de cada empresa no Simples Nacional. 
            O sistema processa apenas CNPJs únicos, sem duplicatas, e salva o resultado automaticamente ao lado do arquivo original.
          </p>
        </div>
      </section>

      <section class="workspace">
        <div class="panel panel--primary">
          <div class="panel__header">
            <h2>Entrada e processamento</h2>
            <span class="panel__badge" data-slot="file-badge">${state.fileName ?? "Nenhum arquivo"}</span>
          </div>

          <div class="command-bar">
            <div class="command-bar__context">
              <span class="command-bar__label">Arquivo selecionado</span>
              <span class="command-bar__file" data-slot="command-summary">${
                state.fileName
                  ? escapeHtml(
                      formatCommandBarSummary(state.fileName, state.provider),
                    )
                  : "Nenhum arquivo selecionado"
              }</span>
              <span class="command-bar__hint">${state.fileName ? `Provider: ${state.provider}` : "Selecione um CSV para continuar"}</span>
            </div>
            <div class="command-bar__actions">
              ${button({ variant: "ghost", "data-action": "pick-file", children: "Selecionar CSV" })}
              ${button({ variant: "primary", "data-action": "process-file", children: state.status === "processing" ? "Processando..." : "Processar", disabled: state.status === "processing" || !state.content })}
              ${button({ variant: "danger", "data-action": "cancel-processing", children: "Cancelar", disabled: state.status !== "processing" })}
              ${button({ variant: "secondary", "data-action": "save-file", children: "Salvar cópia", disabled: !state.outputCsv })}
            </div>
          </div>

          <div class="controls-row">
            <label class="field" for="provider">
              <span class="field__label">
                Provider
                <span class="field__hint" title="mock: dados simulados, sem rede | cnpja-open: consulta real ao serviço">?</span>
              </span>
              <select id="provider" data-field="provider">
                <option value="mock" ${state.provider === "mock" ? "selected" : ""}>mock — dados simulados (offline)</option>
                <option value="cnpja-open" ${state.provider === "cnpja-open" ? "selected" : ""}>cnpja-open — consulta real</option>
              </select>
            </label>

            <label class="field" for="cnpj-column">
              <span class="field__label">Coluna de CNPJ</span>
              <input
                id="cnpj-column"
                data-field="cnpj-column"
                type="text"
                placeholder="Detectada automaticamente"
                value="${escapeHtml(state.cnpjColumn)}"
              />
            </label>
          </div>

          <div class="progress-section" ${state.status !== "processing" && !state.summary ? 'style="display:none"' : ""}>
            <div class="progress-header">
              <span class="ops-label">Progresso</span>
              <strong data-slot="progress-line">${formatProgressLine(state.progress)}</strong>
            </div>
            <div class="ops-progress__track">
              <span data-slot="progress-bar"></span>
            </div>
            <span class="current-cnpj" data-slot="current-cnpj">${
              state.progress?.currentCnpj ?? "—"
            }</span>
          </div>

          <p class="message" data-slot="message">${escapeHtml(state.message)}</p>
        </div>

        <aside class="panel panel--secondary">
          <div class="panel__header">
            <h2>Resumo dos resultados</h2>
          </div>
          <div class="summary" data-slot="summary">${renderSummary(state.summary)}</div>
          
          <div class="dedupe-info">
            <span class="ops-label">Deduplicação aplicada</span>
            <strong data-slot="dedupe-label">${
              state.summary
                ? buildDedupeLabel(state.summary)
                : "Aguardando processamento"
            }</strong>
          </div>

          <div class="save-info" ${!autoSavePreview ? 'style="display:none"' : ""}>
            <span class="ops-label">Arquivo de saída</span>
            <span class="save-path">${escapeHtml(autoSavePreview ?? "")}</span>
          </div>

          <div class="info-items">
            <div class="info-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              Use <strong>mock</strong> para testar sem consumir API.
            </div>
            <div class="info-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>
              O arquivo é salvo automaticamente ao lado do original.
            </div>
            <div class="info-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              CNPJs duplicados são contados mas consultados apenas uma vez.
            </div>
          </div>
        </aside>
      </section>
    </main>
  `;
}

function getStatusPillVariant(
  status: UiState["status"],
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

function renderStatusLabel(status: UiState["status"]): string {
  if (status === "processing") return "Processando";
  if (status === "success") return "Concluído";
  if (status === "cancelled") return "Cancelado";
  if (status === "error") return "Erro";
  if (status === "loading") return "Carregando";
  return "Aguardando";
}

function renderStatusText(state: UiState): string {
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

function renderSummary(summary: ProcessCsvSummary | null): string {
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

function extractMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function getLiveProgress(state: UiState): LookupProgress | null {
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

function buildCompletionMessage(result: ProcessCsvResult): string {
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
      ? `Concluído! Arquivo salvo automaticamente.`
      : "Processamento concluído.")
  );
}
