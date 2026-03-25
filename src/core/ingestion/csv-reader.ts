import { parse } from "csv-parse/sync";

export type CsvRow = Record<string, string>;

export type CsvReadResult = {
  delimiter: "," | ";";
  headers: string[];
  rows: CsvRow[];
};

export function readCsv(input: string): CsvReadResult {
  assertSupportedCsvInput(input);

  const delimiter = detectDelimiter(input);
  const records = parse(input, {
    bom: true,
    delimiter,
    skip_empty_lines: true,
    trim: true,
  }) as string[][];

  const headers = (records[0] ?? []).map((column) =>
    column.replace(/^\uFEFF/, ""),
  );
  const rows = records.slice(1).map((record) => {
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = record[index] ?? "";
      return row;
    }, {});
  });

  return {
    delimiter,
    headers,
    rows,
  };
}

function detectDelimiter(input: string): "," | ";" {
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  const semicolons = firstLine.split(";").length - 1;
  const commas = firstLine.split(",").length - 1;

  return semicolons > commas ? ";" : ",";
}

function assertSupportedCsvInput(input: string): void {
  if (input.startsWith("PK\u0003\u0004")) {
    throw new Error(
      "O arquivo selecionado parece ser uma planilha do Excel (.xlsx), não um CSV. Exporte a planilha como CSV UTF-8 e tente novamente.",
    );
  }
}
