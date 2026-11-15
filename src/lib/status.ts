import type { Adisyon, AdisyonStatus, ItemStatus } from "@/types/adisyon";

/**
 * Durum kuralları — hem sunucu (db.ts) hem tarayıcı (anında yansıtma) aynı
 * fonksiyonları kullanır; böylece ekranda görülen ile kaydedilen ayrışmaz.
 */

/** Kalem durumlarından adisyonun genel durumunu türetir. */
export function deriveAdisyonStatusFromItems(
  items: Array<{ status: ItemStatus }>
): AdisyonStatus {
  if (items.length === 0) return "BEKLIYOR";
  const allDelivered = items.every((i) => i.status === "TESLIM_EDILDI");
  if (allDelivered) return "TESLIM_EDILDI";
  const allReadyOrDelivered = items.every(
    (i) => i.status === "HAZIR" || i.status === "TESLIM_EDILDI"
  );
  if (allReadyOrDelivered) return "HAZIR";
  const anyStarted = items.some(
    (i) => i.status === "HAZIRLANIYOR" || i.status === "HAZIR"
  );
  if (anyStarted) return "HAZIRLANIYOR";
  return "BEKLIYOR";
}

/** Personelin seçebileceği kalem durumları, iş akışı sırasıyla. */
export const ITEM_STATUS_ORDER: ItemStatus[] = [
  "BEKLIYOR",
  "HAZIRLANIYOR",
  "HAZIR",
  "TESLIM_EDILDI",
];

/** Masa ızgarasında bir masanın tek bakışta okunan durumu. */
export type TableTone = "READY" | "PREPARING" | "WAITING";

export interface TableSummary {
  tone: TableTone;
  /** Henüz teslim edilmemiş, servise hazır porsiyon sayısı */
  readyPortions: number;
  /** Henüz teslim edilmemiş toplam porsiyon */
  openPortions: number;
  /** Masadaki en eski açık adisyonun açılış zamanı (ISO) */
  oldestCreatedAt: string;
}

/**
 * Bir masadaki açık adisyonları tek bir renge/duruma indirger.
 *
 * Öncelik kuralı (garsonun işine göre): masada götürülecek hazır ürün varsa
 * masa "READY" görünür — çünkü garsondan aksiyon bekleyen tek durum budur.
 * Hazır ürün yoksa ocakta olan varsa "PREPARING", hiçbiri yoksa "WAITING".
 *
 * İşletmenize göre değiştirmek isterseniz tek yer burası: örneğin masayı
 * ancak TÜM ürünler hazır olunca yeşil göstermek için `readyPortions > 0`
 * yerine `readyPortions === openPortions` yazmanız yeterli.
 */
export function summarizeTable(adisyons: Adisyon[]): TableSummary | null {
  if (adisyons.length === 0) return null;

  let readyPortions = 0;
  let preparingPortions = 0;
  let openPortions = 0;
  let oldestCreatedAt = adisyons[0].createdAt;

  for (const adisyon of adisyons) {
    if (adisyon.createdAt < oldestCreatedAt) {
      oldestCreatedAt = adisyon.createdAt;
    }
    for (const item of adisyon.items) {
      if (item.status === "TESLIM_EDILDI") continue;
      openPortions += item.quantity;
      if (item.status === "HAZIR") readyPortions += item.quantity;
      if (item.status === "HAZIRLANIYOR") preparingPortions += item.quantity;
    }
  }

  const tone: TableTone =
    readyPortions > 0
      ? "READY"
      : preparingPortions > 0
        ? "PREPARING"
        : "WAITING";

  return { tone, readyPortions, openPortions, oldestCreatedAt };
}
