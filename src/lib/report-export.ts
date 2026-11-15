import {
  ADISYON_STATUS_META,
  ITEM_STATUS_META,
  formatDateTime,
  formatGuestHeader,
  formatLiveDuration,
} from "@/lib/formatters";
import { formatVariationKey } from "@/lib/grouping";
import { formatTableLabel } from "@/lib/tables";
import type { Adisyon, AdisyonStatus, ItemStatus } from "@/types/adisyon";

export type ReportTimePreset =
  | "BUGUN"
  | "DUN"
  | "SON_7_GUN"
  | "BU_AY"
  | "TUMU"
  | "OZEL_ARALIK";

export type ReportDrillLevel =
  | "GENEL_GUNLUK"
  | "URUN_BAZLI"
  | "ADISYON_BAZLI"
  | "KALEM_BAZLI"
  | "TUMU_BIRLIKTE";

export type ReportStatusFilter =
  | "TUMU"
  | "AKTIF"
  | "TESLIM_EDILDI"
  | "BEKLIYOR"
  | "HAZIRLANIYOR"
  | "HAZIR"
  | "IPTAL";

export interface SmartReportFilters {
  timePreset: ReportTimePreset;
  dateFrom: string;
  timeFrom: string;
  dateTo: string;
  timeTo: string;
  category: string;
  productKey: string;
  variation: string;
  statusFilter: ReportStatusFilter;
  searchQuery: string;
}

export interface SmartReportKpis {
  totalAdisyons: number;
  deliveredAdisyons: number;
  activeAdisyons: number;
  cancelledAdisyons: number;
  totalPortions: number;
  deliveredPortions: number;
  pendingPortions: number;
  uniqueProducts: number;
  avgDeliveryLabel: string;
  topProductLabel: string;
  topCategoryLabel: string;
}

export interface DailyReportRow {
  dateKey: string;
  dateLabel: string;
  totalAdisyons: number;
  deliveredCount: number;
  activeCount: number;
  cancelledCount: number;
  totalPortions: number;
  topProduct: string;
  avgDeliveryLabel: string;
}

export interface CategoryReportRow {
  category: string;
  portionCount: number;
  orderCount: number;
  percent: number;
}

export interface ProductReportRow {
  productKey: string;
  productNo: number;
  productName: string;
  category: string;
  orderCount: number;
  totalQty: number;
  deliveredQty: number;
  pendingQty: number;
  sharePercent: number;
  avgDeliveryLabel: string;
  variationList: Array<{ variationKey: string; count: number }>;
}

export interface AdisyonReportRow {
  id: number;
  queueNumber: number;
  tableNumber: string;
  tableLabel: string;
  roomNumber: string;
  guestName: string;
  guestHeader: string;
  status: AdisyonStatus;
  statusLabel: string;
  createdAt: string;
  createdAtFormatted: string;
  completedAtFormatted: string;
  durationLabel: string;
  totalPortions: number;
  matchingPortions: number;
  itemsSummary: string;
  note: string;
  rawAdisyon: Adisyon;
}

export interface ItemDetailReportRow {
  itemId: number;
  adisyonId: number;
  queueNumber: number;
  createdAtFormatted: string;
  guestHeader: string;
  category: string;
  productNo: number;
  productName: string;
  variationText: string;
  itemNote: string;
  quantity: number;
  itemStatus: ItemStatus;
  itemStatusLabel: string;
  durationLabel: string;
}

export interface SmartReportData {
  kpis: SmartReportKpis;
  dailyRows: DailyReportRow[];
  categoryRows: CategoryReportRow[];
  productRows: ProductReportRow[];
  adisyonRows: AdisyonReportRow[];
  itemRows: ItemDetailReportRow[];
  rangeLabel: string;
}

export function toLocalDateInputValue(ms = Date.now()): string {
  const date = new Date(ms);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function createDefaultSmartReportFilters(
  nowMs = Date.now()
): SmartReportFilters {
  const today = toLocalDateInputValue(nowMs);
  return {
    timePreset: "BUGUN",
    dateFrom: today,
    timeFrom: "00:00",
    dateTo: today,
    timeTo: "23:59",
    category: "TUMU",
    productKey: "TUMU",
    variation: "TUMU",
    statusFilter: "TUMU",
    searchQuery: "",
  };
}

function formatDurationSecondsLabel(avgSec: number, sampleCount: number): string {
  if (sampleCount <= 0) return "—";
  const mins = Math.floor(avgSec / 60);
  const rem = avgSec % 60;
  return `${mins} dk ${String(rem).padStart(2, "0")} sn`;
}

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    weekday: "short",
  }).format(new Date(y, m - 1, d));
}

function resolveTimeBounds(
  filters: SmartReportFilters,
  baseMs: number
): { startMs: number | null; endMs: number | null; rangeLabel: string } {
  const baseDate = new Date(baseMs);
  const startOfToday = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    0,
    0,
    0,
    0
  ).getTime();
  const endOfToday = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    23,
    59,
    59,
    999
  ).getTime();

  switch (filters.timePreset) {
    case "BUGUN":
      return {
        startMs: startOfToday,
        endMs: endOfToday,
        rangeLabel: `Bugün (${toLocalDateInputValue(baseMs)})`,
      };
    case "DUN": {
      const yesterdayStart = startOfToday - 24 * 60 * 60 * 1000;
      const yesterdayEnd = endOfToday - 24 * 60 * 60 * 1000;
      return {
        startMs: yesterdayStart,
        endMs: yesterdayEnd,
        rangeLabel: `Dün (${toLocalDateInputValue(yesterdayStart)})`,
      };
    }
    case "SON_7_GUN": {
      const start = startOfToday - 6 * 24 * 60 * 60 * 1000;
      return {
        startMs: start,
        endMs: endOfToday,
        rangeLabel: `Son 7 Gün (${toLocalDateInputValue(start)} - ${toLocalDateInputValue(endOfToday)})`,
      };
    }
    case "BU_AY": {
      const start = startOfToday - 29 * 24 * 60 * 60 * 1000;
      return {
        startMs: start,
        endMs: endOfToday,
        rangeLabel: `Son 30 Gün (${toLocalDateInputValue(start)} - ${toLocalDateInputValue(endOfToday)})`,
      };
    }
    case "OZEL_ARALIK": {
      const startStr = `${filters.dateFrom || toLocalDateInputValue(baseMs)}T${
        filters.timeFrom || "00:00"
      }:00`;
      const endStr = `${filters.dateTo || toLocalDateInputValue(baseMs)}T${
        filters.timeTo || "23:59"
      }:59.999`;
      const parsedStart = new Date(startStr).getTime();
      const parsedEnd = new Date(endStr).getTime();
      const startMs = Number.isFinite(parsedStart) ? parsedStart : null;
      const endMs = Number.isFinite(parsedEnd) ? parsedEnd : null;
      return {
        startMs,
        endMs,
        rangeLabel: `${filters.dateFrom} ${filters.timeFrom || "00:00"} — ${filters.dateTo} ${filters.timeTo || "23:59"}`,
      };
    }
    case "TUMU":
    default:
      return {
        startMs: null,
        endMs: null,
        rangeLabel: "Tüm Kayıtlı Dönemler",
      };
  }
}

export function buildFilterSummaryText(filters: SmartReportFilters): string {
  const parts: string[] = [];
  const timeLabels: Record<ReportTimePreset, string> = {
    BUGUN: "Bugün",
    DUN: "Dün",
    SON_7_GUN: "Son 7 Gün",
    BU_AY: "Son 30 Gün",
    TUMU: "Tüm Zamanlar",
    OZEL_ARALIK: `${filters.dateFrom} ${filters.timeFrom || "00:00"} - ${filters.dateTo} ${filters.timeTo || "23:59"}`,
  };
  parts.push(`Dönem: ${timeLabels[filters.timePreset]}`);
  if (filters.category !== "TUMU") parts.push(`Kategori: ${filters.category}`);
  if (filters.productKey !== "TUMU") {
    const [, name] = filters.productKey.split(":");
    parts.push(`Ürün: ${name || filters.productKey}`);
  }
  if (filters.variation !== "TUMU") parts.push(`Varyasyon: ${filters.variation}`);
  if (filters.statusFilter !== "TUMU") {
    parts.push(`Durum: ${filters.statusFilter}`);
  }
  if (filters.searchQuery.trim()) {
    parts.push(`Arama: "${filters.searchQuery.trim()}"`);
  }
  return parts.join(" | ");
}

export function buildSmartReportData(
  adisyons: Adisyon[],
  filters: SmartReportFilters,
  nowMs = Date.now()
): SmartReportData {
  const effectiveNow = nowMs > 0 ? nowMs : Date.now();
  const { startMs, endMs, rangeLabel } = resolveTimeBounds(filters, effectiveNow);
  const q = filters.searchQuery.trim().toLocaleLowerCase("tr");
  const hasItemDimensionFilter =
    filters.category !== "TUMU" ||
    filters.productKey !== "TUMU" ||
    filters.variation !== "TUMU";

  let deliveredAdisyons = 0;
  let activeAdisyons = 0;
  let cancelledAdisyons = 0;
  let totalPortions = 0;
  let deliveredPortions = 0;
  let pendingPortions = 0;
  let adisyonDeliverySecSum = 0;
  let adisyonDeliveryCount = 0;

  const dailyMap = new Map<
    string,
    {
      dateKey: string;
      totalAdisyons: number;
      deliveredCount: number;
      activeCount: number;
      cancelledCount: number;
      totalPortions: number;
      deliverySecSum: number;
      deliveryCount: number;
      productQtyMap: Map<string, number>;
    }
  >();

  const categoryMap = new Map<
    string,
    { portionCount: number; adisyonIds: Set<number> }
  >();

  const productMap = new Map<
    string,
    {
      productKey: string;
      productNo: number;
      productName: string;
      category: string;
      adisyonIds: Set<number>;
      totalQty: number;
      deliveredQty: number;
      pendingQty: number;
      deliverySecSum: number;
      deliverySecCount: number;
      variationCounts: Map<string, number>;
    }
  >();

  const adisyonRows: AdisyonReportRow[] = [];
  const itemRows: ItemDetailReportRow[] = [];

  for (const adisyon of adisyons) {
    const createdMs = new Date(adisyon.createdAt).getTime();
    if (startMs !== null && createdMs < startMs) continue;
    if (endMs !== null && createdMs > endMs) continue;

    if (filters.statusFilter === "AKTIF") {
      if (adisyon.status === "TESLIM_EDILDI" || adisyon.status === "IPTAL") {
        continue;
      }
    } else if (filters.statusFilter !== "TUMU") {
      if (adisyon.status !== filters.statusFilter) continue;
    }

    const exactQueueQuery = q.startsWith("#") ? q.slice(1).trim() : "";
    const headerMatches =
      !q ||
      (exactQueueQuery
        ? String(adisyon.queueNumber) === exactQueueQuery
        : String(adisyon.queueNumber).includes(q) ||
          (adisyon.tableNumber ?? "").includes(q) ||
          adisyon.roomNumber.toLocaleLowerCase("tr").includes(q) ||
          adisyon.guestName.toLocaleLowerCase("tr").includes(q) ||
          adisyon.note.toLocaleLowerCase("tr").includes(q));

    const matchingItems = adisyon.items.filter((item) => {
      const cat = item.category || "Diğer";
      if (filters.category !== "TUMU" && cat !== filters.category) return false;
      const pKey = `${item.productNo}:${item.productName}`;
      if (filters.productKey !== "TUMU" && pKey !== filters.productKey) {
        return false;
      }
      const vKey = formatVariationKey(item.variations);
      if (filters.variation !== "TUMU" && vKey !== filters.variation) {
        return false;
      }
      if (q && !headerMatches) {
        const itemTextMatch =
          item.productName.toLocaleLowerCase("tr").includes(q) ||
          cat.toLocaleLowerCase("tr").includes(q) ||
          item.itemNote.toLocaleLowerCase("tr").includes(q) ||
          vKey.toLocaleLowerCase("tr").includes(q);
        if (!itemTextMatch) return false;
      }
      return true;
    });

    if (matchingItems.length === 0) {
      if (hasItemDimensionFilter || q || adisyon.items.length > 0) continue;
    }

    const isDone =
      adisyon.status === "TESLIM_EDILDI" || adisyon.status === "IPTAL";
    const dur = formatLiveDuration(
      adisyon.createdAt,
      isDone ? adisyon.completedAt || adisyon.updatedAt : effectiveNow
    );

    let deliverySeconds: number | null = null;
    if (adisyon.status === "TESLIM_EDILDI") {
      deliveredAdisyons += 1;
      const doneMs = new Date(
        adisyon.completedAt || adisyon.updatedAt
      ).getTime();
      if (Number.isFinite(doneMs) && doneMs >= createdMs) {
        deliverySeconds = Math.floor((doneMs - createdMs) / 1000);
        adisyonDeliverySecSum += deliverySeconds;
        adisyonDeliveryCount += 1;
      }
    } else if (adisyon.status === "IPTAL") {
      cancelledAdisyons += 1;
    } else {
      activeAdisyons += 1;
    }

    const totalAdisyonPortions = adisyon.items.reduce(
      (sum, it) => sum + it.quantity,
      0
    );
    const matchingPortions = matchingItems.reduce(
      (sum, it) => sum + it.quantity,
      0
    );
    const guestHeader = formatGuestHeader(adisyon);

    adisyonRows.push({
      id: adisyon.id,
      queueNumber: adisyon.queueNumber,
      tableNumber: adisyon.tableNumber ?? "",
      tableLabel: formatTableLabel(adisyon.tableNumber ?? ""),
      roomNumber: adisyon.roomNumber,
      guestName: adisyon.guestName,
      guestHeader,
      status: adisyon.status,
      statusLabel: ADISYON_STATUS_META[adisyon.status].label,
      createdAt: adisyon.createdAt,
      createdAtFormatted: formatDateTime(adisyon.createdAt),
      completedAtFormatted: adisyon.completedAt
        ? formatDateTime(adisyon.completedAt)
        : "—",
      durationLabel: dur.label,
      totalPortions: totalAdisyonPortions,
      matchingPortions,
      itemsSummary: matchingItems
        .map(
          (i) =>
            `${i.quantity}x ${i.productName}${
              i.variations.length > 0 ? ` (${i.variations.join(", ")})` : ""
            }`
        )
        .join(", "),
      note: adisyon.note,
      rawAdisyon: adisyon,
    });

    const dateKey = toLocalDateInputValue(createdMs);
    let daily = dailyMap.get(dateKey);
    if (!daily) {
      daily = {
        dateKey,
        totalAdisyons: 0,
        deliveredCount: 0,
        activeCount: 0,
        cancelledCount: 0,
        totalPortions: 0,
        deliverySecSum: 0,
        deliveryCount: 0,
        productQtyMap: new Map(),
      };
      dailyMap.set(dateKey, daily);
    }

    daily.totalAdisyons += 1;
    if (adisyon.status === "TESLIM_EDILDI") {
      daily.deliveredCount += 1;
      if (deliverySeconds !== null) {
        daily.deliverySecSum += deliverySeconds;
        daily.deliveryCount += 1;
      }
    } else if (adisyon.status === "IPTAL") {
      daily.cancelledCount += 1;
    } else {
      daily.activeCount += 1;
    }

    const includeInProductionStats =
      adisyon.status !== "IPTAL" || filters.statusFilter === "IPTAL";

    for (const item of matchingItems) {
      const cat = item.category || "Diğer";
      const pKey = `${item.productNo}:${item.productName}`;
      const vKey = formatVariationKey(item.variations);

      itemRows.push({
        itemId: item.id,
        adisyonId: adisyon.id,
        queueNumber: adisyon.queueNumber,
        createdAtFormatted: formatDateTime(adisyon.createdAt),
        guestHeader,
        category: cat,
        productNo: item.productNo,
        productName: item.productName,
        variationText: vKey,
        itemNote: item.itemNote,
        quantity: item.quantity,
        itemStatus: item.status,
        itemStatusLabel: ITEM_STATUS_META[item.status].label,
        durationLabel: dur.label,
      });

      if (!includeInProductionStats) continue;

      totalPortions += item.quantity;
      daily.totalPortions += item.quantity;
      daily.productQtyMap.set(
        item.productName,
        (daily.productQtyMap.get(item.productName) ?? 0) + item.quantity
      );

      if (
        adisyon.status === "TESLIM_EDILDI" ||
        item.status === "TESLIM_EDILDI"
      ) {
        deliveredPortions += item.quantity;
      } else if (adisyon.status !== "IPTAL") {
        pendingPortions += item.quantity;
      }

      let catEntry = categoryMap.get(cat);
      if (!catEntry) {
        catEntry = { portionCount: 0, adisyonIds: new Set() };
        categoryMap.set(cat, catEntry);
      }
      catEntry.portionCount += item.quantity;
      catEntry.adisyonIds.add(adisyon.id);

      let prodEntry = productMap.get(pKey);
      if (!prodEntry) {
        prodEntry = {
          productKey: pKey,
          productNo: item.productNo,
          productName: item.productName,
          category: cat,
          adisyonIds: new Set(),
          totalQty: 0,
          deliveredQty: 0,
          pendingQty: 0,
          deliverySecSum: 0,
          deliverySecCount: 0,
          variationCounts: new Map(),
        };
        productMap.set(pKey, prodEntry);
      }

      prodEntry.adisyonIds.add(adisyon.id);
      prodEntry.totalQty += item.quantity;
      if (
        adisyon.status === "TESLIM_EDILDI" ||
        item.status === "TESLIM_EDILDI"
      ) {
        prodEntry.deliveredQty += item.quantity;
      } else if (adisyon.status !== "IPTAL") {
        prodEntry.pendingQty += item.quantity;
      }

      if (deliverySeconds !== null) {
        prodEntry.deliverySecSum += deliverySeconds;
        prodEntry.deliverySecCount += 1;
      }

      prodEntry.variationCounts.set(
        vKey,
        (prodEntry.variationCounts.get(vKey) ?? 0) + item.quantity
      );
    }
  }

  const dailyRows: DailyReportRow[] = Array.from(dailyMap.values())
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .map((d) => {
      let topProduct = "—";
      let topQty = 0;
      for (const [name, qty] of d.productQtyMap.entries()) {
        if (qty > topQty) {
          topQty = qty;
          topProduct = `${name} (${qty})`;
        }
      }
      return {
        dateKey: d.dateKey,
        dateLabel: formatDayLabel(d.dateKey),
        totalAdisyons: d.totalAdisyons,
        deliveredCount: d.deliveredCount,
        activeCount: d.activeCount,
        cancelledCount: d.cancelledCount,
        totalPortions: d.totalPortions,
        topProduct,
        avgDeliveryLabel: formatDurationSecondsLabel(
          d.deliveryCount > 0 ? Math.round(d.deliverySecSum / d.deliveryCount) : 0,
          d.deliveryCount
        ),
      };
    });

  const categoryRows: CategoryReportRow[] = Array.from(categoryMap.entries())
    .map(([category, val]) => ({
      category,
      portionCount: val.portionCount,
      orderCount: val.adisyonIds.size,
      percent:
        totalPortions > 0 ? Math.round((val.portionCount / totalPortions) * 100) : 0,
    }))
    .sort((a, b) => b.portionCount - a.portionCount);

  const productRows: ProductReportRow[] = Array.from(productMap.values())
    .map((p) => ({
      productKey: p.productKey,
      productNo: p.productNo,
      productName: p.productName,
      category: p.category,
      orderCount: p.adisyonIds.size,
      totalQty: p.totalQty,
      deliveredQty: p.deliveredQty,
      pendingQty: p.pendingQty,
      sharePercent:
        totalPortions > 0 ? Math.round((p.totalQty / totalPortions) * 100) : 0,
      avgDeliveryLabel: formatDurationSecondsLabel(
        p.deliverySecCount > 0
          ? Math.round(p.deliverySecSum / p.deliverySecCount)
          : 0,
        p.deliverySecCount
      ),
      variationList: Array.from(p.variationCounts.entries())
        .map(([variationKey, count]) => ({ variationKey, count }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.totalQty - a.totalQty || a.productNo - b.productNo);

  const avgDeliveryLabel = formatDurationSecondsLabel(
    adisyonDeliveryCount > 0
      ? Math.round(adisyonDeliverySecSum / adisyonDeliveryCount)
      : 0,
    adisyonDeliveryCount
  );

  const topProductLabel =
    productRows.length > 0
      ? `${productRows[0].productName} (${productRows[0].totalQty} adet)`
      : "—";
  const topCategoryLabel =
    categoryRows.length > 0
      ? `${categoryRows[0].category} (%${categoryRows[0].percent})`
      : "—";

  return {
    kpis: {
      totalAdisyons: adisyonRows.length,
      deliveredAdisyons,
      activeAdisyons,
      cancelledAdisyons,
      totalPortions,
      deliveredPortions,
      pendingPortions,
      uniqueProducts: productRows.length,
      avgDeliveryLabel,
      topProductLabel,
      topCategoryLabel,
    },
    dailyRows,
    categoryRows,
    productRows,
    adisyonRows,
    itemRows,
    rangeLabel,
  };
}

/* -------------------------------------------------------------------------- */
/* Pure TypeScript Multi-Sheet OOXML (.xlsx) Generator                        */
/* -------------------------------------------------------------------------- */

type CellValue = string | number;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createStoredZip(entries: Array<{ name: string; content: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((Math.max(1980, now.getFullYear()) - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const checksum = crc32(dataBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lView = new DataView(localHeader.buffer);
    lView.setUint32(0, 0x04034b50, true);
    lView.setUint16(4, 20, true);
    lView.setUint16(6, 0x0800, true); // UTF-8 filename flag
    lView.setUint16(8, 0, true); // STORED
    lView.setUint16(10, dosTime, true);
    lView.setUint16(12, dosDate, true);
    lView.setUint32(14, checksum, true);
    lView.setUint32(18, dataBytes.length, true);
    lView.setUint32(22, dataBytes.length, true);
    lView.setUint16(26, nameBytes.length, true);
    lView.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cView = new DataView(centralHeader.buffer);
    cView.setUint32(0, 0x02014b50, true);
    cView.setUint16(4, 20, true);
    cView.setUint16(6, 20, true);
    cView.setUint16(8, 0x0800, true);
    cView.setUint16(10, 0, true);
    cView.setUint16(12, dosTime, true);
    cView.setUint16(14, dosDate, true);
    cView.setUint32(16, checksum, true);
    cView.setUint32(20, dataBytes.length, true);
    cView.setUint32(24, dataBytes.length, true);
    cView.setUint16(28, nameBytes.length, true);
    cView.setUint16(30, 0, true);
    cView.setUint16(32, 0, true);
    cView.setUint16(34, 0, true);
    cView.setUint16(36, 0, true);
    cView.setUint32(38, 0, true);
    cView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const eocd = new Uint8Array(22);
  const eView = new DataView(eocd.buffer);
  eView.setUint32(0, 0x06054b50, true);
  eView.setUint16(4, 0, true);
  eView.setUint16(6, 0, true);
  eView.setUint16(8, entries.length, true);
  eView.setUint16(10, entries.length, true);
  eView.setUint32(12, centralSize, true);
  eView.setUint32(16, offset, true);
  eView.setUint16(20, 0, true);

  const totalSize = offset + centralSize + eocd.length;
  const archive = new Uint8Array(totalSize);
  let cursor = 0;
  for (const part of localParts) {
    archive.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centralParts) {
    archive.set(part, cursor);
    cursor += part.length;
  }
  archive.set(eocd, cursor);

  return archive;
}

function escapeXml(value: string): string {
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function colIndexToLetter(index: number): string {
  let num = index + 1;
  let result = "";
  while (num > 0) {
    const mod = (num - 1) % 26;
    result = String.fromCharCode(65 + mod) + result;
    num = Math.floor((num - 1) / 26);
  }
  return result;
}

interface SheetSpec {
  name: string;
  title: string;
  subtitle: string;
  headers: string[];
  rows: CellValue[][];
}

function buildWorksheetXml(spec: SheetSpec): string {
  const colCount = Math.max(1, spec.headers.length);
  const widths = new Array<number>(colCount).fill(14);

  for (let c = 0; c < spec.headers.length; c++) {
    widths[c] = Math.max(widths[c], spec.headers[c].length + 4);
  }
  for (const row of spec.rows) {
    for (let c = 0; c < colCount; c++) {
      const val = row[c];
      if (val !== undefined && val !== null) {
        widths[c] = Math.min(54, Math.max(widths[c], String(val).length + 3));
      }
    }
  }

  const colsXml = widths
    .map(
      (w, idx) =>
        `<col min="${idx + 1}" max="${idx + 1}" width="${w}" customWidth="1"/>`
    )
    .join("");

  const allRows: Array<{ styleForCell: (c: number, v: CellValue) => number; values: CellValue[] }> = [
    { styleForCell: () => 2, values: [spec.title] },
    { styleForCell: () => 3, values: [spec.subtitle] },
    { styleForCell: () => 0, values: [] },
    { styleForCell: () => 1, values: spec.headers },
    ...spec.rows.map((r) => ({
      styleForCell: (_c: number, v: CellValue) =>
        typeof v === "number" ? 5 : 4,
      values: r,
    })),
  ];

  const rowsXml = allRows
    .map((entry, rIdx) => {
      const rowNum = rIdx + 1;
      if (entry.values.length === 0) return `<row r="${rowNum}"/>`;
      const cellsXml = entry.values
        .map((val, cIdx) => {
          const ref = `${colIndexToLetter(cIdx)}${rowNum}`;
          const styleId = entry.styleForCell(cIdx, val);
          if (typeof val === "number" && Number.isFinite(val)) {
            return `<c r="${ref}" s="${styleId}" t="n"><v>${val}</v></c>`;
          }
          const str = escapeXml(String(val ?? ""));
          return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${str}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowNum}">${cellsXml}</row>`;
    })
    .join("");

  const lastRef = `${colIndexToLetter(colCount - 1)}${Math.max(4, allRows.length)}`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastRef}"/>
  <sheetViews>
    <sheetView workbookViewId="0">
      <pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="19"/>
  <cols>${colsXml}</cols>
  <sheetData>${rowsXml}</sheetData>
</worksheet>`;
}

function buildStylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><color rgb="FF0F172A"/><name val="Calibri"/></font>
    <font><i/><sz val="10"/><color rgb="FF475569"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
  </cellXfs>
</styleSheet>`;
}

export function downloadSmartReportXlsx(
  report: SmartReportData,
  filterSummaryText: string
): void {
  const generatedLabel = formatDateTime(new Date().toISOString());
  const subtitle = `Oluşturma: ${generatedLabel} | ${filterSummaryText}`;

  const summaryRows: CellValue[][] = [
    ...report.dailyRows.map((d) => [
      d.dateLabel,
      d.totalAdisyons,
      d.deliveredCount,
      d.activeCount,
      d.cancelledCount,
      d.totalPortions,
      d.avgDeliveryLabel,
      d.topProduct,
    ]),
    [],
    ["KATEGORİ BAZLI DAĞILIM", "Porsiyon", "Adisyon Sayısı", "Pay (%)", "", "", "", ""],
    ...report.categoryRows.map((c) => [
      c.category,
      c.portionCount,
      c.orderCount,
      `%${c.percent}`,
      "",
      "",
      "",
      "",
    ]),
  ];

  const sheets: SheetSpec[] = [
    {
      name: "Genel ve Gunluk Ozet",
      title: `SHOW BÜFE — GENEL VE GÜNLÜK ÖZET RAPORU (${report.rangeLabel})`,
      subtitle,
      headers: [
        "Tarih / Gün",
        "Toplam Adisyon",
        "Teslim Edilen",
        "Aktif / Bekleyen",
        "İptal",
        "Toplam Porsiyon",
        "Ort. Teslim Süresi",
        "En Çok Sipariş Edilen Ürün",
      ],
      rows: summaryRows,
    },
    {
      name: "Urun Bazli Rapor",
      title: "SHOW BÜFE — ÜRÜN VE VARYASYON BAZLI RAPOR",
      subtitle,
      headers: [
        "Ürün No",
        "Ürün Adı",
        "Kategori",
        "Varyasyon Kırılımı",
        "Adisyon Sayısı",
        "Toplam Adet",
        "Teslim Edilen",
        "Bekleyen",
        "Pay (%)",
        "Ort. Teslim Süresi",
      ],
      rows: report.productRows.map((p) => [
        p.productNo,
        p.productName,
        p.category,
        p.variationList.map((v) => `${v.variationKey}: ${v.count}`).join(" | "),
        p.orderCount,
        p.totalQty,
        p.deliveredQty,
        p.pendingQty,
        `%${p.sharePercent}`,
        p.avgDeliveryLabel,
      ]),
    },
    {
      name: "Adisyon Bazli Rapor",
      title: "SHOW BÜFE — ADİSYON BAZLI RAPOR",
      subtitle,
      headers: [
        "Sıra No",
        "Masa",
        "Oda No",
        "Misafir Adı",
        "Durum",
        "Sipariş Tarihi",
        "Teslim Tarihi",
        "Süre",
        "Porsiyon",
        "Ürün İçeriği",
        "Not",
      ],
      rows: report.adisyonRows.map((a) => [
        `#${a.queueNumber}`,
        a.tableLabel || "-",
        a.roomNumber || "-",
        a.guestName || "-",
        a.statusLabel,
        a.createdAtFormatted,
        a.completedAtFormatted,
        a.durationLabel,
        a.matchingPortions,
        a.itemsSummary,
        a.note || "-",
      ]),
    },
    {
      name: "Kalem Detay Raporu",
      title: "SHOW BÜFE — KALEM VE VARYASYON MİKRO DETAY RAPORU",
      subtitle,
      headers: [
        "Sipariş Tarihi",
        "Sıra No",
        "Oda / Misafir",
        "Kategori",
        "Ürün No",
        "Ürün Adı",
        "Varyasyon",
        "Kalem Notu",
        "Adet",
        "Kalem Durumu",
        "Süre",
      ],
      rows: report.itemRows.map((it) => [
        it.createdAtFormatted,
        `#${it.queueNumber}`,
        it.guestHeader,
        it.category,
        it.productNo,
        it.productName,
        it.variationText,
        it.itemNote || "-",
        it.quantity,
        it.itemStatusLabel,
        it.durationLabel,
      ]),
    },
  ];

  const entries: Array<{ name: string; content: string }> = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  ${sheets
    .map(
      (_, idx) =>
        `<Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    )
    .join("\n  ")}
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    ${sheets
      .map(
        (s, idx) =>
          `<sheet name="${escapeXml(s.name)}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`
      )
      .join("\n    ")}
  </sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${sheets
    .map(
      (_, idx) =>
        `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`
    )
    .join("\n  ")}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: "xl/styles.xml",
      content: buildStylesXml(),
    },
    ...sheets.map((s, idx) => ({
      name: `xl/worksheets/sheet${idx + 1}.xml`,
      content: buildWorksheetXml(s),
    })),
  ];

  const zipBytes = createStoredZip(entries);
  const buffer = new ArrayBuffer(zipBytes.byteLength);
  new Uint8Array(buffer).set(zipBytes);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `show-bufe-akilli-rapor-${toLocalDateInputValue()}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
