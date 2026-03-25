export type ButtonVariant = "primary" | "ghost" | "secondary" | "danger";

export type ButtonOptions = {
  variant?: ButtonVariant;
  disabled?: boolean;
  "data-action"?: string;
  type?: "button" | "submit" | "reset";
  children: string;
};

function escapeAttr(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function button(options: ButtonOptions): string {
  const {
    variant = "ghost",
    disabled = false,
    "data-action": dataAction,
    type = "button",
    children,
  } = options;

  const variantClass = `button--${variant}`;
  const disabledAttr = disabled ? "disabled" : "";
  const dataActionAttr = dataAction
    ? `data-action="${escapeAttr(dataAction)}"`
    : "";

  return `<button
    class="button ${variantClass}"
    type="${type}"
    ${disabledAttr}
    ${dataActionAttr}
  >${escapeHtml(children)}</button>`;
}
