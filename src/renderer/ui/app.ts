import type { SimplesProviderName } from "../../core/simples/simples-provider.factory";
import { initialState, type PickCsvResult, type UiState } from "./app.types";
import {
  buildCompletionMessage,
  extractMessage,
  getLiveProgress,
  renderStatusText,
  renderSummary,
} from "./app-helpers";
import {
  getCurrentCnpjLabel,
  getProgressPercent,
  renderShell,
} from "./app-view";
import { buildDedupeLabel, formatProgressLine } from "./operational-copy";

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
      refs.progressBar.style.width = `${getProgressPercent(state)}%`;
    }

    if (refs.currentCnpj) {
      refs.currentCnpj.textContent = getCurrentCnpjLabel(state);
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
