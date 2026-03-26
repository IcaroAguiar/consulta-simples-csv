import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadProviderConfig } from "../../src/core/simples/simples-provider.config";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("node:path", () => ({
  resolve: vi.fn((_, path) => path),
}));

const mockFs = vi.mocked(await import("node:fs"));

describe("loadProviderConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.SIMPLES_PROVIDER;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns provider from config file when file exists and has valid provider", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ provider: "cnpja-open" }),
    );

    const result = loadProviderConfig();

    expect(result).toBe("cnpja-open");
  });

  it("returns receita-web from config file when valid", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ provider: "receita-web" }),
    );

    const result = loadProviderConfig();

    expect(result).toBe("receita-web");
  });

  it("returns mock from config file when valid", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ provider: "mock" }));

    const result = loadProviderConfig();

    expect(result).toBe("mock");
  });

  it("falls back to env var when config file does not exist", () => {
    mockFs.existsSync.mockReturnValue(false);
    process.env.SIMPLES_PROVIDER = "cnpja-open";

    const result = loadProviderConfig();

    expect(result).toBe("cnpja-open");
  });

  it("falls back to env var when config file has invalid provider", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ provider: "invalid" }),
    );
    process.env.SIMPLES_PROVIDER = "receita-web";

    const result = loadProviderConfig();

    expect(result).toBe("receita-web");
  });

  it("falls back to default when config file missing and no env var", () => {
    mockFs.existsSync.mockReturnValue(false);

    const result = loadProviderConfig();

    expect(result).toBe("mock");
  });

  it("falls back to default when config file has invalid JSON", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("not-json");

    const result = loadProviderConfig();

    expect(result).toBe("mock");
  });

  it("falls back to default when config file has missing provider field", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ otherField: "value" }),
    );

    const result = loadProviderConfig();

    expect(result).toBe("mock");
  });

  it("falls back to default when env var has invalid provider", () => {
    mockFs.existsSync.mockReturnValue(false);
    process.env.SIMPLES_PROVIDER = "invalid";

    const result = loadProviderConfig();

    expect(result).toBe("mock");
  });

  it("prioritizes config file over env var", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ provider: "cnpja-open" }),
    );
    process.env.SIMPLES_PROVIDER = "receita-web";

    const result = loadProviderConfig();

    expect(result).toBe("cnpja-open");
  });
});
