import type { UiState } from "./app.types";
import {
  escapeHtml,
  getLiveProgress,
  getStatusPillVariant,
  renderStatusLabel,
  renderSummary,
} from "./app-helpers";
import { button, statusPill } from "./components";
import {
  buildDedupeLabel,
  formatCommandBarSummary,
  formatProgressLine,
  previewAutoSavePath,
} from "./operational-copy";

export function renderShell(state: UiState): string {
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

export function getProgressPercent(state: UiState): number {
  return state.progress
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
}

export function getCurrentCnpjLabel(state: UiState): string {
  return getLiveProgress(state)?.currentCnpj ?? "—";
}
