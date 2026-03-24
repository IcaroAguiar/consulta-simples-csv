export class RateLimiter {
  private nextAvailableAt = 0;

  constructor(private readonly intervalInMs: number) {}

  async waitTurn(): Promise<void> {
    const now = Date.now();
    const delay = Math.max(0, this.nextAvailableAt - now);

    if (delay > 0) {
      await wait(delay);
    }

    this.nextAvailableAt = Date.now() + this.intervalInMs;
  }
}

function wait(delay: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}
