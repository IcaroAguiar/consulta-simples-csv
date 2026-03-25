import { stringify } from "csv-stringify/sync";

export type CsvDelimiter = "," | ";" | "\t";

export function writeCsv(
  rows: Array<Record<string, string>>,
  delimiter: CsvDelimiter,
  columns?: string[],
): string {
  const options: {
    header: true;
    delimiter: CsvDelimiter;
    columns?: string[];
  } = {
    header: true,
    delimiter,
  };

  if (columns) {
    options.columns = columns;
  }

  return stringify(rows, options);
}
