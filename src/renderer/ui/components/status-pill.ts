export type StatusPillVariant = "default" | "muted" | "success" | "danger";

export type StatusPillOptions = {
  variant?: StatusPillVariant;
  children: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function statusPill(options: StatusPillOptions): string {
  const { variant = "default", children } = options;
  const variantClass = variant !== "default" ? `status-pill--${variant}` : "";

  return `<span class="status-pill ${variantClass}">${escapeHtml(children)}</span>`;
}
