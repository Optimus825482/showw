"use client";

import { useEffect, useId, useRef } from "react";
import { ArrowRightLeft, Plus, X } from "lucide-react";
import {
  ADISYON_STATUS_META,
  ITEM_STATUS_META,
  formatClockTime,
} from "@/lib/formatters";
import { formatTableLabel } from "@/lib/tables";
import type { Adisyon } from "@/types/adisyon";

interface TableDetailDialogProps {
  /** Görüntülenen masa; null ise diyalog kapalıdır */
  tableNumber: string | null;
  /** Bu masadaki açık (teslim edilmemiş) adisyonlar */
  adisyons: Adisyon[];
  onClose: () => void;
  /** "Masayı Taşı": hedef masa seçimine geçer */
  onStartMove: (tableNumber: string) => void;
  /** "Ek Sipariş Al": aynı masaya yeni adisyon açar */
  onAddOrder: (tableNumber: string) => void;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2";

export function TableDetailDialog({
  tableNumber,
  adisyons,
  onClose,
  onStartMove,
  onAddOrder,
}: TableDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (tableNumber && !dialog.open) {
      dialog.showModal();
    } else if (!tableNumber && dialog.open) {
      dialog.close();
    }
  }, [tableNumber]);

  const totalPortions = adisyons.reduce(
    (sum, a) => sum + a.items.reduce((s, i) => s + i.quantity, 0),
    0
  );

  return (
    <dialog
      ref={dialogRef}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...({ closedby: "any" } as any)}
      aria-labelledby={titleId}
      onClose={onClose}
      className="open:flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-amber-50 px-4 py-3">
        <div className="min-w-0">
          <h2 id={titleId} className="text-lg font-black text-slate-900">
            {tableNumber ? formatTableLabel(tableNumber) : ""}
          </h2>
          <p className="text-xs font-bold text-amber-900">
            {adisyons.length} açık adisyon · {totalPortions} porsiyon
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 ${focusRing}`}
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {adisyons.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-600">
            Bu masada açık adisyon kalmadı.
          </p>
        ) : (
          adisyons.map((adisyon) => {
            const meta = ADISYON_STATUS_META[adisyon.status];
            const extra = [
              adisyon.roomNumber ? `Oda ${adisyon.roomNumber}` : "",
              adisyon.guestName,
            ]
              .filter(Boolean)
              .join(" • ");
            return (
              <article
                key={adisyon.id}
                className={`rounded-xl border border-slate-200 border-l-4 bg-white p-3 ${meta.borderClass}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-black text-white">
                      SIRA #{adisyon.queueNumber}
                    </span>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-extrabold ${meta.badgeClass}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {formatClockTime(adisyon.createdAt)}
                  </span>
                </div>
                {extra && (
                  <p className="mt-1 text-xs font-semibold text-slate-600">
                    {extra}
                  </p>
                )}
                <ul className="mt-2 space-y-1">
                  {adisyon.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-2 text-sm"
                    >
                      <span className="min-w-0 font-bold text-slate-900">
                        <span className="font-black tabular-nums">
                          {item.quantity}×
                        </span>{" "}
                        {item.productName}
                        {item.variations.length > 0 && (
                          <span className="font-semibold text-slate-500">
                            {" "}
                            ({item.variations.join(", ")})
                          </span>
                        )}
                      </span>
                      <span
                        className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-extrabold ${ITEM_STATUS_META[item.status].badgeClass}`}
                      >
                        {ITEM_STATUS_META[item.status].label}
                      </span>
                    </li>
                  ))}
                </ul>
                {adisyon.note && (
                  <p className="mt-1.5 text-xs font-semibold text-amber-800">
                    Not: {adisyon.note}
                  </p>
                )}
              </article>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 border-t border-slate-200 bg-slate-50 p-3">
        <button
          type="button"
          disabled={!tableNumber || adisyons.length === 0}
          onClick={() => tableNumber && onStartMove(tableNumber)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 ${focusRing}`}
        >
          <ArrowRightLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Masayı Taşı</span>
        </button>
        <button
          type="button"
          disabled={!tableNumber}
          onClick={() => tableNumber && onAddOrder(tableNumber)}
          className={`inline-flex items-center justify-center gap-2 rounded-xl border border-sky-600 bg-white px-4 py-3 text-sm font-extrabold text-sky-700 hover:bg-sky-50 ${focusRing}`}
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Ek Sipariş Al</span>
        </button>
      </div>
    </dialog>
  );
}
