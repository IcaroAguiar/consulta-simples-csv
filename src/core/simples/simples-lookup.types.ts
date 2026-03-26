export type SimplesLookupStatus =
  | "SUCCESS"
  | "INVALID_CNPJ"
  | "NOT_FOUND"
  | "TEMPORARY_ERROR"
  | "PERMANENT_ERROR"
  | "CANCELLED"
  | "BLOCKED"
  | "CAPTCHA_REQUIRED"
  | "UNPARSABLE_RESULT";

export type SimplesLookupResult = {
  cnpj: string;
  simplesNacional: boolean | null;
  simei: boolean | null;
  source: string;
  status: SimplesLookupStatus;
  message?: string;
  raw?: unknown;
};
