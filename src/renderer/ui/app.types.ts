import type { SimplesProviderName } from "../../core/simples/simples-provider.factory";
import type {
  LookupProgress,
  ProcessCsvRunStatus,
  ProcessCsvSummary,
} from "../../main/types";

export type PickCsvResult = {
  filePath: string;
  fileName: string;
  content: string;
};

export type ProcessCsvResult = {
  outputCsv: string;
  summary: ProcessCsvSummary;
  runStatus: ProcessCsvRunStatus;
  savedPath: string | null;
  warningMessage: string | null;
};

export type AppBridge = {
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
  getDefaults(): Promise<{
    provider: SimplesProviderName;
    receitaWebAvailable: boolean;
  }>;
};

declare global {
  interface Window {
    appBridge: AppBridge;
  }
}

export type UiStatus =
  | "idle"
  | "loading"
  | "processing"
  | "success"
  | "cancelled"
  | "error";

export type UiState = {
  fileName: string | null;
  filePath: string | null;
  content: string | null;
  provider: SimplesProviderName;
  receitaWebAvailable: boolean;
  cnpjColumn: string;
  status: UiStatus;
  message: string;
  outputCsv: string | null;
  summary: ProcessCsvSummary | null;
  savedPath: string | null;
  progress: LookupProgress | null;
  progressObservedAt: number | null;
  now: number;
};

export const initialState: UiState = {
  fileName: null,
  filePath: null,
  content: null,
  provider: "mock",
  receitaWebAvailable: false,
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
