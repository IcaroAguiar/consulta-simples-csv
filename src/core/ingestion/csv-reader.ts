import { parse } from "csv-parse/sync";

export type CsvRow = Record<string, string>;
type CsvDelimiter = "," | ";" | "\t";
type LogicalRecord = {
  lineNumber: number;
  text: string;
};

const SINGLE_COLUMN_DELIMITER: CsvDelimiter = ";";
const SUPPORTED_DELIMITERS = [",", ";", "\t"] as const;
const UNABLE_TO_DETERMINE_DELIMITER_MESSAGE =
  "Não foi possível determinar o delimitador do CSV de forma confiável. Use um arquivo com separador consistente (, ; ou tab).";
const INCONSISTENT_SINGLE_COLUMN_MESSAGE =
  "O arquivo parece ser de uma coluna única, mas algumas linhas usam separador. Mantenha o arquivo consistente ou remova os delimitadores extras.";

export type CsvReadResult = {
  delimiter: CsvDelimiter;
  headers: string[];
  rowLineNumbers: number[];
  rows: CsvRow[];
};

export function readCsv(input: string): CsvReadResult {
  assertSupportedCsvInput(input);

  const normalizedRecords = collectLogicalRecords(input);
  const { delimiter, records } = resolveCsvStructure(normalizedRecords);
  const normalizedInput = records.map((record) => record.text).join("\n");
  const parsedRows = parse(normalizedInput, {
    bom: false,
    delimiter,
    skip_empty_lines: true,
    trim: false,
  }) as string[][];

  const headers = (parsedRows[0] ?? []).map((column) =>
    column.replace(/^\uFEFF/, ""),
  );
  const rows = parsedRows.slice(1).map((record) => {
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = record[index] ?? "";
      return row;
    }, {});
  });
  const rowLineNumbers = records.slice(1).map((record) => record.lineNumber);

  return {
    delimiter,
    headers,
    rowLineNumbers,
    rows,
  };
}

function collectLogicalRecords(input: string): LogicalRecord[] {
  const rawInput = input.replace(/^\uFEFF/, "");
  const records: LogicalRecord[] = [];
  let buffer = "";
  let inQuotes = false;
  let currentLineNumber = 1;
  let recordStartLineNumber = 1;

  for (let index = 0; index < rawInput.length; index += 1) {
    const character = rawInput[index];
    const nextCharacter = rawInput[index + 1];

    if (character === '"') {
      buffer += character;

      if (inQuotes && nextCharacter === '"') {
        buffer += nextCharacter;
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && (character === "\r" || character === "\n")) {
      if (buffer.trim().length > 0) {
        records.push({
          lineNumber: recordStartLineNumber,
          text: buffer,
        });
      }

      buffer = "";
      currentLineNumber += 1;
      recordStartLineNumber = currentLineNumber;

      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }

      continue;
    }

    buffer += character;
  }

  if (buffer.trim().length > 0) {
    records.push({
      lineNumber: recordStartLineNumber,
      text: buffer,
    });
  }

  return records;
}

function detectDelimiter(records: LogicalRecord[]): CsvDelimiter {
  const firstRecord = records[0];

  if (!firstRecord) {
    return SINGLE_COLUMN_DELIMITER;
  }

  const firstAnalysis = analyzeRecordDelimiters(firstRecord.text);

  if (firstAnalysis.totalDelimiters === 0) {
    for (const record of records.slice(1)) {
      if (analyzeRecordDelimiters(record.text).totalDelimiters > 0) {
        throw new Error(INCONSISTENT_SINGLE_COLUMN_MESSAGE);
      }
    }

    return SINGLE_COLUMN_DELIMITER;
  }

  const parseableDelimiters = SUPPORTED_DELIMITERS.filter((delimiter) =>
    canParseRecordsWithDelimiter(records, delimiter),
  );

  if (parseableDelimiters.length === 1) {
    const [onlyDelimiter] = parseableDelimiters;

    if (onlyDelimiter) {
      return onlyDelimiter;
    }
  }

  const detectedDelimiter = selectDelimiter(firstAnalysis);

  if (detectedDelimiter && parseableDelimiters.includes(detectedDelimiter)) {
    return detectedDelimiter;
  }

  throw new Error(UNABLE_TO_DETERMINE_DELIMITER_MESSAGE);
}

function resolveCsvStructure(records: LogicalRecord[]): {
  delimiter: CsvDelimiter;
  records: LogicalRecord[];
} {
  if (records.length === 0) {
    return {
      delimiter: SINGLE_COLUMN_DELIMITER,
      records,
    };
  }

  const structuredSlice = findStructuredSlice(records);

  if (structuredSlice) {
    return structuredSlice;
  }

  return {
    delimiter: detectDelimiter(records),
    records,
  };
}

function findStructuredSlice(records: LogicalRecord[]): {
  delimiter: CsvDelimiter;
  records: LogicalRecord[];
} | null {
  const analyses = records.map((record) =>
    analyzeRecordDelimiters(record.text),
  );

  for (let startIndex = 0; startIndex < records.length; startIndex += 1) {
    const headerRecord = records[startIndex];
    const headerAnalysis = analyses[startIndex];
    if (!headerRecord) {
      continue;
    }
    if (!headerAnalysis) {
      continue;
    }

    const nextRecord = records[startIndex + 1];
    if (!nextRecord && !(startIndex === 0 && records.length === 1)) {
      continue;
    }

    const delimiter = selectStructuredDelimiter(
      headerRecord.text,
      headerAnalysis,
      nextRecord?.text,
    );

    if (delimiter) {
      return {
        delimiter,
        records: records.slice(startIndex),
      };
    }
  }

  return null;
}

function selectStructuredDelimiter(
  headerRecord: string,
  headerAnalysis: RecordDelimiterAnalysis,
  nextRecord?: string,
): CsvDelimiter | null {
  const candidateDelimiters = getCandidateDelimiters(headerAnalysis);
  const structuredDelimiters = candidateDelimiters.filter((delimiter) => {
    const header = tryParseRow(headerRecord, delimiter);

    if (!header) {
      return false;
    }

    if (nextRecord === undefined) {
      return isStructuredHeader(header);
    }

    const nextRow = tryParseRow(nextRecord, delimiter);

    return nextRow ? isStructuredPair(header, nextRow) : false;
  });

  if (structuredDelimiters.length === 1) {
    const [onlyDelimiter] = structuredDelimiters;

    return onlyDelimiter ?? null;
  }

  if (structuredDelimiters.length > 1) {
    const preferredDelimiter = selectDelimiter(headerAnalysis);

    if (
      preferredDelimiter &&
      structuredDelimiters.includes(preferredDelimiter)
    ) {
      return preferredDelimiter;
    }
  }

  return null;
}

function canParseRecordsWithDelimiter(
  records: LogicalRecord[],
  delimiter: CsvDelimiter,
): boolean {
  const parsedRecords = tryParseRecords(records, delimiter);

  if (!parsedRecords) {
    return false;
  }

  return (parsedRecords[0] ?? []).length > 1;
}

function countDelimiterOccurrences(
  line: string,
  delimiter: CsvDelimiter,
): number {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      const nextCharacter = line[index + 1];

      if (inQuotes && nextCharacter === '"') {
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && character === delimiter) {
      count += 1;
    }
  }

  return count;
}

type RecordDelimiterAnalysis = {
  commaCount: number;
  semicolonCount: number;
  tabCount: number;
  totalDelimiters: number;
};

function analyzeRecordDelimiters(line: string): RecordDelimiterAnalysis {
  const commaCount = countDelimiterOccurrences(line, ",");
  const semicolonCount = countDelimiterOccurrences(line, ";");
  const tabCount = countDelimiterOccurrences(line, "\t");

  return {
    commaCount,
    semicolonCount,
    tabCount,
    totalDelimiters: commaCount + semicolonCount + tabCount,
  };
}

function selectDelimiter(
  analysis: RecordDelimiterAnalysis,
): "," | ";" | "\t" | null {
  const entries: Array<["," | ";" | "\t", number]> = SUPPORTED_DELIMITERS.map(
    (delimiter) => [delimiter, getDelimiterCount(analysis, delimiter)],
  );

  let selectedDelimiter: "," | ";" | "\t" | null = null;
  let selectedCount = 0;
  let tied = false;

  for (const [delimiter, count] of entries) {
    if (count > selectedCount) {
      selectedDelimiter = delimiter;
      selectedCount = count;
      tied = false;
      continue;
    }

    if (count > 0 && count === selectedCount) {
      tied = true;
    }
  }

  if (tied || selectedCount === 0) {
    return null;
  }

  return selectedDelimiter;
}

function getDelimiterCount(
  analysis: RecordDelimiterAnalysis,
  delimiter: "," | ";" | "\t",
): number {
  if (delimiter === ",") {
    return analysis.commaCount;
  }

  if (delimiter === ";") {
    return analysis.semicolonCount;
  }

  return analysis.tabCount;
}

function tryParseRecords(
  records: LogicalRecord[],
  delimiter: CsvDelimiter,
): string[][] | null {
  try {
    return parse(records.map((record) => record.text).join("\n"), {
      bom: false,
      delimiter,
      skip_empty_lines: true,
      trim: false,
    }) as string[][];
  } catch {
    return null;
  }
}

function tryParseRow(line: string, delimiter: CsvDelimiter): string[] | null {
  const parsedRecords = tryParseRecords(
    [{ lineNumber: 1, text: line }],
    delimiter,
  );

  return parsedRecords?.[0] ?? null;
}

function isStructuredHeader(header: string[]): boolean {
  if (header.length <= 1) {
    return false;
  }

  const nonEmptyCells = header.filter((cell) => cell.trim().length > 0);

  if (nonEmptyCells.length < 2) {
    return false;
  }

  return nonEmptyCells.some((cell) => /[A-Za-zÀ-ÿ]/.test(cell));
}

function isStructuredPair(header: string[], nextRow: string[]): boolean {
  if (!isStructuredHeader(header) || nextRow.length !== header.length) {
    return false;
  }

  if (!hasAnyNonEmptyCell(nextRow)) {
    return false;
  }

  return header.some(
    (cell, index) => cell.trim() !== (nextRow[index] ?? "").trim(),
  );
}

function hasAnyNonEmptyCell(row: string[]): boolean {
  return row.some((cell) => cell.trim().length > 0);
}

function getCandidateDelimiters(
  analysis: RecordDelimiterAnalysis,
): CsvDelimiter[] {
  return SUPPORTED_DELIMITERS.filter(
    (delimiter) => getDelimiterCount(analysis, delimiter) > 0,
  );
}

function assertSupportedCsvInput(input: string): void {
  if (input.startsWith("PK\u0003\u0004")) {
    throw new Error(
      "O arquivo selecionado parece ser uma planilha do Excel (.xlsx), não um CSV. Exporte a planilha como CSV UTF-8 e tente novamente.",
    );
  }
}
