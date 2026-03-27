import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock(
  "../../src/core/simples/adapters/receita-web/receita-browser-path",
  () => ({
    resolvePackagedWindowsBrowserPath: vi.fn(),
  }),
);

import { resolvePackagedWindowsBrowserPath } from "../../src/core/simples/adapters/receita-web/receita-browser-path";
import { loadProviderConfig } from "../../src/core/simples/simples-provider.config";
import {
  registerCsvIpc,
  resolveDefaultProvider,
} from "../../src/main/ipc/process-csv.ipc";

describe("process-csv IPC", () => {
  const originalPlatform = process.platform;

  beforeEach(() => {
    handlers.clear();
    vi.clearAllMocks();
    electronMocks.app.isPackaged = false;
    registerCsvIpc();
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
    });
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
    vi.mocked(resolvePackagedWindowsBrowserPath).mockReturnValue(undefined);

    const defaults = await handler?.();

    expect(defaults).toEqual({
      provider: "mock",
      receitaWebAvailable: false,
    });
  });

  it("reports receita-web availability when packaged Windows can find a browser", async () => {
    const handler = handlers.get("app:get-defaults");
    vi.mocked(loadProviderConfig).mockReturnValue("mock");
    electronMocks.app.isPackaged = true;
    Object.defineProperty(process, "platform", {
      value: "win32",
    });
    vi.mocked(resolvePackagedWindowsBrowserPath).mockReturnValue(
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    );

    const defaults = await handler?.();

    expect(defaults).toEqual({
      provider: "mock",
      receitaWebAvailable: true,
    });
  });

  it("keeps receita-web as default when config requests it in packaged Windows app", () => {
    vi.mocked(loadProviderConfig).mockReturnValue("receita-web");
    electronMocks.app.isPackaged = true;
    Object.defineProperty(process, "platform", {
      value: "win32",
    });
    vi.mocked(resolvePackagedWindowsBrowserPath).mockReturnValue(
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    );

    const provider = resolveDefaultProvider();

    expect(provider).toBe("receita-web");
  });

  it("rejects receita-web processing in packaged non-Windows runtimes", async () => {
    electronMocks.app.isPackaged = true;
    const handler = handlers.get("csv:process");
    vi.mocked(resolvePackagedWindowsBrowserPath).mockReturnValue(undefined);

    expect(handler).toBeTypeOf("function");

    await expect(
      handler?.(
        {},
        { content: "cnpj\n47960950000121", provider: "receita-web" },
      ),
    ).rejects.toThrow("disponível apenas no Windows");
  });
});
