/**
 * Masa (table) tanımları — tek doğruluk kaynağı.
 * Salon: 101–119, Teras: 120–133.
 */

export type TableArea = "SALON" | "TERAS";

export type TableAreaFilter = "TUMU" | TableArea;

export interface TableDef {
  /** Masa numarası (adisyonlarda string olarak saklanır, örn. "101") */
  number: string;
  area: TableArea;
}

export const TABLE_AREA_LABELS: Record<TableArea, string> = {
  SALON: "Salon",
  TERAS: "Teras",
};

const range = (from: number, to: number, area: TableArea): TableDef[] =>
  Array.from({ length: to - from + 1 }, (_, i) => ({
    number: String(from + i),
    area,
  }));

export const SALON_TABLES: TableDef[] = range(101, 119, "SALON");
export const TERAS_TABLES: TableDef[] = range(120, 133, "TERAS");
export const ALL_TABLES: TableDef[] = [...SALON_TABLES, ...TERAS_TABLES];

const TABLE_BY_NUMBER = new Map(ALL_TABLES.map((t) => [t.number, t]));

export function isValidTableNumber(value: string): boolean {
  return TABLE_BY_NUMBER.has(value.trim());
}

export function getTableArea(tableNumber: string): TableArea | null {
  return TABLE_BY_NUMBER.get(tableNumber.trim())?.area ?? null;
}

/** "Masa 104 · Salon" — masa yoksa boş string döner. */
export function formatTableLabel(tableNumber: string): string {
  const trimmed = tableNumber.trim();
  if (!trimmed) return "";
  const area = getTableArea(trimmed);
  return area ? `Masa ${trimmed} · ${TABLE_AREA_LABELS[area]}` : `Masa ${trimmed}`;
}
