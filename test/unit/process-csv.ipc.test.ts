import { beforeEach, describe, expect, it, vi } from "vitest";

const handlers = new Map<string, (...args: unknown[]) => unknown>();

const electronMocks = vi.hoisted(() => ({
  app: { isPackaged: false },
  BrowserWindow: { getAllWindows: vi.fn(() => []) },
  dialog: {
    showOpenDialog: vi.fn(),
    showSaveDialog: vi.fn(),
    showMessageBox: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) =>
      handlers.set(channel, handler),
    ),
  },
  powerSaveBlocker: {
    start: vi.fn(() => 1),
    stop: vi.fn(),
    isStarted: vi.fn(() => true),
  },
}));

vi.mock("electron", () => electronMocks);

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("../../src/core/app/process-csv.use-case", () => ({
  processCsv: vi.fn(),
}));

vi.mock("../../src/core/simples/simples-provider.config", () => ({
  loadProviderConfig: vi.fn(),
}));

vi.mock("../../src/core/simples/simples-provider.factory", () => ({
  createSimplesLookupProvider: vi.fn(),
}));

import { processCsv } from "../../src/core/app/process-csv.use-case";
import { loadProviderConfig } from "../../src/core/simples/simples-provider.config";
import { createSimplesLookupProvider } from "../../src/core/simples/simples-provider.factory";
import {
  registerCsvIpc,
  resolveDefaultProvider,
} from "../../src/main/ipc/process-csv.ipc";

describe("process-csv IPC", () => {
  beforeEach(() => {
    handlers.clear();
    vi.clearAllMocks();
    electronMocks.app.isPackaged = false;
    registerCsvIpc();
  });

  it("uses the provider config loader for runtime defaults", () => {
    vi.mocked(loadProviderConfig).mockReturnValue("receita-web");

    const provider = resolveDefaultProvider();

    expect(loadProviderConfig).toHaveBeenCalledTimes(1);
    expect(provider).toBe("receita-web");
  });

  it("reports receita-web availability in app defaults based on packaging", async () => {
    const handler = handlers.get("app:get-defaults");
    vi.mocked(loadProviderConfig).mockReturnValue("mock");
    electronMocks.app.isPackaged = true;

    const defaults = await handler?.();

    expect(defaults).toEqual({
      provider: "mock",
      receitaWebAvailable: false,
    });
  });

  it("falls back to mock when packaged default points to receita-web", () => {
    vi.mocked(loadProviderConfig).mockReturnValue("receita-web");
    electronMocks.app.isPackaged = true;

    const provider = resolveDefaultProvider();

    expect(provider).toBe("mock");
  });

  it("rejects receita-web processing when the app is packaged", async () => {
    electronMocks.app.isPackaged = true;
    const handler = handlers.get("csv:process");

    expect(handler).toBeTypeOf("function");

    await expect(
      handler?.(
        {},
        { content: "cnpj\n47960950000121", provider: "receita-web" },
      ),
    ).rejects.toThrow("só está disponível em execução local");

    expect(createSimplesLookupProvider).not.toHaveBeenCalled();
    expect(processCsv).not.toHaveBeenCalled();
  });
});
