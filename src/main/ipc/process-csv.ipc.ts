import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { dialog, ipcMain, powerSaveBlocker } from "electron";

import { processCsv } from "../../core/app/process-csv.use-case";
import type { SimplesProviderName } from "../../core/simples/simples-provider.factory";
import { createSimplesLookupProvider } from "../../core/simples/simples-provider.factory";

type ProcessCsvInput = {
  content: string;
  provider: SimplesProviderName;
  cnpjColumn?: string;
  sourceFilePath?: string;
};

type ProcessingSession = {
  controller: AbortController;
  blockerId: number;
  startedAt: number;
};

type ProcessingCompletionListener = () => void;

let activeProcessingSession: ProcessingSession | null = null;
const completionListeners = new Set<ProcessingCompletionListener>();

export function registerCsvIpc(): void {
  ipcMain.handle("app:get-defaults", () => {
    const provider = normalizeProvider(process.env.SIMPLES_PROVIDER);

    return {
      provider,
    };
  });

  ipcMain.handle("csv:pick-input-file", async () => {
    const result = await dialog.showOpenDialog({
      title: "Selecionar CSV",
      properties: ["openFile"],
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];
    if (!filePath) {
      return null;
    }
    const content = await readFile(filePath, "utf8");

    return {
      filePath,
      fileName: filePath.split(/[\\/]/).pop() ?? "arquivo.csv",
      content,
    };
  });

  ipcMain.handle("csv:process", async (_event, input: ProcessCsvInput) => {
    if (activeProcessingSession) {
      throw new Error("Ja existe um processamento em andamento.");
    }

    const provider = createSimplesLookupProvider(input.provider);
    const options = input.cnpjColumn?.trim();
    const controller = new AbortController();
    const blockerId = powerSaveBlocker.start("prevent-app-suspension");
    const startedAt = Date.now();
    activeProcessingSession = {
      controller,
      blockerId,
      startedAt,
    };
    let lastLoggedAt = startedAt;

    console.info("[csv] processamento iniciado", {
      provider: input.provider,
      sourceFilePath: input.sourceFilePath ?? null,
    });

    try {
      const result = await processCsv(input.content, provider, {
        ...(options ? { cnpjColumn: options } : {}),
        signal: controller.signal,
        onLookupProgress(progress) {
          _event.sender.send("csv:lookup-progress", progress);
          const shouldLog =
            progress.completedUniqueLookups === 1 ||
            progress.completedUniqueLookups === progress.totalUniqueLookups ||
            progress.completedUniqueLookups % 10 === 0 ||
            Date.now() - lastLoggedAt >= 60_000;

          if (shouldLog) {
            lastLoggedAt = Date.now();
            console.info("[csv] progresso", {
              completedUniqueLookups: progress.completedUniqueLookups,
              totalUniqueLookups: progress.totalUniqueLookups,
              currentCnpj: progress.currentCnpj,
              elapsedMs: progress.elapsedMs,
              estimatedRemainingMs: progress.estimatedRemainingMs,
            });
          }
        },
      });

      const autoSaveResult = await attemptAutoSave(
        input.sourceFilePath ?? null,
        result.outputCsv,
      );

      console.info("[csv] processamento finalizado", {
        runStatus: result.runStatus,
        elapsedMs: Date.now() - startedAt,
        savedPath: autoSaveResult.savedPath,
      });

      return {
        ...result,
        savedPath: autoSaveResult.savedPath,
        warningMessage: autoSaveResult.warningMessage,
      };
    } finally {
      if (
        activeProcessingSession &&
        powerSaveBlocker.isStarted(activeProcessingSession.blockerId)
      ) {
        powerSaveBlocker.stop(activeProcessingSession.blockerId);
      }

      activeProcessingSession = null;
      notifyProcessingCompleted();
    }
  });

  ipcMain.handle("csv:cancel-processing", () => {
    if (!activeProcessingSession) {
      return false;
    }

    activeProcessingSession.controller.abort();
    console.info("[csv] cancelamento solicitado", {
      elapsedMs: Date.now() - activeProcessingSession.startedAt,
    });

    return true;
  });

  ipcMain.handle(
    "csv:save-output-file",
    async (
      _event,
      input: { defaultName: string; content: string },
    ): Promise<string | null> => {
      const result = await dialog.showSaveDialog({
        title: "Salvar CSV processado",
        defaultPath: input.defaultName,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });

      if (result.canceled || !result.filePath) {
        return null;
      }

      await writeFile(result.filePath, input.content, "utf8");

      return result.filePath;
    },
  );

  ipcMain.handle(
    "csv:auto-save-output-file",
    async (
      _event,
      input: { sourceFilePath: string; content: string },
    ): Promise<string> => {
      const parsedPath = path.parse(input.sourceFilePath);
      const outputPath = path.join(
        parsedPath.dir,
        `${parsedPath.name}-processado.csv`,
      );

      await writeFile(outputPath, input.content, "utf8");

      return outputPath;
    },
  );
}

export function hasActiveProcessing(): boolean {
  return activeProcessingSession !== null;
}

export function requestProcessingCancel(): boolean {
  if (!activeProcessingSession) {
    return false;
  }

  activeProcessingSession.controller.abort();
  return true;
}

export function onProcessingCompleted(
  listener: ProcessingCompletionListener,
): () => void {
  completionListeners.add(listener);

  return () => {
    completionListeners.delete(listener);
  };
}

function normalizeProvider(value: string | undefined): SimplesProviderName {
  if (value === "cnpja-open") {
    return "cnpja-open";
  }

  return "mock";
}

function notifyProcessingCompleted(): void {
  for (const listener of completionListeners) {
    listener();
  }
}

async function attemptAutoSave(
  sourceFilePath: string | null,
  content: string,
): Promise<{ savedPath: string | null; warningMessage: string | null }> {
  if (!sourceFilePath) {
    return {
      savedPath: null,
      warningMessage: null,
    };
  }

  try {
    const savedPath = await autoSaveOutputFile(sourceFilePath, content);

    return {
      savedPath,
      warningMessage: null,
    };
  } catch (error) {
    return {
      savedPath: null,
      warningMessage:
        error instanceof Error && error.message.trim()
          ? `Processamento concluído, mas o auto-save falhou: ${error.message}`
          : "Processamento concluído, mas o auto-save falhou.",
    };
  }
}

async function autoSaveOutputFile(
  sourceFilePath: string,
  content: string,
): Promise<string> {
  const parsedPath = path.parse(sourceFilePath);
  const outputPath = path.join(
    parsedPath.dir,
    `${parsedPath.name}-processado.csv`,
  );

  await writeFile(outputPath, content, "utf8");

  return outputPath;
}
