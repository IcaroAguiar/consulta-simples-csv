import { existsSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

describe("resolvePackagedWindowsBrowserPath", () => {
  const originalPlatform = process.platform;
  const originalEnv = { ...process.env };

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    Object.defineProperty(process, "platform", {
      value: originalPlatform,
    });
  });

  it("returns Chrome path when found in LOCALAPPDATA", async () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
    });
    process.env.LOCALAPPDATA = "C:\\Users\\tester\\AppData\\Local";
    vi.mocked(existsSync).mockImplementation((candidate) =>
      String(candidate).endsWith("Google\\Chrome\\Application\\chrome.exe"),
    );

    const { resolvePackagedWindowsBrowserPath } = await import(
      "../../src/core/simples/adapters/receita-web/receita-browser-path"
    );

    expect(resolvePackagedWindowsBrowserPath()).toBe(
      "C:\\Users\\tester\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
    );
  });

  it("returns Edge path when Chrome is unavailable", async () => {
    Object.defineProperty(process, "platform", {
      value: "win32",
    });
    process.env.PROGRAMFILES = "C:\\Program Files";
    vi.mocked(existsSync).mockImplementation((candidate) =>
      String(candidate).endsWith("Microsoft\\Edge\\Application\\msedge.exe"),
    );

    const { resolvePackagedWindowsBrowserPath } = await import(
      "../../src/core/simples/adapters/receita-web/receita-browser-path"
    );

    expect(resolvePackagedWindowsBrowserPath()).toBe(
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    );
  });

  it("returns undefined outside Windows or when no browser exists", async () => {
    Object.defineProperty(process, "platform", {
      value: "darwin",
    });
    vi.mocked(existsSync).mockReturnValue(false);

    const { resolvePackagedWindowsBrowserPath } = await import(
      "../../src/core/simples/adapters/receita-web/receita-browser-path"
    );

    expect(resolvePackagedWindowsBrowserPath()).toBeUndefined();
  });
});
