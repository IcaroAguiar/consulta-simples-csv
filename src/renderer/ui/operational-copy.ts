import type { SimplesProviderName } from "../../core/simples/simples-provider.factory";
import type { LookupProgress } from "../../main/types";

type DedupeSource = {
  totalCnpjsEncontrados: number;
  totalCnpjsUnicosConsultados: number;
};

export function formatDuration(durationInMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationInMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function formatProviderMode(provider: SimplesProviderName): string {
  if (provider === "cnpja-open") {
    return "CNPJá Open live";
  }

  if (provider === "receita-web") {
    return "Receita assistida (experimental)";
  }

  return "Mock local";
}

export function formatCommandBarSummary(
  fileName: string | null,
  provider: SimplesProviderName,
): string {
  const label = fileName ?? "Nenhum CSV carregado";

  return `${label} • ${formatProviderMode(provider)}`;
}

export function buildDedupeLabel(source: DedupeSource): string {
  const duplicates = Math.max(
    0,
    source.totalCnpjsEncontrados - source.totalCnpjsUnicosConsultados,
  );

  return `${duplicates} duplicados removidos`;
}

export function previewAutoSavePath(sourceFilePath: string): string {
  const normalized = sourceFilePath.replace(/\.csv$/i, "");

  return `${normalized}-processado.csv`;
}

export function formatProgressLine(progress: LookupProgress | null): string {
  if (!progress) {
    return "Aguardando arquivo para iniciar as consultas únicas.";
  }

  return `${progress.completedUniqueLookups}/${progress.totalUniqueLookups} consultas únicas • decorrido ${formatDuration(progress.elapsedMs)} • ETA ${formatDuration(progress.estimatedRemainingMs)} • atual ${progress.currentCnpj}`;
}

export function countdownRemainingMs(
  baseRemainingMs: number,
  elapsedSinceLastProgressMs: number,
): number {
  return Math.max(0, baseRemainingMs - elapsedSinceLastProgressMs);
}
