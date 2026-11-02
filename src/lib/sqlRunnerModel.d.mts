export const MAX_ROWS: number;
export function executeQuery(database: any, query: string, maxRows?: number): {
  columns: string[];
  values: unknown[][];
  truncated: boolean;
};
export function formatCell(value: unknown): string;
