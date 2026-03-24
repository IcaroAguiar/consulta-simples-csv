import { contextBridge, ipcRenderer } from "electron";

import type { SimplesProviderName } from "../core/simples/simples-provider.factory";
import type { LookupProgress, ProcessCsvSummary } from "./types";

type PickCsvResult = {
  filePath: string;
  fileName: string;
  content: string;
};

type ProcessCsvInput = {
  content: string;
  provider: SimplesProviderName;
  cnpjColumn?: string;
};

type ProcessCsvResult = {
  outputCsv: string;
  summary: ProcessCsvSummary;
};

type AppDefaults = {
  provider: SimplesProviderName;
};

contextBridge.exposeInMainWorld("appBridge", {
  pickCsvFile: (): Promise<PickCsvResult | null> => {
    return ipcRenderer.invoke("csv:pick-input-file");
  },
  processCsv: (input: ProcessCsvInput): Promise<ProcessCsvResult> => {
    return ipcRenderer.invoke("csv:process", input);
  },
  saveCsvFile: (
    defaultName: string,
    content: string,
  ): Promise<string | null> => {
    return ipcRenderer.invoke("csv:save-output-file", {
      defaultName,
      content,
    });
  },
  autoSaveCsvFile: (sourceFilePath: string, content: string): Promise<string> => {
    return ipcRenderer.invoke("csv:auto-save-output-file", {
      sourceFilePath,
      content,
    });
  },
  onLookupProgress: (callback: (progress: LookupProgress) => void): (() => void) => {
    const listener = (_event: unknown, progress: LookupProgress) => {
      callback(progress);
    };

    ipcRenderer.on("csv:lookup-progress", listener);

    return () => {
      ipcRenderer.off("csv:lookup-progress", listener);
    };
  },
  getDefaults: (): Promise<AppDefaults> => {
    return ipcRenderer.invoke("app:get-defaults");
  },
});
