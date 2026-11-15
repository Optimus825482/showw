"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Layers,
  ListOrdered,
} from "lucide-react";
import { AdisyonCard } from "@/components/AdisyonCard";
import { AppShell } from "@/components/AppShell";
import { KitchenGroupedBoard } from "@/components/KitchenGroupedBoard";
import { PrintableReceipt } from "@/components/PrintableReceipt";
import { useAdisyonStream } from "@/hooks/useAdisyonStream";
import type { Adisyon } from "@/types/adisyon";

export default function CokluEkranPage() {
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

  const [receiptAdisyon, setReceiptAdisyon] = useState<Adisyon | null>(null);

  const waitingOrPreparing = useMemo(
    () =>
      adisyons.filter(
        (a) => a.status === "BEKLIYOR" || a.status === "HAZIRLANIYOR"
      ),
    [adisyons]
  );

  const readyAdisyons = useMemo(
    () => adisyons.filter((a) => a.status === "HAZIR"),
    [adisyons]
  );

  const deliveredAdisyons = useMemo(
    () => adisyons.filter((a) => a.status === "TESLIM_EDILDI"),
    [adisyons]
  );

  const activeTotal = waitingOrPreparing.length + readyAdisyons.length;

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
        activeQueueCount={activeTotal}
        readyCount={readyAdisyons.length}
        hasActivePrinter={hasActivePrinter}
        printerConfig={printerConfig}
        dbMode={dbMode}
        dbNotice={dbNotice}
        onRefresh={() => void refresh()}
      >
        <div className="space-y-4">
          {/* Header with quick multi-device links */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="fluid-page-title font-bold text-slate-900">
                Çoklu Ekran — Canlı İstasyon Görünümü
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-500">
                Mutfak gruplaması, sıradaki adisyonlar ve teslimata hazır
                siparişler tek ekranda (2.5 sn canlı senkronizasyon).
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <span>Sipariş Ekranı</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                href="/mutfak"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <span>Mutfak KDS</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link
                href="/bekleyenler"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                <span>Kuyruk Ekranı</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
              Canlı ekranlar senkronize ediliyor...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Column 1: Grouped Products (Mutfak Toplu Hazırlık) */}
              <section className="lg:col-span-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5">
                  <h3 className="text-sm font-bold text-sky-950 flex items-center gap-2">
                    <Layers
                      className="h-4 w-4 text-sky-600"
                      aria-hidden="true"
                    />
                    <span>1. Benzer Ürün Grupları</span>
                  </h3>
                  <span className="rounded-lg bg-sky-600 px-2 py-0.5 text-xs font-bold text-white">
                    {groupedBatches.length}
                  </span>
                </div>
                <KitchenGroupedBoard
                  batches={groupedBatches}
                  onBatchStatusChange={batchUpdateItems}
                  compact={true}
                />
              </section>

              {/* Column 2: Pending & Preparing Adisyons in Queue Order */}
              <section className="lg:col-span-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
                  <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                    <Clock
                      className="h-4 w-4 text-amber-600"
                      aria-hidden="true"
                    />
                    <span>2. Hazırlanan Sıra</span>
                  </h3>
                  <span className="rounded-lg bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                    {waitingOrPreparing.length}
                  </span>
                </div>

                {waitingOrPreparing.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs font-bold text-slate-500">
                    <ListOrdered
                      className="mx-auto h-7 w-7 text-slate-300 mb-1.5"
                      aria-hidden="true"
                    />
                    Bekleyen adisyon bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {waitingOrPreparing.map((adisyon) => (
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
              </section>

              {/* Column 3: Ready for Pickup / Delivery */}
              <section className="lg:col-span-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                  <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                    <CheckCircle2
                      className="h-4 w-4 text-emerald-600"
                      aria-hidden="true"
                    />
                    <span>3. Toplandı / Teslim Bekliyor</span>
                  </h3>
                  <span className="rounded-lg bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                    {readyAdisyons.length}
                  </span>
                </div>

                {readyAdisyons.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs font-bold text-slate-500">
                    Teslimata hazır adisyon yok.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {readyAdisyons.map((adisyon) => (
                      <AdisyonCard
                        key={adisyon.id}
                        adisyon={adisyon}
                        nowMs={nowMs}
                        allowItemToggle={false}
                        showPrintButton={hasActivePrinter}
                        compact={true}
                        onUpdateStatus={updateAdisyonStatus}
                        onUpdateItemStatus={updateItemStatus}
                        onPrint={handlePrint}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {!loading && deliveredAdisyons.length > 0 && (
            <section className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="fluid-section-title font-bold text-slate-900 flex items-center gap-2">
                  <CheckCheck
                    className="h-5 w-5 text-emerald-600"
                    aria-hidden="true"
                  />
                  <span>Son Teslim Edilenler ({deliveredAdisyons.length})</span>
                </h3>
                <Link
                  href="/bekleyenler"
                  className="text-xs font-bold text-sky-700 hover:underline"
                >
                  Tümünü Gör
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {deliveredAdisyons.slice(0, 6).map((adisyon) => (
                  <AdisyonCard
                    key={adisyon.id}
                    adisyon={adisyon}
                    nowMs={nowMs}
                    allowItemToggle={false}
                    showPrintButton={hasActivePrinter}
                    compact={true}
                    onUpdateStatus={updateAdisyonStatus}
                    onUpdateItemStatus={updateItemStatus}
                    onPrint={handlePrint}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </AppShell>

      <PrintableReceipt adisyon={receiptAdisyon} />
    </>
  );
}
