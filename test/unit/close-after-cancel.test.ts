import { describe, expect, it } from "vitest";

import { closeWindowAfterCancellation } from "../../src/main/close-after-cancel";

describe("closeWindowAfterCancellation", () => {
  it("subscribes before requesting cancellation so a synchronous completion still closes the window", () => {
    let completionListener: (() => void) | null = null;
    let closeCalls = 0;

    closeWindowAfterCancellation({
      onCompleted(listener) {
        completionListener = listener;

        return () => {
          completionListener = null;
        };
      },
      requestCancel() {
        completionListener?.();
        return true;
      },
      closeWindow() {
        closeCalls += 1;
      },
    });

    expect(closeCalls).toBe(1);
    expect(completionListener).toBeNull();
  });

  it("closes immediately when there is no active processing to cancel", () => {
    let closeCalls = 0;

    closeWindowAfterCancellation({
      onCompleted() {
        return () => {};
      },
      requestCancel() {
        return false;
      },
      closeWindow() {
        closeCalls += 1;
      },
    });

    expect(closeCalls).toBe(1);
  });
});
