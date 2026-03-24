import { readFile } from "node:fs/promises";
import { dialog, ipcMain } from "electron";

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

    return processCsv(
      input.content,
      provider,
      options ? { cnpjColumn: options } : {},
    );
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

      const { writeFile } = await import("node:fs/promises");
      await writeFile(result.filePath, input.content, "utf8");

      return result.filePath;
    },
  );
}

function normalizeProvider(value: string | undefined): SimplesProviderName {
  if (value === "cnpja-open") {
    return "cnpja-open";
  }

  return "mock";
}
