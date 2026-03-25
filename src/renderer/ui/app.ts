import type { SimplesProviderName } from "../../core/simples/simples-provider.factory";
import type {
  LookupProgress,
  ProcessCsvRunStatus,
  ProcessCsvSummary,
} from "../../main/types";
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
  message: "Selecione um CSV para começar.",
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
    commandSummary: root.querySelector<HTMLElement>(
      '[data-slot="command-summary"]',
    ),
    message: root.querySelector<HTMLElement>('[data-slot="message"]'),
    summary: root.querySelector<HTMLElement>('[data-slot="summary"]'),
    outputStatus: root.querySelector<HTMLElement>(
      '[data-slot="output-status"]',
    ),
    autoSavePreviews: Array.from(
      root.querySelectorAll<HTMLElement>('[data-slot="auto-save-preview"]'),
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
      state.message = `Consultando ${progress.completedUniqueLookups} de ${progress.totalUniqueLookups} CNPJs únicos...`;
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
        "Nao foi possivel abrir o arquivo.",
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
    state.message = `Arquivo carregado: ${result.fileName}`;
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
    state.message = "Processando CSV...";
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
        ? "Cancelamento solicitado. O app vai concluir a consulta em andamento e salvar o resultado parcial."
        : "Nao havia processamento ativo para cancelar.";
      syncUi();
    } catch (error) {
      state.message = extractMessage(
        error,
        "Nao foi possivel solicitar o cancelamento.",
      );
      syncUi();
    }
  }

  async function handleSaveFile(): Promise<void> {
    if (!state.outputCsv || !state.fileName) {
      return;
    }

    state.status = "loading";
    state.message = "Abrindo dialogo de salvamento...";
    syncUi();

    try {
      const defaultName = state.fileName.replace(/\.csv$/i, "-processado.csv");
      const savedPath = await window.appBridge.saveCsvFile(
        defaultName,
        state.outputCsv,
      );

      if (!savedPath) {
        state.status = "success";
        state.message = "Salvamento cancelado.";
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

    const autoSavePreviewText = state.savedPath
      ? state.savedPath
      : state.filePath
        ? previewAutoSavePath(state.filePath)
        : "Nenhum caminho ainda";

    for (const preview of refs.autoSavePreviews) {
      preview.textContent = autoSavePreviewText;
    }

    if (refs.dedupeLabel) {
      refs.dedupeLabel.textContent = state.summary
        ? buildDedupeLabel(state.summary)
        : "A deduplicacao aparece depois da primeira execucao.";
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
      refs.currentCnpj.textContent =
        state.progress?.currentCnpj ?? "Aguardando primeiro CNPJ";
    }

    if (refs.commandSummary) {
      refs.commandSummary.textContent = formatCommandBarSummary(
        state.fileName,
        state.provider,
      );
    }

    if (refs.summary) {
      refs.summary.innerHTML = renderSummary(state.summary);
    }

    if (refs.processButton) {
      refs.processButton.disabled =
        state.status === "processing" || !state.content;
      refs.processButton.textContent =
        state.status === "processing" ? "Processando..." : "Processar CSV";
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
    ? state.savedPath
    : state.filePath
      ? previewAutoSavePath(state.filePath)
      : "Nenhum caminho ainda";

  return `
    <main class="app-shell">
      <header class="topbar">
        <div class="brand-lockup">
          <span class="brand-mark" aria-hidden="true">CS</span>
          <div class="brand-lockup__copy">
            <p class="eyebrow">Consulta Simples CSV</p>
            <strong>Ferramenta operacional para lotes longos com CNPJá.</strong>
          </div>
        </div>
        <div class="topbar__chips" aria-label="Capacidades da interface">
          <span class="status-pill status-pill--muted">Sem banco</span>
          <span class="status-pill status-pill--muted">Auto-save</span>
          <span class="status-pill status-pill--muted">Dedupe único</span>
        </div>
      </header>

      <section class="hero">
        <div class="hero__copy">
          <p class="eyebrow">Consulta Simples CSV</p>
          <h1>Mesa operacional para lotes longos de CNPJs.</h1>
          <p class="lede">
            O app processa apenas CNPJs únicos válidos, mantém o operador informado com ETA vivo e grava a saída automaticamente ao lado do CSV original.
          </p>
          <div class="hero__meta" aria-label="Características do fluxo">
            <span class="hero__meta-chip">Leitura de CSV local</span>
            <span class="hero__meta-chip">Provider selecionável</span>
            <span class="hero__meta-chip">ETA em tempo real</span>
          </div>
        </div>
        <div class="hero__status" aria-live="polite">
          <span class="ops-label">Console operacional</span>
          <div class="status-chip-row">
            <span class="status-pill">${renderStatusLabel(state.status)}</span>
            <span class="status-pill status-pill--muted">${
              state.fileName ? "Arquivo carregado" : "Aguardando CSV"
            }</span>
          </div>
          <div class="status-stack">
            <strong data-slot="current-cnpj">${
              state.progress?.currentCnpj ?? "Aguardando primeiro CNPJ"
            }</strong>
            <span data-slot="output-status">${renderStatusText(state)}</span>
            <span class="status-copy" data-slot="auto-save-preview">${escapeHtml(
              autoSavePreview,
            )}</span>
          </div>
        </div>
      </section>

      <section class="ops-strip" aria-label="Resumo operacional">
        <div class="ops-tile">
          <span class="ops-label">Dedupe</span>
          <strong data-slot="dedupe-label">${
            state.summary
              ? buildDedupeLabel(state.summary)
              : "A deduplicacao aparece depois da primeira execucao."
          }</strong>
        </div>

        <div class="ops-progress">
          <div class="ops-progress__header">
            <span class="ops-label">Progresso e ETA</span>
            <strong data-slot="progress-line">${formatProgressLine(
              state.progress,
            )}</strong>
          </div>
          <div class="ops-progress__track" aria-hidden="true">
            <span data-slot="progress-bar"></span>
          </div>
        </div>

        <div class="ops-tile">
          <span class="ops-label">Auto-save</span>
          <strong data-slot="auto-save-preview">${escapeHtml(autoSavePreview)}</strong>
        </div>
      </section>

      <section class="workspace">
        <div class="panel panel--primary">
          <div class="panel__header">
            <div>
              <p class="panel__kicker">Arquivo de entrada</p>
              <h2>Entrada e execução</h2>
            </div>
          </div>

          <div class="command-bar">
            <div class="command-bar__context">
              <span class="ops-label">Arquivo ativo</span>
              <strong data-slot="command-summary">${escapeHtml(
                formatCommandBarSummary(state.fileName, state.provider),
              )}</strong>
              <span class="command-bar__hint">
                CSV com header, CNPJ normalizado e saída ao lado do original.
              </span>
            </div>
            <div class="command-bar__actions">
              <button class="button button--ghost" data-action="pick-file" type="button">
                Selecionar CSV
              </button>
              <button class="button button--primary" data-action="process-file" type="button">
                Processar CSV
              </button>
              <button class="button button--danger" data-action="cancel-processing" type="button">
                Cancelar lote
              </button>
              <button class="button button--secondary" data-action="save-file" type="button">
                Salvar cópia manual
              </button>
            </div>
          </div>

          <div class="grid">
            <label class="field" for="provider">
              <span class="field__label">Provider</span>
              <select id="provider" data-field="provider">
                <option value="mock">mock</option>
                <option value="cnpja-open">cnpja-open</option>
              </select>
            </label>

            <label class="field" for="cnpj-column">
              <span class="field__label">Coluna de CNPJ opcional</span>
              <input
                id="cnpj-column"
                data-field="cnpj-column"
                type="text"
                inputmode="text"
                placeholder="Ex.: cpf_cnpj"
              />
            </label>
          </div>

          <p class="message" data-slot="message">${escapeHtml(state.message)}</p>
        </div>

        <aside class="panel panel--secondary">
          <div class="panel__header">
            <div>
              <p class="panel__kicker">Resumo</p>
              <h2>Saída do processamento</h2>
            </div>
          </div>
          <div class="summary" data-slot="summary">${renderSummary(state.summary)}</div>
          <p class="note">
            O arquivo de saída preserva as colunas originais e adiciona metadados de validação.
          </p>
          <p class="note">
            O provider cnpja-open respeita o limite público do serviço e deve ser usado para validação, não para lote pesado.
          </p>
          <ul class="runbook">
            <li>Use <strong>mock</strong> para validar o layout e o arquivo final sem rede.</li>
            <li>Troque para <strong>cnpja-open</strong> quando quiser medir o fluxo real.</li>
            <li>O caminho de auto-save aparece acima; o salvamento manual é apenas contingência.</li>
          </ul>
          <p class="note">${
            state.savedPath
              ? `Último salvamento: ${escapeHtml(state.savedPath)}`
              : "Nenhum arquivo salvo ainda."
          }</p>
        </aside>
      </section>
    </main>
  `;
}

function renderStatusLabel(status: UiState["status"]): string {
  if (status === "processing") {
    return "Processando";
  }

  if (status === "success") {
    return "Pronto";
  }

  if (status === "cancelled") {
    return "Cancelado";
  }

  if (status === "error") {
    return "Erro";
  }

  if (status === "loading") {
    return "Carregando";
  }

  return "Aguardando";
}

function renderStatusText(state: UiState): string {
  if (state.status === "processing" && state.progress) {
    return formatProgressLine(getLiveProgress(state));
  }

  if (state.status === "success" && state.summary) {
    const autoSaveText = state.savedPath
      ? "auto-save concluído"
      : "aguardando salvamento";

    return `${state.summary.totalLinhas} linhas • ${state.summary.totalCnpjsUnicosConsultados} consultas únicas • ${autoSaveText}.`;
  }

  if (state.status === "cancelled" && state.summary) {
    return `${state.summary.totalLinhas} linhas • ${state.summary.totalCnpjsUnicosConsultados} consultas únicas concluídas antes do cancelamento.`;
  }

  return state.message;
}

function renderSummary(summary: ProcessCsvSummary | null): string {
  if (!summary) {
    return `
      <div class="summary__empty">
        <strong>Sem resultados ainda</strong>
        <span>O resumo aparece depois do processamento.</span>
      </div>
    `;
  }

  return `
    <dl class="summary__grid">
      <div><dt>Linhas</dt><dd>${summary.totalLinhas}</dd></div>
      <div><dt>CNPJs encontrados</dt><dd>${summary.totalCnpjsEncontrados}</dd></div>
      <div><dt>CNPJs válidos</dt><dd>${summary.totalCnpjsValidos}</dd></div>
      <div><dt>Consultas únicas</dt><dd>${summary.totalCnpjsUnicosConsultados}</dd></div>
      <div><dt>Optantes Simples</dt><dd>${summary.totalOptantesSimples}</dd></div>
      <div><dt>Não optantes</dt><dd>${summary.totalNaoOptantesSimples}</dd></div>
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
        ? "Processamento cancelado e CSV parcial salvo automaticamente."
        : "Processamento cancelado.")
    );
  }

  return (
    result.warningMessage ??
    (result.savedPath
      ? "Processamento concluido e CSV salvo automaticamente."
      : "Processamento concluido.")
  );
}
