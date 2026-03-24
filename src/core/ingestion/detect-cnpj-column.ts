const KNOWN_CNPJ_COLUMNS = [
  "cnpj",
  "documento",
  "cpf_cnpj",
  "cnpj_empresa",
] as const;

type DetectCnpjColumnOptions = {
  override?: string;
};

export function detectCnpjColumn(
  headers: string[],
  options: DetectCnpjColumnOptions = {},
): string | null {
  if (options.override) {
    const normalizedOverride = normalizeHeader(options.override);

    return (
      headers.find(
        (header) => normalizeHeader(header) === normalizedOverride,
      ) ?? null
    );
  }

  for (const knownColumn of KNOWN_CNPJ_COLUMNS) {
    const match = headers.find(
      (header) => normalizeHeader(header) === knownColumn,
    );
    if (match) {
      return match;
    }
  }

  return null;
}

function normalizeHeader(value: string): string {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase();
}
