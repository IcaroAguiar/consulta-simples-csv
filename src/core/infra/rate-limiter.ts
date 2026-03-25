export class RateLimiter {
  private nextAvailableAt = 0;

  constructor(private readonly intervalInMs: number) {}

  async waitTurn(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new AbortError();
    }

    const now = Date.now();
    const delay = Math.max(0, this.nextAvailableAt - now);

    if (delay > 0) {
      await wait(delay, signal);
    }

    this.nextAvailableAt = Date.now() + this.intervalInMs;
  }
}

function wait(delay: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, delay);

    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

export class AbortError extends Error {
  constructor() {
    super("Processamento cancelado");
    this.name = "AbortError";
  }
}
