import { stringify } from "csv-stringify/sync";

export function writeCsv(
  rows: Array<Record<string, string>>,
  delimiter: "," | ";",
  columns?: string[],
): string {
  const options: {
    header: true;
    delimiter: "," | ";";
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
