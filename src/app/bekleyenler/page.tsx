"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckCheck, ClipboardList, PlusCircle, Search } from "lucide-react";
import { AdisyonCard } from "@/components/AdisyonCard";
import { AppShell } from "@/components/AppShell";
import { PrintableReceipt } from "@/components/PrintableReceipt";
import { useAdisyonStream } from "@/hooks/useAdisyonStream";
import type { Adisyon } from "@/types/adisyon";

type QueueTab = "AKTIF" | "HAZIR" | "TAMAMLANAN" | "TUMU";

export default function BekleyenlerPage() {
  const {
    adisyons,
    printerConfig,
    hasActivePrinter,
    dbMode,
    dbNotice,
    loading,
    nowMs,
    refresh,
    updateAdisyonStatus,
    updateItemStatus,
    markPrinted,
  } = useAdisyonStream(2500);

  const [tab, setTab] = useState<QueueTab>("AKTIF");
  const [search, setSearch] = useState("");
  const [receiptAdisyon, setReceiptAdisyon] = useState<Adisyon | null>(null);

  const stats = useMemo(() => {
    let waiting = 0;
    let preparing = 0;
    let ready = 0;
    let delivered = 0;
    for (const a of adisyons) {
      if (a.status === "BEKLIYOR") waiting += 1;
      else if (a.status === "HAZIRLANIYOR") preparing += 1;
      else if (a.status === "HAZIR") ready += 1;
      else if (a.status === "TESLIM_EDILDI") delivered += 1;
    }
    return {
      waiting,
      preparing,
      ready,
      delivered,
      activeTotal: waiting + preparing + ready,
    };
  }, [adisyons]);

  const filteredAdisyons = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr");
    return adisyons.filter((a) => {
      if (tab === "AKTIF") {
        if (a.status === "TESLIM_EDILDI" || a.status === "IPTAL") return false;
      } else if (tab === "HAZIR") {
        if (a.status !== "HAZIR") return false;
      } else if (tab === "TAMAMLANAN") {
        if (a.status !== "TESLIM_EDILDI") return false;
      }

      if (!q) return true;
      const inHeader =
        String(a.queueNumber).includes(q) ||
        a.roomNumber.toLocaleLowerCase("tr").includes(q) ||
        a.guestName.toLocaleLowerCase("tr").includes(q);
      const inItems = a.items.some((i) =>
        i.productName.toLocaleLowerCase("tr").includes(q)
      );
      return inHeader || inItems;
    });
  }, [adisyons, tab, search]);

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
        activeQueueCount={stats.activeTotal}
        readyCount={stats.ready}
        hasActivePrinter={hasActivePrinter}
        printerConfig={printerConfig}
        dbMode={dbMode}
        dbNotice={dbNotice}
        onRefresh={() => void refresh()}
      >
        <div className="space-y-4">
          {/* Page Header & KPI Cards */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="fluid-page-title font-extrabold text-slate-900">
                Bekleyen Adisyonlar &amp; Sıra Takibi
              </h2>
              <p className="text-xs sm:text-sm font-medium text-slate-500">
                Toplanan veya teslim edilen adisyonları işaretleyerek kuyruktan
                çıkarın.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs sm:text-sm font-extrabold text-white shadow-sm hover:bg-sky-700"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>Yeni Adisyon Başlat</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
              <div className="text-xs font-bold text-amber-800">Bekliyor</div>
              <div className="mt-0.5 text-2xl font-black text-amber-950">
                {stats.waiting}
              </div>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/70 px-4 py-3">
              <div className="text-xs font-bold text-sky-800">Hazırlanıyor</div>
              <div className="mt-0.5 text-2xl font-black text-sky-950">
                {stats.preparing}
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
              <div className="text-xs font-bold text-emerald-800">
                Toplandı / Hazır
              </div>
              <div className="mt-0.5 text-2xl font-black text-emerald-950">
                {stats.ready}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-xs font-bold text-slate-500">
                Teslim Edilen
              </div>
              <div className="mt-0.5 text-2xl font-black text-slate-800">
                {stats.delivered}
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTab("AKTIF")}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  tab === "AKTIF"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Aktif Kuyruk ({stats.activeTotal})
              </button>
              <button
                type="button"
                onClick={() => setTab("HAZIR")}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  tab === "HAZIR"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Toplandı / Hazır ({stats.ready})
              </button>
              <button
                type="button"
                onClick={() => setTab("TAMAMLANAN")}
                className={`inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  tab === "TAMAMLANAN"
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Teslim Edilenler ({stats.delivered})</span>
              </button>
              <button
                type="button"
                onClick={() => setTab("TUMU")}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  tab === "TUMU"
                    ? "bg-slate-700 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                Tümü ({adisyons.length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Sıra no, oda no, misafir..."
                aria-label="Kuyrukta ara"
                className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Adisyons Grid */}
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
              Adisyon kuyruğu yükleniyor...
            </div>
          ) : filteredAdisyons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <ClipboardList
                className="mx-auto h-10 w-10 text-slate-300 mb-2"
                aria-hidden="true"
              />
              <p className="text-sm font-bold text-slate-700">
                {tab === "AKTIF"
                  ? "Kuyrukta bekleyen adisyon yok."
                  : "Bu görünümde gösterilecek adisyon bulunamadı."}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Yeni adisyon eklendiğinde bu ekran otomatik güncellenir.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAdisyons.map((adisyon) => (
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

          {/* Aktif kuyruk sekmesindeyken de son teslim edilenleri hemen altta göster */}
          {tab === "AKTIF" && stats.delivered > 0 && (
            <section className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="fluid-section-title font-extrabold text-slate-900 flex items-center gap-2">
                  <CheckCheck
                    className="h-5 w-5 text-emerald-600"
                    aria-hidden="true"
                  />
                  <span>Son Teslim Edilen Adisyonlar ({stats.delivered})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setTab("TAMAMLANAN")}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Tüm Teslim Edilenleri Gör
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {adisyons
                  .filter((a) => a.status === "TESLIM_EDILDI")
                  .slice(0, 6)
                  .map((adisyon) => (
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
