"use client";

import { Check, Flame, Layers, Undo2 } from "lucide-react";
import type { GroupedProductBatch, ItemStatus } from "@/types/adisyon";

interface KitchenGroupedBoardProps {
  batches: GroupedProductBatch[];
  onBatchStatusChange: (itemIds: number[], status: ItemStatus) => Promise<void>;
  compact?: boolean;
}

export function KitchenGroupedBoard({
  batches,
  onBatchStatusChange,
  compact = false,
}: KitchenGroupedBoardProps) {
  if (batches.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
        <Layers
          className="mx-auto h-9 w-9 text-slate-300 mb-2"
          aria-hidden="true"
        />
        <p className="text-sm font-bold text-slate-700">
          Mutfakta gruplanacak aktif ürün bulunmuyor.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Yeni adisyonlar geldikçe aynı ürünler ve varyasyonları burada otomatik
          olarak toplanır.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-3 ${
        compact
          ? "grid-cols-1"
          : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
      }`}
    >
      {batches.map((batch) => {
        const needsWork = batch.pendingQuantity + batch.preparingQuantity;
        const allReady = needsWork === 0 && batch.readyQuantity > 0;

        return (
          <section
            key={`${batch.productNo}-${batch.productName}`}
            className={`rounded-2xl border bg-white shadow-sm flex flex-col overflow-hidden ${
              allReady
                ? "border-emerald-300 bg-emerald-50/20"
                : "border-slate-200"
            }`}
          >
            {/* Batch Header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-md bg-slate-200 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">
                    #{batch.productNo}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 truncate">
                    {batch.category}
                  </span>
                </div>
                <h3 className="mt-0.5 text-base font-extrabold text-slate-900">
                  {batch.productName}
                </h3>
              </div>

              <div className="shrink-0 text-right">
                <div className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-3 py-1 text-base font-black text-white shadow-sm">
                  {batch.totalQuantity} Adet
                </div>
                <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] font-bold">
                  {batch.pendingQuantity > 0 && (
                    <span className="text-amber-700">
                      {batch.pendingQuantity} bekliyor
                    </span>
                  )}
                  {batch.preparingQuantity > 0 && (
                    <span className="text-sky-700">
                      {batch.preparingQuantity} ocakta
                    </span>
                  )}
                  {batch.readyQuantity > 0 && (
                    <span className="text-emerald-700">
                      {batch.readyQuantity} hazır
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Variation Breakdowns */}
            <div className="divide-y divide-slate-100 px-4 py-1 flex-1">
              {batch.breakdowns.map((bd) => {
                const waitingIds = bd.orders
                  .filter((o) => o.status === "BEKLIYOR")
                  .map((o) => o.itemId);
                const preparingIds = bd.orders
                  .filter((o) => o.status === "HAZIRLANIYOR")
                  .map((o) => o.itemId);
                const readyIds = bd.orders
                  .filter((o) => o.status === "HAZIR")
                  .map((o) => o.itemId);
                const unfinishedIds = bd.orders
                  .filter(
                    (o) => o.status === "BEKLIYOR" || o.status === "HAZIRLANIYOR"
                  )
                  .map((o) => o.itemId);
                const isBreakdownReady = unfinishedIds.length === 0;

                return (
                  <div key={bd.variationKey} className="py-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="inline-flex items-center rounded-lg bg-slate-900 px-2 py-0.5 text-xs font-extrabold text-white">
                          {bd.totalQuantity}x
                        </span>
                        <span className="text-sm font-extrabold text-slate-900">
                          {bd.variationKey}
                        </span>
                      </div>

                      {!isBreakdownReady ? (
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {preparingIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                void onBatchStatusChange(
                                  preparingIds,
                                  "BEKLIYOR"
                                )
                              }
                              title="Ocağa alınanları Bekliyor durumuna geri al"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95"
                            >
                              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Geri Al</span>
                            </button>
                          )}
                          {waitingIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                void onBatchStatusChange(
                                  waitingIds,
                                  "HAZIRLANIYOR"
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 hover:bg-sky-100 active:scale-95"
                            >
                              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Ocağa Al</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              void onBatchStatusChange(unfinishedIds, "HAZIR")
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95"
                          >
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Hazır</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Tamam</span>
                          </span>
                          {readyIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                void onBatchStatusChange(
                                  readyIds,
                                  "HAZIRLANIYOR"
                                )
                              }
                              title="Hazır yapılanları Ocakta durumuna geri al"
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-95"
                            >
                              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Geri Al</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Queue numbers & room tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {bd.orders.map((ord) => (
                        <span
                          key={ord.itemId}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold ${
                            ord.status === "HAZIR"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : ord.status === "HAZIRLANIYOR"
                              ? "border-sky-200 bg-sky-50 text-sky-800"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }`}
                        >
                          <span>#{ord.queueNumber}</span>
                          {ord.roomNumber && (
                            <span className="text-slate-500">
                              (Oda {ord.roomNumber})
                            </span>
                          )}
                          {ord.quantity > 1 && <span>×{ord.quantity}</span>}
                          {ord.itemNote && (
                            <span className="text-amber-700">
                              [{ord.itemNote}]
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
