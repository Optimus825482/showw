"use client";

import { useState } from "react";
import { ArrowRightLeft, Check, Circle, Users } from "lucide-react";
import {
  ALL_TABLES,
  SALON_TABLES,
  TABLE_AREA_LABELS,
  TERAS_TABLES,
  type TableArea,
  type TableAreaFilter,
  type TableDef,
} from "@/lib/tables";

interface TableSelectorProps {
  /** Şu an seçili masa numarası (yoksa null) */
  selectedTable: string | null;
  /** Masa numarası → açık (aktif) adisyon sayısı */
  occupiedCounts: Record<string, number>;
  onSelect: (tableNumber: string) => void;
  /** Taşıma modunda kaynak masa (hedef seçimi bekleniyor); yoksa null */
  moveSource?: string | null;
  /** Dolu bir masa başka bir masanın üzerine sürüklenip bırakıldığında */
  onDragMove?: (fromTable: string, toTable: string) => void;
}

const AREA_TABLES: Record<TableArea, TableDef[]> = {
  SALON: SALON_TABLES,
  TERAS: TERAS_TABLES,
};

const AREAS: TableArea[] = ["SALON", "TERAS"];

const FILTERS: { value: TableAreaFilter; label: string; count: number }[] = [
  { value: "TUMU", label: "Tümü", count: ALL_TABLES.length },
  { value: "SALON", label: TABLE_AREA_LABELS.SALON, count: SALON_TABLES.length },
  { value: "TERAS", label: TABLE_AREA_LABELS.TERAS, count: TERAS_TABLES.length },
];

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2";

export function TableSelector({
  selectedTable,
  occupiedCounts,
  onSelect,
  moveSource = null,
  onDragMove,
}: TableSelectorProps) {
  const [areaFilter, setAreaFilter] = useState<TableAreaFilter>("TUMU");
  const [dragSource, setDragSource] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const moving = moveSource !== null;

  const occupiedInArea = (area: TableArea) =>
    AREA_TABLES[area].filter((t) => (occupiedCounts[t.number] ?? 0) > 0)
      .length;

  const visibleAreas = areaFilter === "TUMU" ? AREAS : [areaFilter];

  return (
    <section
      aria-labelledby="table-selector-title"
      className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-4"
    >
      {/* Başlık + bölge filtresi */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="table-selector-title"
            className="fluid-section-title font-extrabold text-slate-900"
          >
            {moving ? "Hedef Masayı Seçin" : "Masa Seçin"}
          </h2>
          <p className="text-xs font-medium text-slate-500">
            {moving
              ? `Masa ${moveSource} üzerindeki açık adisyonların taşınacağı masaya dokunun.`
              : "Adisyon açmak için boş masaya dokunun. Dolu masaya dokununca siparişleri görür, masayı taşıyabilirsiniz (sürükle-bırak da olur)."}
          </p>
        </div>

        <div
          role="group"
          aria-label="Bölge filtresi"
          className="flex w-full sm:w-auto rounded-xl bg-slate-100 p-1 gap-1"
        >
          {FILTERS.map((f) => {
            const active = areaFilter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                aria-pressed={active}
                onClick={() => setAreaFilter(f.value)}
                className={`flex-1 sm:flex-none rounded-lg px-3.5 py-2 text-sm font-extrabold transition-colors ${focusRing} ${
                  active
                    ? "bg-white text-sky-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                }`}
              >
                {f.label} ({f.count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Lejant + bölge doluluk özeti */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl bg-slate-50 px-3 py-2">
        <ul
          aria-label="Lejant"
          className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-600"
        >
          <li className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 bg-white">
              <Circle className="h-3 w-3 text-slate-400" aria-hidden="true" />
            </span>
            Boş
          </li>
          <li className="inline-flex items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-amber-400 bg-amber-100">
              <Users className="h-3 w-3 text-amber-700" aria-hidden="true" />
            </span>
            Dolu (açık adisyon var)
          </li>
        </ul>
        <p className="text-xs font-bold text-slate-600">
          {AREAS.map((area, i) => (
            <span key={area}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              {TABLE_AREA_LABELS[area]}:{" "}
              <span className="font-extrabold text-slate-900">
                {occupiedInArea(area)}/{AREA_TABLES[area].length}
              </span>{" "}
              dolu
            </span>
          ))}
        </p>
      </div>

      {/* Masa ızgaraları */}
      {visibleAreas.map((area) => {
        const tables = AREA_TABLES[area];
        const headingId = `table-area-${area.toLowerCase()}`;
        return (
          <div key={area} className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
              <h3
                id={headingId}
                className="text-sm font-extrabold uppercase tracking-wide text-slate-700"
              >
                {TABLE_AREA_LABELS[area]}
              </h3>
              <span className="text-xs font-bold text-slate-500">
                {occupiedInArea(area)} / {tables.length} dolu
              </span>
            </div>

            <ul aria-labelledby={headingId} className="table-grid">
              {tables.map((table) => {
                const openCount = occupiedCounts[table.number] ?? 0;
                const occupied = openCount > 0;
                const selected = !moving && selectedTable === table.number;
                const isMoveSource =
                  moveSource === table.number || dragSource === table.number;
                const isDropTarget =
                  dragSource !== null &&
                  dragOver === table.number &&
                  dragSource !== table.number;
                const canDrag = Boolean(onDragMove) && occupied && !moving;
                const areaLabel = TABLE_AREA_LABELS[table.area];
                const baseLabel = occupied
                  ? `Masa ${table.number}, ${areaLabel}, dolu, ${openCount} açık adisyon`
                  : `Masa ${table.number}, ${areaLabel}, boş`;
                const ariaLabel = !moving
                  ? baseLabel
                  : moveSource === table.number
                    ? `${baseLabel}, taşınan masa`
                    : `${baseLabel}, buraya taşı`;

                return (
                  <li key={table.number}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      aria-label={ariaLabel}
                      onClick={() => onSelect(table.number)}
                      draggable={canDrag}
                      onDragStart={(e) => {
                        if (!canDrag) return;
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", table.number);
                        setDragSource(table.number);
                      }}
                      onDragEnd={() => {
                        setDragSource(null);
                        setDragOver(null);
                      }}
                      onDragOver={(e) => {
                        if (!dragSource || dragSource === table.number) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        if (dragOver !== table.number) setDragOver(table.number);
                      }}
                      onDragLeave={() => {
                        if (dragOver === table.number) setDragOver(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = dragSource;
                        setDragSource(null);
                        setDragOver(null);
                        if (from && from !== table.number) {
                          onDragMove?.(from, table.number);
                        }
                      }}
                      className={`relative w-full min-h-[5.25rem] rounded-2xl border-2 px-2 py-2.5 flex flex-col items-center justify-center gap-1 transition-colors active:scale-[0.97] motion-reduce:active:scale-100 ${focusRing} ${
                        canDrag ? "cursor-grab active:cursor-grabbing" : ""
                      } ${
                        isDropTarget
                          ? "border-violet-600 bg-violet-100 text-violet-950 ring-4 ring-violet-300"
                          : isMoveSource
                            ? "border-violet-600 border-dashed bg-violet-50 text-violet-950 opacity-80"
                            : selected
                          ? "border-sky-600 bg-sky-600 text-white shadow-md"
                          : occupied
                            ? "border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100"
                            : "border-slate-200 bg-white text-slate-900 hover:border-sky-400 hover:bg-sky-50"
                      }`}
                    >
                      {(isMoveSource || isDropTarget) && (
                        <ArrowRightLeft
                          className="absolute right-1.5 top-1.5 h-4 w-4 text-violet-700"
                          aria-hidden="true"
                        />
                      )}
                      {selected && (
                        <Check
                          className="absolute right-1.5 top-1.5 h-4 w-4"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-2xl font-black leading-none tabular-nums">
                        {table.number}
                      </span>
                      {occupied ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                            selected
                              ? "bg-white/20 text-white"
                              : "bg-amber-200/80 text-amber-900"
                          }`}
                        >
                          <Users className="h-3 w-3" aria-hidden="true" />
                          Dolu · {openCount}
                        </span>
                      ) : (
                        <span
                          className={`text-[11px] font-bold ${
                            selected ? "text-sky-100" : "text-slate-400"
                          }`}
                        >
                          Boş
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
