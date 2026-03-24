import { describe, expect, it } from "vitest";

import {
  buildDedupeLabel,
  formatDuration,
  formatProviderMode,
  previewAutoSavePath,
} from "../../src/renderer/ui/operational-copy";

describe("renderer operational copy", () => {
  it("formats duration in hour and minute buckets", () => {
    expect(formatDuration(0)).toBe("0s");
    expect(formatDuration(61_000)).toBe("1m 1s");
    expect(formatDuration(3 * 60 * 60_000 + 5 * 60_000)).toBe("3h 5m");
  });

  it("formats the provider mode label", () => {
    expect(formatProviderMode("mock")).toBe("Mock local");
    expect(formatProviderMode("cnpja-open")).toBe("CNPJá Open live");
  });

  it("builds a readable dedupe label", () => {
    expect(
      buildDedupeLabel({
        totalCnpjsEncontrados: 1_000,
        totalCnpjsUnicosConsultados: 742,
      }),
    ).toBe("258 duplicados removidos");
  });

  it("derives the auto-save path preview next to the source file", () => {
    expect(
      previewAutoSavePath("/Users/icaroaguiar/Downloads/clientes.csv"),
    ).toBe("/Users/icaroaguiar/Downloads/clientes-processado.csv");
  });
});
