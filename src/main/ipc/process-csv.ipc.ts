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
};

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
    const provider = createSimplesLookupProvider(input.provider);
    const options = input.cnpjColumn?.trim();
    const blockerId = powerSaveBlocker.start("prevent-app-suspension");

    try {
      return await processCsv(input.content, provider, {
        ...(options ? { cnpjColumn: options } : {}),
        onLookupProgress(progress) {
          _event.sender.send("csv:lookup-progress", progress);
        },
      });
    } finally {
      if (powerSaveBlocker.isStarted(blockerId)) {
        powerSaveBlocker.stop(blockerId);
      }
    }
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

function normalizeProvider(value: string | undefined): SimplesProviderName {
  if (value === "cnpja-open") {
    return "cnpja-open";
  }

  return "mock";
}
