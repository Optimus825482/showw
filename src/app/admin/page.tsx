"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowDownUp,
  BarChart3,
  Calendar,
  CheckCheck,
  ChefHat,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  ListOrdered,
  RotateCcw,
  ShieldAlert,
  Timer,
  X,
} from "lucide-react";
import { AdisyonCard } from "@/components/AdisyonCard";
import { AppShell } from "@/components/AppShell";
import { KitchenGroupedBoard } from "@/components/KitchenGroupedBoard";
import { PrintableReceipt } from "@/components/PrintableReceipt";
import { useAdisyonStream } from "@/hooks/useAdisyonStream";
import {
  ADISYON_STATUS_META,
  formatClockTimeWithSeconds,
  formatDateTime,
  formatLiveDuration,
} from "@/lib/formatters";
import { formatVariationKey } from "@/lib/grouping";
import {
  type AdisyonReportRow,
  type ProductReportRow,
  type ReportDrillLevel,
  type ReportStatusFilter,
  type ReportTimePreset,
  type SmartReportData,
  type SmartReportFilters,
  buildFilterSummaryText,
  buildSmartReportData,
  createDefaultSmartReportFilters,
  downloadSmartReportXlsx,
  toLocalDateInputValue,
} from "@/lib/report-export";
import type { Adisyon, AdisyonStatus, AuthUser } from "@/types/adisyon";

type AdminTab = "AKIS" | "MUTFAK" | "RAPORLAR";
type KitchenViewMode = "BOLUNMUS" | "GRUPLU" | "SIRA";
type FlowStatusFilter = "TUMU" | AdisyonStatus;
type SortDirection = "ascending" | "descending";
type ProductSortCol =
  | "productNo"
  | "productName"
  | "orderCount"
  | "totalQty"
  | "deliveredQty"
  | "pendingQty"
  | "sharePercent";
type AdisyonSortCol =
  | "queueNumber"
  | "guestHeader"
  | "createdAt"
  | "matchingPortions";

const TR_COLLATOR = new Intl.Collator("tr", {
  numeric: true,
  sensitivity: "base",
});

const ADMIN_TABS: ReadonlyArray<{
  key: AdminTab;
  id: string;
  label: string;
}> = [
  { key: "AKIS", id: "admin-tab-akis", label: "Anlık Akış" },
  { key: "MUTFAK", id: "admin-tab-mutfak", label: "Mutfak Durumu" },
  { key: "RAPORLAR", id: "admin-tab-raporlar", label: "Raporlar" },
];

const TIME_PRESETS: ReadonlyArray<{ key: ReportTimePreset; label: string }> = [
  { key: "BUGUN", label: "Bugün" },
  { key: "DUN", label: "Dün" },
  { key: "SON_7_GUN", label: "Son 7 Gün" },
  { key: "BU_AY", label: "Son 30 Gün" },
  { key: "TUMU", label: "Tümü" },
  { key: "OZEL_ARALIK", label: "Belirli Zaman Aralığı" },
];

const DRILL_LEVELS: ReadonlyArray<{
  key: ReportDrillLevel;
  label: string;
  shortDesc: string;
}> = [
  {
    key: "GENEL_GUNLUK",
    label: "1. Genel & Günlük Özet",
    shortDesc: "En genel: gün ve kategori dağılımı",
  },
  {
    key: "URUN_BAZLI",
    label: "2. Ürün & Varyasyon Bazlı",
    shortDesc: "Ürün adedi, teslim oranı ve varyasyonlar",
  },
  {
    key: "ADISYON_BAZLI",
    label: "3. Adisyon Bazlı",
    shortDesc: "Sıra, oda/misafir ve teslim süreleri",
  },
  {
    key: "KALEM_BAZLI",
    label: "4. Kalem & Varyasyon Detayı",
    shortDesc: "En özel: her sipariş satırı ayrı ayrı",
  },
  {
    key: "TUMU_BIRLIKTE",
    label: "Tüm Seviyeler Birlikte",
    shortDesc: "Genelden özele tam kapsamlı döküm",
  },
];

interface ReportSectionsRendererProps {
  report: SmartReportData;
  drillLevel: ReportDrillLevel;
  printable?: boolean;
  productSortCol: ProductSortCol;
  productSortDir: SortDirection;
  adisyonSortCol: AdisyonSortCol;
  adisyonSortDir: SortDirection;
  onSortProduct: (col: ProductSortCol) => void;
  onSortAdisyon: (col: AdisyonSortCol) => void;
  onSelectDay?: (dateKey: string) => void;
  onSelectCategory?: (category: string) => void;
  onSelectProduct?: (productKey: string) => void;
  onSelectAdisyonItems?: (queueNumber: number) => void;
}

function ReportSectionsRenderer({
  report,
  drillLevel,
  printable = false,
  productSortCol,
  productSortDir,
  adisyonSortCol,
  adisyonSortDir,
  onSortProduct,
  onSortAdisyon,
  onSelectDay,
  onSelectCategory,
  onSelectProduct,
  onSelectAdisyonItems,
}: ReportSectionsRendererProps) {
  const showGeneral =
    drillLevel === "GENEL_GUNLUK" || drillLevel === "TUMU_BIRLIKTE";
  const showProduct =
    drillLevel === "URUN_BAZLI" || drillLevel === "TUMU_BIRLIKTE";
  const showAdisyon =
    drillLevel === "ADISYON_BAZLI" || drillLevel === "TUMU_BIRLIKTE";
  const showItems =
    drillLevel === "KALEM_BAZLI" || drillLevel === "TUMU_BIRLIKTE";

  const sortedProducts = useMemo(() => {
    const dir = productSortDir === "ascending" ? 1 : -1;
    return [...report.productRows].sort((a, b) => {
      if (productSortCol === "productName") {
        return dir * TR_COLLATOR.compare(a.productName, b.productName);
      }
      return dir * (a[productSortCol] - b[productSortCol]);
    });
  }, [report.productRows, productSortCol, productSortDir]);

  const sortedAdisyons = useMemo(() => {
    const dir = adisyonSortDir === "ascending" ? 1 : -1;
    return [...report.adisyonRows].sort((a, b) => {
      if (adisyonSortCol === "guestHeader") {
        return dir * TR_COLLATOR.compare(a.guestHeader, b.guestHeader);
      }
      if (adisyonSortCol === "createdAt") {
        return (
          dir *
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        );
      }
      return dir * (a[adisyonSortCol] - b[adisyonSortCol]);
    });
  }, [report.adisyonRows, adisyonSortCol, adisyonSortDir]);

  const renderSortButton = <T extends string>(
    label: string,
    col: T,
    activeCol: T,
    activeDir: SortDirection,
    onClick: (c: T) => void
  ) => {
    if (printable) return <span>{label}</span>;
    const isActive = activeCol === col;
    return (
      <button
        type="button"
        onClick={() => onClick(col)}
        className="inline-flex w-full items-center gap-1 px-2.5 py-2 font-bold text-left hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-sky-600"
      >
        <span>{label}</span>
        <ArrowDownUp
          className={`h-3.5 w-3.5 shrink-0 ${
            isActive ? "text-sky-600" : "text-slate-400"
          }`}
          aria-hidden="true"
        />
        {isActive && (
          <span className="sr-only">
            ({activeDir === "ascending" ? "artan" : "azalan"})
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. GENEL VE GÜNLÜK ÖZET */}
      {showGeneral && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <section
            className={`${
              printable ? "" : "lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            } space-y-3`}
          >
            <h4 className="text-sm font-extrabold text-slate-900">
              Kategori Dağılımı ({report.categoryRows.length} Kategori)
            </h4>
            {report.categoryRows.length === 0 ? (
              <p className="text-xs text-slate-500">Seçili aralıkta veri yok.</p>
            ) : (
              <div className="space-y-2.5">
                {report.categoryRows.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs font-bold">
                      {!printable && onSelectCategory ? (
                        <button
                          type="button"
                          onClick={() => onSelectCategory(cat.category)}
                          className="text-slate-800 hover:text-sky-700 hover:underline text-left"
                        >
                          {cat.category}
                        </button>
                      ) : (
                        <span className="text-slate-800">{cat.category}</span>
                      )}
                      <span className="text-slate-600 shrink-0 tabular-nums">
                        {cat.portionCount} ad. ({cat.orderCount} adisyon • %
                        {cat.percent})
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sky-600"
                        style={{ width: `${cat.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section
            className={`${
              printable ? "" : "lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            } space-y-3 min-w-0`}
          >
            <h4 className="text-sm font-extrabold text-slate-900">
              Günlük Genel Özet ({report.dailyRows.length} Gün)
            </h4>
            <div
              tabIndex={printable ? undefined : 0}
              role={printable ? undefined : "region"}
              aria-labelledby={printable ? undefined : "caption-daily-report"}
              className={printable ? "" : "table-wrapper"}
            >
              <table className="text-left text-xs sm:text-sm min-w-[640px]">
                <caption
                  id={printable ? undefined : "caption-daily-report"}
                  className="sr-only"
                >
                  Günlük Adisyon ve Porsiyon Özeti
                </caption>
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-bold">
                      Gün / Tarih
                    </th>
                    <th scope="col" className="px-2.5 py-2.5 font-bold text-right">
                      Adisyon
                    </th>
                    <th scope="col" className="px-2.5 py-2.5 font-bold text-right">
                      Teslim
                    </th>
                    <th scope="col" className="px-2.5 py-2.5 font-bold text-right">
                      Aktif
                    </th>
                    <th scope="col" className="px-2.5 py-2.5 font-bold text-right">
                      Porsiyon
                    </th>
                    <th scope="col" className="px-2.5 py-2.5 font-bold">
                      Ort. Süre
                    </th>
                    <th scope="col" className="px-2.5 py-2.5 font-bold">
                      Öne Çıkan Ürün
                    </th>
                    {!printable && onSelectDay && (
                      <th scope="col" className="px-2.5 py-2.5 font-bold text-right">
                        Daralt
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {report.dailyRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={printable ? 7 : 8}
                        className="py-6 text-center text-slate-500 font-semibold"
                      >
                        Seçili kriterlerde günlük kayıt bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    report.dailyRows.map((d) => (
                      <tr key={d.dateKey} className="hover:bg-slate-50/70">
                        <th
                          scope="row"
                          className="px-3 py-2.5 font-extrabold text-slate-900 whitespace-nowrap border-r border-slate-100"
                        >
                          {d.dateLabel}
                        </th>
                        <td className="px-2.5 py-2.5 text-right font-black text-slate-900 tabular-nums">
                          {d.totalAdisyons}
                        </td>
                        <td className="px-2.5 py-2.5 text-right font-bold text-emerald-700 tabular-nums">
                          {d.deliveredCount}
                        </td>
                        <td className="px-2.5 py-2.5 text-right font-bold text-amber-700 tabular-nums">
                          {d.activeCount}
                        </td>
                        <td className="px-2.5 py-2.5 text-right font-black text-sky-700 tabular-nums">
                          {d.totalPortions}
                        </td>
                        <td className="px-2.5 py-2.5 font-semibold text-slate-700 whitespace-nowrap tabular-nums">
                          {d.avgDeliveryLabel}
                        </td>
                        <td className="px-2.5 py-2.5 text-xs font-semibold text-slate-700">
                          {d.topProduct}
                        </td>
                        {!printable && onSelectDay && (
                          <td className="px-2.5 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => onSelectDay(d.dateKey)}
                              className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 hover:bg-sky-100"
                            >
                              O Güne İn
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* 2. ÜRÜN & VARYASYON BAZLI RAPOR */}
      {showProduct && (
        <section
          className={`${
            printable ? "" : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          } space-y-3`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-extrabold text-slate-900">
              Ürün &amp; Varyasyon Bazlı Rapor ({report.productRows.length} Çeşit •{" "}
              {report.kpis.totalPortions} Porsiyon)
            </h4>
          </div>
          <div
            tabIndex={printable ? undefined : 0}
            role={printable ? undefined : "region"}
            aria-labelledby={printable ? undefined : "caption-product-report"}
            className={printable ? "" : "table-wrapper"}
          >
            <table className="text-left text-xs sm:text-sm min-w-[780px]">
              <caption
                id={printable ? undefined : "caption-product-report"}
                className="sr-only"
              >
                Ürün ve Varyasyon Bazlı Üretim ve Teslimat Raporu
              </caption>
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th
                    scope="col"
                    aria-sort={
                      !printable && productSortCol === "productNo"
                        ? productSortDir
                        : undefined
                    }
                    className={printable ? "px-2.5 py-2.5 font-bold" : "p-0"}
                  >
                    {renderSortButton(
                      "No",
                      "productNo",
                      productSortCol,
                      productSortDir,
                      onSortProduct
                    )}
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      !printable && productSortCol === "productName"
                        ? productSortDir
                        : undefined
                    }
                    className={printable ? "px-2.5 py-2.5 font-bold" : "p-0"}
                  >
                    {renderSortButton(
                      "Ürün",
                      "productName",
                      productSortCol,
                      productSortDir,
                      onSortProduct
                    )}
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-bold">
                    Varyasyon Kırılımı
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      !printable && productSortCol === "orderCount"
                        ? productSortDir
                        : undefined
                    }
                    className={printable ? "px-2.5 py-2.5 font-bold text-right" : "p-0"}
                  >
                    {renderSortButton(
                      "Adisyon",
                      "orderCount",
                      productSortCol,
                      productSortDir,
                      onSortProduct
                    )}
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      !printable && productSortCol === "totalQty"
                        ? productSortDir
                        : undefined
                    }
                    className={printable ? "px-2.5 py-2.5 font-bold text-right" : "p-0"}
                  >
                    {renderSortButton(
                      "Toplam",
                      "totalQty",
                      productSortCol,
                      productSortDir,
                      onSortProduct
                    )}
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      !printable && productSortCol === "deliveredQty"
                        ? productSortDir
                        : undefined
                    }
                    className={printable ? "px-2.5 py-2.5 font-bold text-right" : "p-0"}
                  >
                    {renderSortButton(
                      "Teslim",
                      "deliveredQty",
                      productSortCol,
                      productSortDir,
                      onSortProduct
                    )}
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      !printable && productSortCol === "pendingQty"
                        ? productSortDir
                        : undefined
                    }
                    className={printable ? "px-2.5 py-2.5 font-bold text-right" : "p-0"}
                  >
                    {renderSortButton(
                      "Bekleyen",
                      "pendingQty",
                      productSortCol,
                      productSortDir,
                      onSortProduct
                    )}
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      !printable && productSortCol === "sharePercent"
                        ? productSortDir
                        : undefined
                    }
                    className={printable ? "px-2.5 py-2.5 font-bold text-right" : "p-0"}
                  >
                    {renderSortButton(
                      "Pay %",
                      "sharePercent",
                      productSortCol,
                      productSortDir,
                      onSortProduct
                    )}
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-bold">
                    Ort. Süre
                  </th>
                  {!printable && onSelectProduct && (
                    <th scope="col" className="px-2.5 py-2.5 font-bold text-right">
                      Detay
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={printable ? 9 : 10}
                      className="py-6 text-center text-slate-500 font-semibold"
                    >
                      Seçili filtrelerde ürün kaydı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  sortedProducts.map((row: ProductReportRow) => (
                    <tr key={row.productKey} className="hover:bg-slate-50/70">
                      <td className="px-2.5 py-2.5 font-bold text-slate-500 tabular-nums">
                        #{row.productNo}
                      </td>
                      <th
                        scope="row"
                        className="px-2.5 py-2.5 font-extrabold text-slate-900 border-r border-slate-100"
                      >
                        <div>{row.productName}</div>
                        <div className="text-[11px] font-medium text-slate-500">
                          {row.category}
                        </div>
                      </th>
                      <td className="px-2.5 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {row.variationList.map((v) => (
                            <span
                              key={v.variationKey}
                              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-700"
                            >
                              {v.variationKey}: {v.count}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-bold text-slate-700 tabular-nums">
                        {row.orderCount}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-black text-slate-900 tabular-nums">
                        {row.totalQty}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-bold text-emerald-700 tabular-nums">
                        {row.deliveredQty}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-bold text-amber-700 tabular-nums">
                        {row.pendingQty}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-bold text-sky-700 tabular-nums">
                        %{row.sharePercent}
                      </td>
                      <td className="px-2.5 py-2.5 font-semibold text-slate-700 whitespace-nowrap tabular-nums">
                        {row.avgDeliveryLabel}
                      </td>
                      {!printable && onSelectProduct && (
                        <td className="px-2.5 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => onSelectProduct(row.productKey)}
                            className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 hover:bg-sky-100"
                          >
                            Adisyonları Gör
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. ADİSYON BAZLI RAPOR */}
      {showAdisyon && (
        <section
          className={`${
            printable ? "" : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          } space-y-3`}
        >
          <h4 className="text-sm font-extrabold text-slate-900">
            Adisyon Bazlı Rapor ({report.adisyonRows.length} Adisyon)
          </h4>
          <div
            tabIndex={printable ? undefined : 0}
            role={printable ? undefined : "region"}
            aria-labelledby={printable ? undefined : "caption-adisyon-report"}
            className={printable ? "" : "table-wrapper"}
          >
            <table className="text-left text-xs sm:text-sm min-w-[820px]">
              <caption
                id={printable ? undefined : "caption-adisyon-report"}
                className="sr-only"
              >
                Adisyon Bazlı Döküm ve Teslimat Süreleri
              </caption>
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th
                    scope="col"
                    aria-sort={
                      !printable && adisyonSortCol === "queueNumber"
                        ? adisyonSortDir
                        : undefined
                    }
                    className={printable ? "px-2.5 py-2.5 font-bold" : "p-0"}
                  >
                    {renderSortButton(
                      "Sıra",
                      "queueNumber",
                      adisyonSortCol,
                      adisyonSortDir,
                      onSortAdisyon
                    )}
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      !printable && adisyonSortCol === "guestHeader"
                        ? adisyonSortDir
                        : undefined
                    }
                    className={printable ? "px-2.5 py-2.5 font-bold" : "p-0"}
                  >
                    {renderSortButton(
                      "Oda / Misafir",
                      "guestHeader",
                      adisyonSortCol,
                      adisyonSortDir,
                      onSortAdisyon
                    )}
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      !printable && adisyonSortCol === "createdAt"
                        ? adisyonSortDir
                        : undefined
                    }
                    className={printable ? "px-2.5 py-2.5 font-bold" : "p-0"}
                  >
                    {renderSortButton(
                      "Sipariş Zamanı",
                      "createdAt",
                      adisyonSortCol,
                      adisyonSortDir,
                      onSortAdisyon
                    )}
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-bold">
                    Teslim Zamanı
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-bold">
                    Süre
                  </th>
                  <th
                    scope="col"
                    aria-sort={
                      !printable && adisyonSortCol === "matchingPortions"
                        ? adisyonSortDir
                        : undefined
                    }
                    className={printable ? "px-2.5 py-2.5 font-bold text-right" : "p-0"}
                  >
                    {renderSortButton(
                      "Porsiyon",
                      "matchingPortions",
                      adisyonSortCol,
                      adisyonSortDir,
                      onSortAdisyon
                    )}
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-bold">
                    İçerik
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-bold">
                    Durum
                  </th>
                  {!printable && onSelectAdisyonItems && (
                    <th scope="col" className="px-2.5 py-2.5 font-bold text-right">
                      Kalem
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedAdisyons.length === 0 ? (
                  <tr>
                    <td
                      colSpan={printable ? 8 : 9}
                      className="py-6 text-center text-slate-500 font-semibold"
                    >
                      Seçili filtrelerde adisyon bulunamadı.
                    </td>
                  </tr>
                ) : (
                  sortedAdisyons.map((a: AdisyonReportRow) => {
                    const statusMeta = ADISYON_STATUS_META[a.status];
                    return (
                      <tr key={a.id} className="hover:bg-slate-50/70">
                        <th
                          scope="row"
                          className="px-2.5 py-2.5 font-black text-slate-900 whitespace-nowrap border-r border-slate-100"
                        >
                          #{a.queueNumber}
                        </th>
                        <td className="px-2.5 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                          {a.guestHeader}
                        </td>
                        <td className="px-2.5 py-2.5 tabular-nums text-slate-700 font-semibold whitespace-nowrap">
                          {a.createdAtFormatted}
                        </td>
                        <td className="px-2.5 py-2.5 tabular-nums text-slate-700 font-semibold whitespace-nowrap">
                          {a.completedAtFormatted}
                        </td>
                        <td className="px-2.5 py-2.5 tabular-nums font-bold text-slate-900 whitespace-nowrap">
                          {a.durationLabel}
                        </td>
                        <td className="px-2.5 py-2.5 text-right font-black text-slate-900 tabular-nums">
                          {a.matchingPortions}
                        </td>
                        <td className="px-2.5 py-2.5 text-xs text-slate-700">
                          <div>{a.itemsSummary}</div>
                          {a.note && (
                            <div className="text-[11px] font-semibold text-amber-800 mt-0.5">
                              Not: {a.note}
                            </div>
                          )}
                        </td>
                        <td className="px-2.5 py-2.5 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-bold ${statusMeta.badgeClass}`}
                          >
                            {a.statusLabel}
                          </span>
                        </td>
                        {!printable && onSelectAdisyonItems && (
                          <td className="px-2.5 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => onSelectAdisyonItems(a.queueNumber)}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                            >
                              Kalemler
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 4. KALEM & VARYASYON MİKRO DETAY RAPORU */}
      {showItems && (
        <section
          className={`${
            printable ? "" : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          } space-y-3`}
        >
          <h4 className="text-sm font-extrabold text-slate-900">
            Kalem &amp; Varyasyon Detay Raporu ({report.itemRows.length} Satır)
          </h4>
          <div
            tabIndex={printable ? undefined : 0}
            role={printable ? undefined : "region"}
            aria-labelledby={printable ? undefined : "caption-item-report"}
            className={printable ? "" : "table-wrapper"}
          >
            <table className="text-left text-xs sm:text-sm min-w-[820px]">
              <caption
                id={printable ? undefined : "caption-item-report"}
                className="sr-only"
              >
                Sipariş Kalemi ve Varyasyon Mikro Detayları
              </caption>
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th scope="col" className="px-2.5 py-2.5 font-bold">
                    Sıra / Tarih
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-bold">
                    Oda / Misafir
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-bold">
                    Kategori
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-bold">
                    Ürün
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-bold">
                    Varyasyon
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-bold text-right">
                    Adet
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-bold">
                    Not
                  </th>
                  <th scope="col" className="px-2.5 py-2.5 font-bold">
                    Durum / Süre
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {report.itemRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-6 text-center text-slate-500 font-semibold"
                    >
                      Seçili filtrelerde kalem detayı bulunamadı.
                    </td>
                  </tr>
                ) : (
                  report.itemRows.map((it) => (
                    <tr key={it.itemId} className="hover:bg-slate-50/70">
                      <th
                        scope="row"
                        className="px-2.5 py-2 font-extrabold text-slate-900 whitespace-nowrap border-r border-slate-100"
                      >
                        <div>#{it.queueNumber}</div>
                        <div className="text-[11px] font-medium text-slate-500 tabular-nums">
                          {it.createdAtFormatted}
                        </div>
                      </th>
                      <td className="px-2.5 py-2 font-semibold text-slate-800 whitespace-nowrap">
                        {it.guestHeader}
                      </td>
                      <td className="px-2.5 py-2 text-xs text-slate-600 whitespace-nowrap">
                        {it.category}
                      </td>
                      <td className="px-2.5 py-2 font-bold text-slate-900">
                        #{it.productNo} {it.productName}
                      </td>
                      <td className="px-2.5 py-2 text-xs font-semibold text-slate-700">
                        {it.variationText}
                      </td>
                      <td className="px-2.5 py-2 text-right font-black text-slate-900 tabular-nums">
                        {it.quantity}
                      </td>
                      <td className="px-2.5 py-2 text-xs text-amber-800">
                        {it.itemNote || "—"}
                      </td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-xs">
                        <span className="font-bold text-slate-800">
                          {it.itemStatusLabel}
                        </span>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          {it.durationLabel}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default function AdminPage() {
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
  } = useAdisyonStream(2000);

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [tab, setTab] = useState<AdminTab>("AKIS");
  const [receiptAdisyon, setReceiptAdisyon] = useState<Adisyon | null>(null);

  // Tab 1: Anlık Akış filters
  const [flowStatusFilter, setFlowStatusFilter] =
    useState<FlowStatusFilter>("TUMU");
  const [flowSearch, setFlowSearch] = useState("");

  // Tab 2: Mutfak Durumu controls
  const [kitchenView, setKitchenView] = useState<KitchenViewMode>("BOLUNMUS");
  const [kitchenCategory, setKitchenCategory] = useState<string>("TUMU");

  // Tab 3: Akıllı Raporlama Modülü state (deterministic initial dates to avoid SSR mismatch)
  const [filters, setFilters] = useState<SmartReportFilters>(() => ({
    ...createDefaultSmartReportFilters(0),
    dateFrom: "",
    dateTo: "",
  }));
  const [drillLevel, setDrillLevel] =
    useState<ReportDrillLevel>("TUMU_BIRLIKTE");
  const [productSortCol, setProductSortCol] =
    useState<ProductSortCol>("totalQty");
  const [productSortDir, setProductSortDir] =
    useState<SortDirection>("descending");
  const [adisyonSortCol, setAdisyonSortCol] =
    useState<AdisyonSortCol>("queueNumber");
  const [adisyonSortDir, setAdisyonSortDir] =
    useState<SortDirection>("descending");

  const previewDialogRef = useRef<HTMLDialogElement>(null);
  const tabButtonRefs = useRef<Record<AdminTab, HTMLButtonElement | null>>({
    AKIS: null,
    MUTFAK: null,
    RAPORLAR: null,
  });
  const panelRefs = useRef<Record<AdminTab, HTMLDivElement | null>>({
    AKIS: null,
    MUTFAK: null,
    RAPORLAR: null,
  });

  // Load authenticated user & initialize local dates on client mount
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { user?: AuthUser | null } | null) => {
        if (data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});

    const today = toLocalDateInputValue();
    setFilters((prev) =>
      prev.dateFrom ? prev : { ...prev, dateFrom: today, dateTo: today }
    );
  }, []);

  // Wire `beforematch` so browser Find-in-Page opens hidden="until-found" tab panels
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    for (const item of ADMIN_TABS) {
      const el = panelRefs.current[item.key];
      if (!el) continue;
      const onMatch = () => setTab(item.key);
      el.addEventListener("beforematch", onMatch);
      cleanups.push(() => el.removeEventListener("beforematch", onMatch));
    }
    return () => {
      for (const fn of cleanups) fn();
    };
  }, [loading]);

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

  // Live Flow (Section 1) metrics & filtered lists
  const liveStats = useMemo(() => {
    const effectiveNow = nowMs > 0 ? nowMs : 0;
    const todayKey = effectiveNow > 0 ? toLocalDateInputValue(effectiveNow) : "";
    let waiting = 0;
    let preparing = 0;
    let ready = 0;
    let deliveredToday = 0;
    let secSum = 0;
    let secCount = 0;

    for (const a of adisyons) {
      if (a.status === "BEKLIYOR") waiting += 1;
      else if (a.status === "HAZIRLANIYOR") preparing += 1;
      else if (a.status === "HAZIR") ready += 1;
      else if (a.status === "TESLIM_EDILDI") {
        if (
          !todayKey ||
          toLocalDateInputValue(new Date(a.createdAt).getTime()) === todayKey
        ) {
          deliveredToday += 1;
        }
        const doneMs = new Date(a.completedAt || a.updatedAt).getTime();
        const startMs = new Date(a.createdAt).getTime();
        if (doneMs >= startMs) {
          secSum += Math.floor((doneMs - startMs) / 1000);
          secCount += 1;
        }
      }
    }

    const avgSec = secCount > 0 ? Math.round(secSum / secCount) : 0;
    const avgLabel =
      secCount > 0
        ? `${Math.floor(avgSec / 60)} dk ${String(avgSec % 60).padStart(2, "0")} sn`
        : "—";

    return { waiting, preparing, ready, deliveredToday, avgLabel };
  }, [adisyons, nowMs]);

  const filteredFlowAdisyons = useMemo(() => {
    const q = flowSearch.trim().toLocaleLowerCase("tr");
    return adisyons.filter((a) => {
      if (flowStatusFilter === "TUMU") {
        if (a.status === "TESLIM_EDILDI" || a.status === "IPTAL") return false;
      } else if (a.status !== flowStatusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        String(a.queueNumber).includes(q) ||
        a.roomNumber.toLocaleLowerCase("tr").includes(q) ||
        a.guestName.toLocaleLowerCase("tr").includes(q) ||
        a.items.some((it) => it.productName.toLocaleLowerCase("tr").includes(q))
      );
    });
  }, [adisyons, flowStatusFilter, flowSearch]);

  const recentDeliveredAdisyons = useMemo(() => {
    const q = flowSearch.trim().toLocaleLowerCase("tr");
    return adisyons
      .filter((a) => {
        if (a.status !== "TESLIM_EDILDI") return false;
        if (!q) return true;
        return (
          String(a.queueNumber).includes(q) ||
          a.roomNumber.toLocaleLowerCase("tr").includes(q) ||
          a.guestName.toLocaleLowerCase("tr").includes(q)
        );
      })
      .slice(0, 6);
  }, [adisyons, flowSearch]);

  // Kitchen Status (Section 2) metrics & filters
  const kitchenCategories = useMemo(() => {
    const set = new Set<string>();
    for (const b of groupedBatches) {
      if (b.category) set.add(b.category);
    }
    return Array.from(set).sort((a, b) => TR_COLLATOR.compare(a, b));
  }, [groupedBatches]);

  const filteredKitchenBatches = useMemo(() => {
    if (kitchenCategory === "TUMU") return groupedBatches;
    return groupedBatches.filter((b) => b.category === kitchenCategory);
  }, [groupedBatches, kitchenCategory]);

  const filteredKitchenAdisyons = useMemo(() => {
    if (kitchenCategory === "TUMU") return activeAdisyons;
    return activeAdisyons.filter((a) =>
      a.items.some((i) => (i.category || "Diğer") === kitchenCategory)
    );
  }, [activeAdisyons, kitchenCategory]);

  const kitchenMetrics = useMemo(() => {
    let pendingPortions = 0;
    let preparingPortions = 0;
    let readyPortions = 0;
    let warningCount = 0;
    let criticalCount = 0;

    for (const b of filteredKitchenBatches) {
      pendingPortions += b.pendingQuantity;
      preparingPortions += b.preparingQuantity;
      readyPortions += b.readyQuantity;
    }

    const effectiveNow = nowMs > 0 ? nowMs : 0;
    for (const a of filteredKitchenAdisyons) {
      if (effectiveNow <= 0) continue;
      const dur = formatLiveDuration(a.createdAt, effectiveNow);
      if (dur.urgency === "critical") criticalCount += 1;
      else if (dur.urgency === "warning") warningCount += 1;
    }

    return {
      batchCount: filteredKitchenBatches.length,
      pendingPortions,
      preparingPortions,
      readyPortions,
      warningCount,
      criticalCount,
    };
  }, [filteredKitchenBatches, filteredKitchenAdisyons, nowMs]);

  // Smart Report (Section 3) cascading filter options & aggregated data
  const reportFilterOptions = useMemo(() => {
    const categorySet = new Set<string>();
    const productMap = new Map<
      string,
      { productKey: string; label: string; category: string }
    >();
    const variationSet = new Set<string>();

    for (const a of adisyons) {
      for (const item of a.items) {
        const cat = item.category || "Diğer";
        categorySet.add(cat);
        if (filters.category !== "TUMU" && cat !== filters.category) continue;
        const pKey = `${item.productNo}:${item.productName}`;
        if (!productMap.has(pKey)) {
          productMap.set(pKey, {
            productKey: pKey,
            label: `#${item.productNo} ${item.productName}`,
            category: cat,
          });
        }
        if (filters.productKey !== "TUMU" && pKey !== filters.productKey) {
          continue;
        }
        variationSet.add(formatVariationKey(item.variations));
      }
    }

    return {
      categories: Array.from(categorySet).sort((a, b) =>
        TR_COLLATOR.compare(a, b)
      ),
      products: Array.from(productMap.values()).sort((a, b) =>
        TR_COLLATOR.compare(a.label, b.label)
      ),
      variations: Array.from(variationSet).sort((a, b) =>
        TR_COLLATOR.compare(a, b)
      ),
    };
  }, [adisyons, filters.category, filters.productKey]);

  const effectiveFilters = useMemo<SmartReportFilters>(() => {
    const fallbackToday = nowMs > 0 ? toLocalDateInputValue(nowMs) : "";
    return {
      ...filters,
      dateFrom: filters.dateFrom || fallbackToday,
      dateTo: filters.dateTo || fallbackToday,
    };
  }, [filters, nowMs]);

  const reportData = useMemo(
    () => buildSmartReportData(adisyons, effectiveFilters, nowMs),
    [adisyons, effectiveFilters, nowMs]
  );

  const filterSummaryText = useMemo(
    () => buildFilterSummaryText(effectiveFilters),
    [effectiveFilters]
  );

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const idx = ADMIN_TABS.findIndex((t) => t.key === tab);
    if (idx < 0) return;

    let nextIdx = idx;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % ADMIN_TABS.length;
    else if (e.key === "ArrowLeft")
      nextIdx = (idx - 1 + ADMIN_TABS.length) % ADMIN_TABS.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = ADMIN_TABS.length - 1;
    else return;

    e.preventDefault();
    const nextTab = ADMIN_TABS[nextIdx].key;
    setTab(nextTab);
    tabButtonRefs.current[nextTab]?.focus();
  };

  const handleSortProduct = (col: ProductSortCol) => {
    if (productSortCol === col) {
      setProductSortDir((prev) =>
        prev === "ascending" ? "descending" : "ascending"
      );
    } else {
      setProductSortCol(col);
      setProductSortDir(col === "productName" || col === "productNo" ? "ascending" : "descending");
    }
  };

  const handleSortAdisyon = (col: AdisyonSortCol) => {
    if (adisyonSortCol === col) {
      setAdisyonSortDir((prev) =>
        prev === "ascending" ? "descending" : "ascending"
      );
    } else {
      setAdisyonSortCol(col);
      setAdisyonSortDir(col === "guestHeader" ? "ascending" : "descending");
    }
  };

  const handleResetReportFilters = () => {
    setFilters(createDefaultSmartReportFilters(nowMs > 0 ? nowMs : Date.now()));
    setDrillLevel("TUMU_BIRLIKTE");
  };

  const handleOpenPreview = () => {
    const dialog = previewDialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
  };

  const handleClosePreview = () => {
    const dialog = previewDialogRef.current;
    if (dialog?.open) dialog.close();
  };

  const handlePrintPdfReport = () => {
    const dialog = previewDialogRef.current;
    if (dialog?.open) dialog.close();

    const htmlEl = document.documentElement;
    htmlEl.dataset.printMode = "report";

    const cleanup = () => {
      delete htmlEl.dataset.printMode;
    };

    window.addEventListener("afterprint", cleanup, { once: true });
    window.setTimeout(() => {
      window.print();
      window.setTimeout(cleanup, 1500);
    }, 80);
  };

  const handlePrintTicket = (adisyon: Adisyon) => {
    delete document.documentElement.dataset.printMode;
    setReceiptAdisyon(adisyon);
    void markPrinted(adisyon.id);
    window.setTimeout(() => {
      window.print();
    }, 120);
  };

  if (currentUser && currentUser.role !== "ADMIN") {
    return (
      <AppShell
        activeQueueCount={activeAdisyons.length}
        readyCount={readyCount}
        hasActivePrinter={hasActivePrinter}
        printerConfig={printerConfig}
        dbMode={dbMode}
        dbNotice={dbNotice}
      >
        <div className="mx-auto max-w-lg rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-sm space-y-4 mt-8">
          <ShieldAlert
            className="mx-auto h-12 w-12 text-amber-600"
            aria-hidden="true"
          />
          <h2 className="text-lg font-extrabold text-slate-900">
            Admin Yetkisi Gerekli
          </h2>
          <p className="text-sm text-slate-600">
            Bu ekran yalnızca <strong>Admin</strong> kullanıcısı içindir. Şu an{" "}
            <strong>{currentUser.displayName}</strong> hesabıyla oturum
            açmış durumdasınız.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Link
              href={currentUser.role === "MUTFAK" ? "/mutfak" : "/"}
              className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
            >
              Ana Ekranıma Dön
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

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
          {/* Top Header & 3-Section Tab Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white px-4 pt-4 pb-2 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700 shrink-0">
                  <BarChart3 className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="fluid-page-title font-extrabold text-slate-900">
                    Admin Paneli — Yönetim &amp; Akıllı Raporlama
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-slate-500">
                    Anlık sipariş akışı, canlı mutfak durumu ve genelden özele
                    özelleştirilebilir raporlama merkezi
                  </p>
                </div>
              </div>
            </div>

            <div
              role="tablist"
              {...({ focusgroup: "tablist nomemory" } as Record<string, unknown>)}
              aria-label="Admin paneli bölümleri"
              onKeyDown={handleTabKeyDown}
              className="admin-tablist border-t border-slate-100 pt-2"
            >
              {ADMIN_TABS.map((t) => {
                const isSelected = tab === t.key;
                const Icon =
                  t.key === "AKIS"
                    ? Activity
                    : t.key === "MUTFAK"
                    ? ChefHat
                    : BarChart3;
                const badgeCount =
                  t.key === "AKIS"
                    ? activeAdisyons.length
                    : t.key === "MUTFAK"
                    ? groupedBatches.length
                    : reportData.adisyonRows.length;

                return (
                  <button
                    key={t.key}
                    ref={(el) => {
                      tabButtonRefs.current[t.key] = el;
                    }}
                    type="button"
                    role="tab"
                    id={t.id}
                    aria-selected={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    {...(isSelected
                      ? ({ focusgroupstart: "" } as Record<string, unknown>)
                      : {})}
                    onClick={() => setTab(t.key)}
                    className="admin-tab inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-sky-600"
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{t.label}</span>
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-extrabold text-slate-700 tabular-nums">
                      {badgeCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">
              Admin verileri yükleniyor...
            </div>
          ) : (
            <div>
              {/* SECTION 1: ANLIK AKIŞ */}
              <div
                ref={(el) => {
                  panelRefs.current.AKIS = el;
                }}
                role="tabpanel"
                aria-labelledby="admin-tab-akis"
                {...(tab !== "AKIS"
                  ? ({ hidden: "until-found" } as Record<string, unknown>)
                  : {})}
              >
                <div className="space-y-4">
                  {/* Live KPI Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="text-xs font-bold text-slate-500">
                        Aktif Kuyruk
                      </div>
                      <div className="mt-1 text-2xl font-black text-slate-900 tabular-nums">
                        {activeAdisyons.length}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 shadow-sm">
                      <div className="text-xs font-bold text-amber-800">
                        Bekliyor
                      </div>
                      <div className="mt-1 text-2xl font-black text-amber-950 tabular-nums">
                        {liveStats.waiting}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3.5 shadow-sm">
                      <div className="text-xs font-bold text-sky-800">
                        Hazırlanıyor
                      </div>
                      <div className="mt-1 text-2xl font-black text-sky-950 tabular-nums">
                        {liveStats.preparing}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-sm">
                      <div className="text-xs font-bold text-emerald-800">
                        Toplandı / Hazır
                      </div>
                      <div className="mt-1 text-2xl font-black text-emerald-950 tabular-nums">
                        {liveStats.ready}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="text-xs font-bold text-slate-500">
                        Bugün Teslim
                      </div>
                      <div className="mt-1 text-2xl font-black text-slate-900 tabular-nums">
                        {liveStats.deliveredToday}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Timer
                          className="h-3.5 w-3.5 text-sky-600"
                          aria-hidden="true"
                        />
                        <span>Ort. Teslim Süresi</span>
                      </div>
                      <div className="mt-1 text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                        {liveStats.avgLabel}
                      </div>
                    </div>
                  </div>

                  {/* Live Flow Filters */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          ["TUMU", "Aktif Akış"],
                          ["BEKLIYOR", "Bekliyor"],
                          ["HAZIRLANIYOR", "Hazırlanıyor"],
                          ["HAZIR", "Toplandı / Hazır"],
                          ["TESLIM_EDILDI", "Teslim Edilenler"],
                        ] as const
                      ).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFlowStatusFilter(key)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            flowStatusFilter === key
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="search"
                      value={flowSearch}
                      onChange={(e) => setFlowSearch(e.target.value)}
                      placeholder="Sıra no, oda, misafir veya ürün ara..."
                      aria-label="Anlık akışta ara"
                      className="w-full sm:w-72 rounded-xl border border-slate-300 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Active Flow Feed */}
                  {filteredFlowAdisyons.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-600">
                      Seçili filtrede anlık adisyon bulunmuyor.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredFlowAdisyons.map((adisyon) => (
                        <AdisyonCard
                          key={adisyon.id}
                          adisyon={adisyon}
                          nowMs={nowMs}
                          allowItemToggle={adisyon.status !== "TESLIM_EDILDI"}
                          showPrintButton={hasActivePrinter}
                          compact={true}
                          onUpdateStatus={updateAdisyonStatus}
                          onUpdateItemStatus={updateItemStatus}
                          onPrint={handlePrintTicket}
                        />
                      ))}
                    </div>
                  )}

                  {/* Recently Delivered Preview when viewing active queue */}
                  {flowStatusFilter !== "TESLIM_EDILDI" &&
                    recentDeliveredAdisyons.length > 0 && (
                      <section className="pt-3 border-t border-slate-200 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="fluid-section-title font-extrabold text-slate-900 flex items-center gap-2">
                            <CheckCheck
                              className="h-5 w-5 text-emerald-600"
                              aria-hidden="true"
                            />
                            <span>Son Teslim Edilen Adisyonlar</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => setFlowStatusFilter("TESLIM_EDILDI")}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            Tüm Teslim Edilenler
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {recentDeliveredAdisyons.map((adisyon) => (
                            <AdisyonCard
                              key={adisyon.id}
                              adisyon={adisyon}
                              nowMs={nowMs}
                              allowItemToggle={false}
                              showPrintButton={hasActivePrinter}
                              compact={true}
                              onUpdateStatus={updateAdisyonStatus}
                              onUpdateItemStatus={updateItemStatus}
                              onPrint={handlePrintTicket}
                            />
                          ))}
                        </div>
                      </section>
                    )}
                </div>
              </div>

              {/* SECTION 2: MUTFAK DURUMU */}
              <div
                ref={(el) => {
                  panelRefs.current.MUTFAK = el;
                }}
                role="tabpanel"
                aria-labelledby="admin-tab-mutfak"
                {...(tab !== "MUTFAK"
                  ? ({ hidden: "until-found" } as Record<string, unknown>)
                  : {})}
              >
                <div className="space-y-4">
                  {/* Kitchen KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="text-xs font-bold text-slate-500">
                        Aktif Ürün Çeşidi
                      </div>
                      <div className="mt-1 text-2xl font-black text-slate-900 tabular-nums">
                        {kitchenMetrics.batchCount}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 shadow-sm">
                      <div className="text-xs font-bold text-amber-800">
                        Bekleyen Porsiyon
                      </div>
                      <div className="mt-1 text-2xl font-black text-amber-950 tabular-nums">
                        {kitchenMetrics.pendingPortions}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-3.5 shadow-sm">
                      <div className="text-xs font-bold text-sky-800">
                        Ocakta Porsiyon
                      </div>
                      <div className="mt-1 text-2xl font-black text-sky-950 tabular-nums">
                        {kitchenMetrics.preparingPortions}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 shadow-sm">
                      <div className="text-xs font-bold text-emerald-800">
                        Hazır Porsiyon
                      </div>
                      <div className="mt-1 text-2xl font-black text-emerald-950 tabular-nums">
                        {kitchenMetrics.readyPortions}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-white p-3.5 shadow-sm">
                      <div className="text-xs font-bold text-amber-700 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>5+ dk Bekleyen</span>
                      </div>
                      <div className="mt-1 text-2xl font-black text-amber-800 tabular-nums">
                        {kitchenMetrics.warningCount}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5 shadow-sm">
                      <div className="text-xs font-bold text-rose-700 flex items-center gap-1">
                        <AlertTriangle
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        <span>10+ dk Kritik</span>
                      </div>
                      <div className="mt-1 text-2xl font-black text-rose-900 tabular-nums">
                        {kitchenMetrics.criticalCount}
                      </div>
                    </div>
                  </div>

                  {/* Kitchen View Mode & Category Controls */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setKitchenCategory("TUMU")}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                          kitchenCategory === "TUMU"
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Tüm Kategoriler
                      </button>
                      {kitchenCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setKitchenCategory(cat)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            kitchenCategory === cat
                              ? "bg-sky-600 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          ["BOLUNMUS", "Bölünmüş Görünüm", Layers],
                          ["GRUPLU", "Sadece Gruplu", ChefHat],
                          ["SIRA", "Sıra Kartları", ListOrdered],
                        ] as const
                      ).map(([mode, label, ModeIcon]) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setKitchenView(mode)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            kitchenView === mode
                              ? "bg-amber-600 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          <ModeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Kitchen Content */}
                  {kitchenView === "BOLUNMUS" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      <div className="lg:col-span-5 space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <h3 className="fluid-section-title font-extrabold text-slate-900 flex items-center gap-2">
                            <Layers
                              className="h-5 w-5 text-sky-600"
                              aria-hidden="true"
                            />
                            <span>Toplu Ürün Yükü</span>
                          </h3>
                          <span className="rounded-lg bg-sky-100 px-2.5 py-0.5 text-xs font-extrabold text-sky-800">
                            {filteredKitchenBatches.length} Çeşit
                          </span>
                        </div>
                        <KitchenGroupedBoard
                          batches={filteredKitchenBatches}
                          onBatchStatusChange={batchUpdateItems}
                          compact={true}
                        />
                      </div>

                      <div className="lg:col-span-7 space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <h3 className="fluid-section-title font-extrabold text-slate-900 flex items-center gap-2">
                            <ListOrdered
                              className="h-5 w-5 text-amber-600"
                              aria-hidden="true"
                            />
                            <span>
                              Sıraya Göre Mutfak Adisyonları (
                              {filteredKitchenAdisyons.length})
                            </span>
                          </h3>
                        </div>
                        {filteredKitchenAdisyons.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-600">
                            Mutfakta bekleyen adisyon bulunmuyor.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {filteredKitchenAdisyons.map((adisyon) => (
                              <AdisyonCard
                                key={adisyon.id}
                                adisyon={adisyon}
                                nowMs={nowMs}
                                allowItemToggle={true}
                                showPrintButton={hasActivePrinter}
                                compact={true}
                                onUpdateStatus={updateAdisyonStatus}
                                onUpdateItemStatus={updateItemStatus}
                                onPrint={handlePrintTicket}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : kitchenView === "GRUPLU" ? (
                    <KitchenGroupedBoard
                      batches={filteredKitchenBatches}
                      onBatchStatusChange={batchUpdateItems}
                      compact={false}
                    />
                  ) : filteredKitchenAdisyons.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-600">
                      Mutfakta bekleyen adisyon bulunmuyor.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredKitchenAdisyons.map((adisyon) => (
                        <AdisyonCard
                          key={adisyon.id}
                          adisyon={adisyon}
                          nowMs={nowMs}
                          allowItemToggle={true}
                          showPrintButton={hasActivePrinter}
                          compact={false}
                          onUpdateStatus={updateAdisyonStatus}
                          onUpdateItemStatus={updateItemStatus}
                          onPrint={handlePrintTicket}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 3: RAPORLAR — AKILLI RAPORLAMA MODÜLÜ */}
              <div
                ref={(el) => {
                  panelRefs.current.RAPORLAR = el;
                }}
                role="tabpanel"
                aria-labelledby="admin-tab-raporlar"
                {...(tab !== "RAPORLAR"
                  ? ({ hidden: "until-found" } as Record<string, unknown>)
                  : {})}
              >
                <div className="space-y-4">
                  {/* A. Akıllı Raporlama Modülü — En Genelden Özele Özelleştirme Paneli */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <Filter
                          className="h-5 w-5 text-sky-600"
                          aria-hidden="true"
                        />
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900">
                            Akıllı Raporlama Modülü
                          </h3>
                          <p className="text-xs font-medium text-slate-500">
                            Zaman aralığını, kapsam seviyesini ve ürün/varyasyon
                            kırılımlarını genelden özele özelleştirin.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleResetReportFilters}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Filtreleri Sıfırla</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleOpenPreview}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2 text-xs font-extrabold text-sky-800 hover:bg-sky-100"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          <span>Sadece Görüntüle (Önizle)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            downloadSmartReportXlsx(reportData, filterSummaryText)
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700"
                        >
                          <FileSpreadsheet
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                          <span>Excel (.xlsx) İndir</span>
                        </button>

                        <button
                          type="button"
                          onClick={handlePrintPdfReport}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-slate-800"
                        >
                          <FileText className="h-4 w-4" aria-hidden="true" />
                          <span>PDF Olarak Kaydet / Yazdır</span>
                        </button>
                      </div>
                    </div>

                    {/* Step 1: Time Range Selection */}
                    <div className="space-y-2.5">
                      <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>1. Zaman Aralığı Seçimi</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {TIME_PRESETS.map((preset) => (
                          <button
                            key={preset.key}
                            type="button"
                            onClick={() =>
                              setFilters((prev) => ({
                                ...prev,
                                timePreset: preset.key,
                              }))
                            }
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                              filters.timePreset === preset.key
                                ? "bg-slate-900 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {filters.timePreset === "OZEL_ARALIK" && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                          <label className="block space-y-1 text-xs font-bold text-slate-700">
                            <span>Başlangıç Tarihi</span>
                            <input
                              type="date"
                              value={effectiveFilters.dateFrom}
                              onChange={(e) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  timePreset: "OZEL_ARALIK",
                                  dateFrom: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                            />
                          </label>
                          <label className="block space-y-1 text-xs font-bold text-slate-700">
                            <span>Başlangıç Saati</span>
                            <input
                              type="time"
                              value={filters.timeFrom}
                              onChange={(e) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  timePreset: "OZEL_ARALIK",
                                  timeFrom: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                            />
                          </label>
                          <label className="block space-y-1 text-xs font-bold text-slate-700">
                            <span>Bitiş Tarihi</span>
                            <input
                              type="date"
                              value={effectiveFilters.dateTo}
                              onChange={(e) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  timePreset: "OZEL_ARALIK",
                                  dateTo: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                            />
                          </label>
                          <label className="block space-y-1 text-xs font-bold text-slate-700">
                            <span>Bitiş Saati</span>
                            <input
                              type="time"
                              value={filters.timeTo}
                              onChange={(e) =>
                                setFilters((prev) => ({
                                  ...prev,
                                  timePreset: "OZEL_ARALIK",
                                  timeTo: e.target.value,
                                }))
                              }
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Step 2: General -> Specific Drill Level */}
                    <div className="space-y-2">
                      <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        2. Detay Seviyesi (En Genelden Özele)
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                        {DRILL_LEVELS.map((lvl) => {
                          const active = drillLevel === lvl.key;
                          return (
                            <button
                              key={lvl.key}
                              type="button"
                              onClick={() => setDrillLevel(lvl.key)}
                              className={`rounded-xl border px-3 py-2 text-left transition ${
                                active
                                  ? "border-sky-600 bg-sky-50 text-sky-950 shadow-sm"
                                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <div className="text-xs font-extrabold">
                                {lvl.label}
                              </div>
                              <div className="text-[11px] font-medium text-slate-500">
                                {lvl.shortDesc}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step 3: Cascading Narrow Filters (Kategori -> Ürün -> Varyasyon -> Durum -> Arama) */}
                    <div className="space-y-2">
                      <div className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                        3. Kırılım &amp; İçerik Daraltma
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                        <label className="block space-y-1 text-xs font-bold text-slate-700">
                          <span>Kategori</span>
                          <select
                            value={filters.category}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                category: e.target.value,
                                productKey: "TUMU",
                                variation: "TUMU",
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900"
                          >
                            <option value="TUMU">Tüm Kategoriler</option>
                            {reportFilterOptions.categories.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block space-y-1 text-xs font-bold text-slate-700">
                          <span>Ürün</span>
                          <select
                            value={filters.productKey}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                productKey: e.target.value,
                                variation: "TUMU",
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900"
                          >
                            <option value="TUMU">Tüm Ürünler</option>
                            {reportFilterOptions.products.map((p) => (
                              <option key={p.productKey} value={p.productKey}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block space-y-1 text-xs font-bold text-slate-700">
                          <span>Varyasyon</span>
                          <select
                            value={filters.variation}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                variation: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900"
                          >
                            <option value="TUMU">Tüm Varyasyonlar</option>
                            {reportFilterOptions.variations.map((v) => (
                              <option key={v} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block space-y-1 text-xs font-bold text-slate-700">
                          <span>Adisyon Durumu</span>
                          <select
                            value={filters.statusFilter}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                statusFilter: e.target.value as ReportStatusFilter,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900"
                          >
                            <option value="TUMU">Tüm Durumlar</option>
                            <option value="TESLIM_EDILDI">
                              Teslim Edilenler
                            </option>
                            <option value="AKTIF">Sadece Aktifler</option>
                            <option value="BEKLIYOR">Bekliyor</option>
                            <option value="HAZIRLANIYOR">Hazırlanıyor</option>
                            <option value="HAZIR">Toplandı / Hazır</option>
                            <option value="IPTAL">İptal</option>
                          </select>
                        </label>

                        <label className="block space-y-1 text-xs font-bold text-slate-700">
                          <span>Özel Arama</span>
                          <input
                            type="search"
                            value={filters.searchQuery}
                            onChange={(e) =>
                              setFilters((prev) => ({
                                ...prev,
                                searchQuery: e.target.value,
                              }))
                            }
                            placeholder="#Sıra, oda, misafir, not..."
                            className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200">
                      <span className="font-extrabold text-slate-800">
                        Aktif Kapsam:{" "}
                      </span>
                      <span>{filterSummaryText}</span>
                    </div>
                  </section>

                  {/* B. Report KPI Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="text-[11px] font-bold text-slate-500">
                        Adisyon
                      </div>
                      <div className="mt-0.5 text-xl font-black text-slate-900 tabular-nums">
                        {reportData.kpis.totalAdisyons}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 shadow-sm">
                      <div className="text-[11px] font-bold text-emerald-800">
                        Teslim
                      </div>
                      <div className="mt-0.5 text-xl font-black text-emerald-950 tabular-nums">
                        {reportData.kpis.deliveredAdisyons}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 shadow-sm">
                      <div className="text-[11px] font-bold text-amber-800">
                        Aktif
                      </div>
                      <div className="mt-0.5 text-xl font-black text-amber-950 tabular-nums">
                        {reportData.kpis.activeAdisyons}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="text-[11px] font-bold text-slate-500">
                        Porsiyon
                      </div>
                      <div className="mt-0.5 text-xl font-black text-sky-700 tabular-nums">
                        {reportData.kpis.totalPortions}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="text-[11px] font-bold text-slate-500">
                        Ürün Çeşidi
                      </div>
                      <div className="mt-0.5 text-xl font-black text-slate-900 tabular-nums">
                        {reportData.kpis.uniqueProducts}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="text-[11px] font-bold text-slate-500">
                        Ort. Teslim
                      </div>
                      <div className="mt-0.5 text-base font-black text-slate-900 tabular-nums">
                        {reportData.kpis.avgDeliveryLabel}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm col-span-2 sm:col-span-2">
                      <div className="text-[11px] font-bold text-slate-500">
                        Lider Ürün / Kategori
                      </div>
                      <div className="mt-0.5 text-xs font-extrabold text-slate-900 truncate">
                        {reportData.kpis.topProductLabel}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500 truncate">
                        {reportData.kpis.topCategoryLabel}
                      </div>
                    </div>
                  </div>

                  {/* C. Report Content Tables (Interactive Drill-down) */}
                  <ReportSectionsRenderer
                    report={reportData}
                    drillLevel={drillLevel}
                    productSortCol={productSortCol}
                    productSortDir={productSortDir}
                    adisyonSortCol={adisyonSortCol}
                    adisyonSortDir={adisyonSortDir}
                    onSortProduct={handleSortProduct}
                    onSortAdisyon={handleSortAdisyon}
                    onSelectDay={(dateKey) => {
                      setFilters((prev) => ({
                        ...prev,
                        timePreset: "OZEL_ARALIK",
                        dateFrom: dateKey,
                        dateTo: dateKey,
                        timeFrom: "00:00",
                        timeTo: "23:59",
                      }));
                      setDrillLevel("URUN_BAZLI");
                    }}
                    onSelectCategory={(category) => {
                      setFilters((prev) => ({
                        ...prev,
                        category,
                        productKey: "TUMU",
                        variation: "TUMU",
                      }));
                      setDrillLevel("URUN_BAZLI");
                    }}
                    onSelectProduct={(productKey) => {
                      setFilters((prev) => ({
                        ...prev,
                        productKey,
                        variation: "TUMU",
                      }));
                      setDrillLevel("ADISYON_BAZLI");
                    }}
                    onSelectAdisyonItems={(queueNumber) => {
                      setFilters((prev) => ({
                        ...prev,
                        searchQuery: `#${queueNumber}`,
                      }));
                      setDrillLevel("KALEM_BAZLI");
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </AppShell>

      {/* On-Screen Executive Report Preview Modal (<dialog closedby="any">) */}
      <dialog
        ref={previewDialogRef}
        closedby="any"
        aria-labelledby="report-preview-title"
        onCancel={(e) => {
          e.preventDefault();
          handleClosePreview();
        }}
        onClick={(e) => {
          if (e.target === previewDialogRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickedInside =
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom;
            if (!clickedInside) handleClosePreview();
          }
        }}
        className="report-preview-dialog no-print"
      >
        <div className="flex max-h-[90dvh] flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3.5">
            <div>
              <h3
                id="report-preview-title"
                className="text-base font-extrabold text-slate-900"
              >
                Rapor Görüntüleme &amp; Önizleme — {reportData.rangeLabel}
              </h3>
              <p className="text-xs font-medium text-slate-500">
                {filterSummaryText}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadSmartReportXlsx(reportData, filterSummaryText)
                }
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-700"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Excel</span>
              </button>
              <button
                type="button"
                onClick={handlePrintPdfReport}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-slate-800"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                <span>PDF</span>
              </button>
              <button
                type="button"
                onClick={handleClosePreview}
                aria-label="Önizlemeyi Kapat"
                className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto p-5 space-y-5 bg-slate-50/40">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-bold text-slate-500">
                  Toplam Adisyon
                </div>
                <div className="text-xl font-black text-slate-900">
                  {reportData.kpis.totalAdisyons}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-bold text-slate-500">
                  Teslim Edilen
                </div>
                <div className="text-xl font-black text-emerald-700">
                  {reportData.kpis.deliveredAdisyons}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-bold text-slate-500">
                  Toplam Porsiyon
                </div>
                <div className="text-xl font-black text-sky-700">
                  {reportData.kpis.totalPortions}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="text-xs font-bold text-slate-500">
                  Ort. Teslim Süresi
                </div>
                <div className="text-lg font-black text-slate-900 tabular-nums">
                  {reportData.kpis.avgDeliveryLabel}
                </div>
              </div>
            </div>

            <ReportSectionsRenderer
              report={reportData}
              drillLevel={drillLevel}
              printable={true}
              productSortCol={productSortCol}
              productSortDir={productSortDir}
              adisyonSortCol={adisyonSortCol}
              adisyonSortDir={adisyonSortDir}
              onSortProduct={handleSortProduct}
              onSortAdisyon={handleSortAdisyon}
            />
          </div>
        </div>
      </dialog>

      {/* Thermal Receipt Container */}
      <PrintableReceipt adisyon={receiptAdisyon} />

      {/* A4 PDF Executive Report Print Container */}
      <section
        id="printable-admin-report"
        aria-label="Yazdırılabilir Akıllı Admin Raporu"
      >
        <div
          style={{
            borderBottom: "2px solid #0f172a",
            paddingBottom: "10px",
            marginBottom: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ fontSize: "18px", fontWeight: 900 }}>
              SHOW BÜFE — AKILLI YÖNETİM RAPORU
            </div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#334155" }}>
              {filterSummaryText}
            </div>
          </div>
          <div style={{ fontSize: "11px", textAlign: "right", color: "#475569" }}>
            <div>
              <strong>Dönem:</strong> {reportData.rangeLabel}
            </div>
            <div>
              <strong>Oluşturma:</strong>{" "}
              {formatDateTime(
                new Date(nowMs > 0 ? nowMs : 0).toISOString()
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: "8px",
            marginBottom: "16px",
            fontSize: "12px",
          }}
        >
          <div style={{ border: "1px solid #cbd5e1", padding: "8px" }}>
            <div style={{ color: "#475569", fontWeight: 700 }}>Toplam Adisyon</div>
            <div style={{ fontSize: "18px", fontWeight: 900 }}>
              {reportData.kpis.totalAdisyons}
            </div>
          </div>
          <div style={{ border: "1px solid #cbd5e1", padding: "8px" }}>
            <div style={{ color: "#475569", fontWeight: 700 }}>Teslim Edilen</div>
            <div style={{ fontSize: "18px", fontWeight: 900 }}>
              {reportData.kpis.deliveredAdisyons}
            </div>
          </div>
          <div style={{ border: "1px solid #cbd5e1", padding: "8px" }}>
            <div style={{ color: "#475569", fontWeight: 700 }}>Toplam Porsiyon</div>
            <div style={{ fontSize: "18px", fontWeight: 900 }}>
              {reportData.kpis.totalPortions}
            </div>
          </div>
          <div style={{ border: "1px solid #cbd5e1", padding: "8px" }}>
            <div style={{ color: "#475569", fontWeight: 700 }}>
              Ort. Teslim Süresi
            </div>
            <div style={{ fontSize: "16px", fontWeight: 900 }}>
              {reportData.kpis.avgDeliveryLabel}
            </div>
          </div>
        </div>

        <ReportSectionsRenderer
          report={reportData}
          drillLevel={drillLevel}
          printable={true}
          productSortCol={productSortCol}
          productSortDir={productSortDir}
          adisyonSortCol={adisyonSortCol}
          adisyonSortDir={adisyonSortDir}
          onSortProduct={handleSortProduct}
          onSortAdisyon={handleSortAdisyon}
        />
      </section>
    </>
  );
}
