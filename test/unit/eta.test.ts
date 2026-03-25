import { describe, expect, it } from "vitest";

import { estimateObservedRemainingMs } from "../../src/core/app/eta";

describe("estimateObservedRemainingMs", () => {
  it("uses observed average when it is above the floor", () => {
    expect(estimateObservedRemainingMs(90_000, 3, 10)).toBe(210_000);
  });

  it("keeps a conservative floor when elapsed average is too low", () => {
    expect(estimateObservedRemainingMs(2_000, 1, 5)).toBe(48_000);
  });
});
