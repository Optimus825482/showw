"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, Loader2, Plus, Undo2, X } from "lucide-react";
import {
  ADISYON_STATUS_META,
  ITEM_STATUS_META,
  formatClockTime,
} from "@/lib/formatters";
import { ITEM_STATUS_ORDER } from "@/lib/status";
import { formatTableLabel } from "@/lib/tables";
import type { Adisyon, ItemStatus } from "@/types/adisyon";

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
  /**
   * Verilen kalemleri tek seferde yeni duruma alır (teslim edilmişler dahil).
   * Başarılıysa true döner.
   */
  onChangeItemStatus: (
    itemIds: number[],
    status: ItemStatus
  ) => Promise<boolean>;
}

interface UndoRecord {
  text: string;
  entries: Array<{ id: number; prev: ItemStatus }>;
}

const UNDO_MS = 10_000;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2";

/** Durum → düğme rengi (globals.css içindeki .btn[data-tone]) */
const STATUS_TONE: Record<ItemStatus, string> = {
  BEKLIYOR: "waiting",
  HAZIRLANIYOR: "cooking",
  HAZIR: "ready",
  TESLIM_EDILDI: "served",
};

export function TableDetailDialog({
  tableNumber,
  adisyons,
  onClose,
  onStartMove,
  onAddOrder,
  onChangeItemStatus,
}: TableDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undo, setUndo] = useState<UndoRecord | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (tableNumber && !dialog.open) {
      dialog.showModal();
    } else if (!tableNumber && dialog.open) {
      dialog.close();
    }
  }, [tableNumber]);

  // Başka masaya geçildiğinde / kapanınca önceki masanın izleri kalmasın
  useEffect(() => {
    setSelected(new Set());
    setError(null);
    setUndo(null);
  }, [tableNumber]);

  useEffect(() => {
    if (!undo) return;
    const t = window.setTimeout(() => setUndo(null), UNDO_MS);
    return () => window.clearTimeout(t);
  }, [undo]);

  const allItems = useMemo(() => adisyons.flatMap((a) => a.items), [adisyons]);
  const openItems = useMemo(
    () => allItems.filter((i) => i.status !== "TESLIM_EDILDI"),
    [allItems]
  );

  // Ekranda artık olmayan (ör. başka cihazdan teslim edilmiş) kalemler seçimde kalmasın
  const selectedIds = useMemo(
    () => allItems.filter((i) => selected.has(i.id)).map((i) => i.id),
    [allItems, selected]
  );
  const hasSelection = selectedIds.length > 0;
  const bulkTargetIds = hasSelection
    ? selectedIds
    : openItems.map((i) => i.id);

  const totalPortions = openItems.reduce((sum, i) => sum + i.quantity, 0);

  const toggleSelected = (itemId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const applyStatus = async (itemIds: number[], status: ItemStatus) => {
    if (busy) return;
    const idSet = new Set(itemIds);
    const entries = allItems
      .filter((i) => idSet.has(i.id) && i.status !== status)
      .map((i) => ({ id: i.id, prev: i.status }));
    if (entries.length === 0) return;

    setBusy(true);
    setError(null);
    setUndo(null);
    const ok = await onChangeItemStatus(
      entries.map((e) => e.id),
      status
    );
    setBusy(false);

    if (!ok) {
      setError("Durum kaydedilemedi. Bağlantıyı kontrol edip tekrar deneyin.");
      return;
    }
    setSelected(new Set());
    setUndo({
      entries,
      text: `${entries.length} ürün “${ITEM_STATUS_META[status].label}” yapıldı.`,
    });
  };

  const runUndo = async () => {
    if (!undo || busy) return;
    const record = undo;
    setBusy(true);
    setError(null);
    setUndo(null);
    let allOk = true;
    for (const status of ITEM_STATUS_ORDER) {
      const ids = record.entries
        .filter((e) => e.prev === status)
        .map((e) => e.id);
      if (ids.length === 0) continue;
      const ok = await onChangeItemStatus(ids, status);
      if (!ok) allOk = false;
    }
    setBusy(false);
    if (!allOk) setError("Geri alma tamamlanamadı. Durumları kontrol edin.");
  };

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
          <h2 id={titleId} className="text-lg font-extrabold text-slate-900">
            {tableNumber ? formatTableLabel(tableNumber) : ""}
          </h2>
          <p className="text-xs font-bold text-amber-900">
            {adisyons.length} açık adisyon · {totalPortions} porsiyon bekliyor
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

      {/* Toplu işlem: seçim yoksa masadaki tüm ürünler, varsa yalnızca seçilenler */}
      {allItems.length > 0 && (
        <div className="border-b border-slate-200 bg-white px-4 py-2.5 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-slate-700">
              {hasSelection ? (
                <>
                  <span className="text-sky-700">
                    Seçili {selectedIds.length} ürün
                  </span>{" "}
                  için durum:
                </>
              ) : (
                <>Masadaki tüm ürünler ({openItems.length}) için durum:</>
              )}
            </p>
            <div className="flex items-center gap-2">
              {busy && (
                <Loader2
                  className="h-4 w-4 text-slate-500 motion-safe:animate-spin"
                  aria-label="Kaydediliyor"
                />
              )}
              {hasSelection && (
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className={`rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 ${focusRing}`}
                >
                  Seçimi temizle
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {ITEM_STATUS_ORDER.map((status) => (
              <button
                key={status}
                type="button"
                disabled={busy || bulkTargetIds.length === 0}
                onClick={() => void applyStatus(bulkTargetIds, status)}
                data-tone={STATUS_TONE[status]}
                className="btn btn-block px-1"
              >
                {status === "TESLIM_EDILDI"
                  ? "Teslim Et"
                  : ITEM_STATUS_META[status].label}
              </button>
            ))}
          </div>
          <p className="text-[11px] font-medium text-slate-500">
            Yalnızca bazı ürünler için: ürün adına dokunup işaretleyin, sonra
            yukarıdan durumu seçin.
          </p>
        </div>
      )}

      {(undo || error) && (
        <div className="px-4 pt-3 space-y-2">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800"
            >
              {error}
            </div>
          )}
          {undo && (
            <div
              role="status"
              className="flex items-center justify-between gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"
            >
              <span>{undo.text}</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void runUndo()}
                className="btn btn-sm shrink-0"
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Geri Al</span>
              </button>
            </div>
          )}
        </div>
      )}

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
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 text-xs font-extrabold text-white">
                      SIRA #{adisyon.queueNumber}
                    </span>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${meta.badgeClass}`}
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
                <ul className="mt-2 divide-y divide-slate-100">
                  {adisyon.items.map((item) => {
                    const checked = selected.has(item.id);
                    const delivered = item.status === "TESLIM_EDILDI";
                    return (
                      <li key={item.id} className="py-2 space-y-1.5">
                        <label className="flex min-h-10 cursor-pointer items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelected(item.id)}
                            className="mt-0.5 h-5 w-5 shrink-0 rounded accent-sky-600"
                          />
                          <span className="min-w-0 text-sm">
                            <span
                              className={`font-bold ${
                                delivered
                                  ? "text-slate-400 line-through"
                                  : "text-slate-900"
                              }`}
                            >
                              <span className="font-extrabold tabular-nums">
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
                            {item.itemNote && (
                              <span className="block text-xs font-semibold text-amber-800">
                                Not: {item.itemNote}
                              </span>
                            )}
                          </span>
                        </label>
                        <div
                          role="group"
                          aria-label={`${item.productName} durumu`}
                          className="grid grid-cols-4 gap-1.5"
                        >
                          {ITEM_STATUS_ORDER.map((status) => {
                            const active = item.status === status;
                            return (
                              <button
                                key={status}
                                type="button"
                                aria-pressed={active}
                                disabled={busy}
                                onClick={() =>
                                  void applyStatus([item.id], status)
                                }
                                data-tone={active ? STATUS_TONE[status] : undefined}
                                className="btn btn-sm btn-block px-1"
                              >
                                {ITEM_STATUS_META[status].label}
                              </button>
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
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
          className="btn btn-lg btn-move"
        >
          <ArrowRightLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Masayı Taşı</span>
        </button>
        <button
          type="button"
          disabled={!tableNumber}
          onClick={() => tableNumber && onAddOrder(tableNumber)}
          className="btn btn-lg btn-outline"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Ek Sipariş Al</span>
        </button>
      </div>
    </dialog>
  );
}
