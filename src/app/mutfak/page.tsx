"use client";

import { useMemo, useState } from "react";
import { ChefHat, Layers, ListOrdered } from "lucide-react";
import { AdisyonCard } from "@/components/AdisyonCard";
import { AppShell } from "@/components/AppShell";
import { KitchenGroupedBoard } from "@/components/KitchenGroupedBoard";
import { PrintableReceipt } from "@/components/PrintableReceipt";
import { useAdisyonStream } from "@/hooks/useAdisyonStream";
import type { Adisyon } from "@/types/adisyon";

type KitchenViewMode = "SPLIT" | "GROUPED" | "QUEUE";

export default function MutfakPage() {
  const {
    adisyons,
    groupedBatches,
    printerConfig,
    hasActivePrinter,
    dbMode,
    dbNotice,
    loading,
    nowMs,
    refresh,
    updateAdisyonStatus,
    updateItemStatus,
    batchUpdateItems,
    markPrinted,
  } = useAdisyonStream(2500);

  const [viewMode, setViewMode] = useState<KitchenViewMode>("SPLIT");
  const [receiptAdisyon, setReceiptAdisyon] = useState<Adisyon | null>(null);

  const activeAdisyons = useMemo(
    () =>
      adisyons.filter(
        (a) => a.status !== "TESLIM_EDILDI" && a.status !== "IPTAL"
      ),
    [adisyons]
  );

  const readyCount = useMemo(
    () => adisyons.filter((a) => a.status === "HAZIR").length,
    [adisyons]
  );

  const totalPendingPortions = useMemo(
    () =>
      groupedBatches.reduce(
        (sum, b) => sum + b.pendingQuantity + b.preparingQuantity,
        0
      ),
    [groupedBatches]
  );

  const handlePrint = (adisyon: Adisyon) => {
    setReceiptAdisyon(adisyon);
    void markPrinted(adisyon.id);
    window.setTimeout(() => {
      window.print();
    }, 120);
  };

  return (
    <>
      <AppShell
        activeQueueCount={activeAdisyons.length}
        readyCount={readyCount}
        hasActivePrinter={hasActivePrinter}
        printerConfig={printerConfig}
        dbMode={dbMode}
        dbNotice={dbNotice}
        onRefresh={() => void refresh()}
      >
        <div className="space-y-4">
          {/* Header & View Mode Controls */}
          <div className="surface p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <ChefHat className="h-6 w-6" aria-hidden="true" />
              </div>
              <div>
                <h2 className="fluid-page-title font-bold text-slate-900">
                  Mutfak Ekranı (KDS)
                </h2>
                <p className="text-xs sm:text-sm font-medium text-slate-500">
                  Aktif {activeAdisyons.length} adisyon • Hazırlanacak{" "}
                  <strong className="text-slate-800">
                    {totalPendingPortions} porsiyon
                  </strong>
                </p>
              </div>
            </div>

            <div role="group" className="seg flex-wrap">
              <button
                type="button"
                onClick={() => setViewMode("SPLIT")}
                aria-pressed={viewMode === "SPLIT"}
                className="seg-btn"
              >
                Gruplama + Sıra
              </button>
              <button
                type="button"
                onClick={() => setViewMode("GROUPED")}
                aria-pressed={viewMode === "GROUPED"}
                className="seg-btn"
              >
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Benzer Ürün Grupları ({groupedBatches.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("QUEUE")}
                aria-pressed={viewMode === "QUEUE"}
                className="seg-btn"
              >
                <ListOrdered className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Adisyon Sırası ({activeAdisyons.length})</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
              Mutfak verileri yükleniyor...
            </div>
          ) : viewMode === "SPLIT" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Grouped Similar Products */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="fluid-section-title font-bold text-slate-900 flex items-center gap-2">
                    <Layers
                      className="h-5 w-5 text-sky-600"
                      aria-hidden="true"
                    />
                    <span>Benzer Ürün Gruplaması</span>
                  </h3>
                  <span className="rounded-lg bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                    {groupedBatches.length} Çeşit
                  </span>
                </div>
                <KitchenGroupedBoard
                  batches={groupedBatches}
                  onBatchStatusChange={batchUpdateItems}
                  compact={true}
                />
              </div>

              {/* Queue Order Tickets */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="fluid-section-title font-bold text-slate-900 flex items-center gap-2">
                    <ListOrdered
                      className="h-5 w-5 text-amber-600"
                      aria-hidden="true"
                    />
                    <span>Sıraya Göre Adisyon İçerikleri</span>
                  </h3>
                  <span className="rounded-lg bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                    {activeAdisyons.length} Adisyon
                  </span>
                </div>

                {activeAdisyons.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-600">
                    Sırada bekleyen adisyon yok.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {activeAdisyons.map((adisyon) => (
                      <AdisyonCard
                        key={adisyon.id}
                        adisyon={adisyon}
                        nowMs={nowMs}
                        allowItemToggle={true}
                        showPrintButton={hasActivePrinter}
                        compact={true}
                        onUpdateStatus={updateAdisyonStatus}
                        onUpdateItemStatus={updateItemStatus}
                        onPrint={handlePrint}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : viewMode === "GROUPED" ? (
            <KitchenGroupedBoard
              batches={groupedBatches}
              onBatchStatusChange={batchUpdateItems}
              compact={false}
            />
          ) : activeAdisyons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-600">
              Sırada bekleyen adisyon yok.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeAdisyons.map((adisyon) => (
                <AdisyonCard
                  key={adisyon.id}
                  adisyon={adisyon}
                  nowMs={nowMs}
                  allowItemToggle={true}
                  showPrintButton={hasActivePrinter}
                  onUpdateStatus={updateAdisyonStatus}
                  onUpdateItemStatus={updateItemStatus}
                  onPrint={handlePrint}
                />
              ))}
            </div>
          )}
        </div>
      </AppShell>

      <PrintableReceipt adisyon={receiptAdisyon} />
    </>
  );
}
