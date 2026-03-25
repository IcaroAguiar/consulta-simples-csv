export type ProgressBarOptions = {
  /** Width percentage (0-100) */
  percent?: number;
  "data-slot"?: string;
};

const MIN_PERCENT = 0;
const MAX_PERCENT = 100;

export function progressBar(options: ProgressBarOptions): string {
  const { percent = 0, "data-slot": dataSlot = "progress-bar" } = options;
  const clamped = Math.min(MAX_PERCENT, Math.max(MIN_PERCENT, percent));

  return `<span data-slot="${dataSlot}" style="width: ${clamped}%"></span>`;
}
