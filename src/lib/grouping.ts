import type {
  Adisyon,
  GroupedProductBatch,
  GroupedVariationBreakdown,
} from "@/types/adisyon";

export function formatVariationKey(variations: string[]): string {
  if (!variations || variations.length === 0) return "STANDART";
  return [...variations].sort((a, b) => a.localeCompare(b, "tr")).join(" + ");
}

/**
 * Aktif (TESLIM_EDILDI veya IPTAL olmayan) adisyonlardaki tüm kalemleri
 * ürün ve varyasyon bazında gruplayarak mutfak ekranına sunar.
 */
export function buildGroupedBatches(
  adisyons: Adisyon[],
  includeReadyItems = true
): GroupedProductBatch[] {
  const activeAdisyons = adisyons
    .filter((a) => a.status !== "TESLIM_EDILDI" && a.status !== "IPTAL")
    .sort((a, b) => a.queueNumber - b.queueNumber);

  const productMap = new Map<
    string,
    {
      productNo: number;
      productName: string;
      category: string;
      totalQuantity: number;
      pendingQuantity: number;
      preparingQuantity: number;
      readyQuantity: number;
      breakdownMap: Map<string, GroupedVariationBreakdown>;
    }
  >();

  for (const adisyon of activeAdisyons) {
    for (const item of adisyon.items) {
      if (item.status === "TESLIM_EDILDI") continue;
      if (!includeReadyItems && item.status === "HAZIR") continue;

      const productKey = `${item.productNo}:${item.productName}`;
      let productGroup = productMap.get(productKey);

      if (!productGroup) {
        productGroup = {
          productNo: item.productNo,
          productName: item.productName,
          category: item.category,
          totalQuantity: 0,
          pendingQuantity: 0,
          preparingQuantity: 0,
          readyQuantity: 0,
          breakdownMap: new Map(),
        };
        productMap.set(productKey, productGroup);
      }

      productGroup.totalQuantity += item.quantity;
      if (item.status === "BEKLIYOR") {
        productGroup.pendingQuantity += item.quantity;
      } else if (item.status === "HAZIRLANIYOR") {
        productGroup.preparingQuantity += item.quantity;
      } else if (item.status === "HAZIR") {
        productGroup.readyQuantity += item.quantity;
      }

      const variationKey = formatVariationKey(item.variations);
      let breakdown = productGroup.breakdownMap.get(variationKey);
      if (!breakdown) {
        breakdown = {
          variationKey,
          variations: item.variations,
          totalQuantity: 0,
          waitingQuantity: 0,
          preparingQuantity: 0,
          readyQuantity: 0,
          itemIds: [],
          orders: [],
        };
        productGroup.breakdownMap.set(variationKey, breakdown);
      }

      breakdown.totalQuantity += item.quantity;
      if (item.status === "BEKLIYOR") {
        breakdown.waitingQuantity += item.quantity;
      } else if (item.status === "HAZIRLANIYOR") {
        breakdown.preparingQuantity += item.quantity;
      } else if (item.status === "HAZIR") {
        breakdown.readyQuantity += item.quantity;
      }

      breakdown.itemIds.push(item.id);
      breakdown.orders.push({
        adisyonId: adisyon.id,
        queueNumber: adisyon.queueNumber,
        roomNumber: adisyon.roomNumber,
        guestName: adisyon.guestName,
        itemId: item.id,
        quantity: item.quantity,
        status: item.status,
        itemNote: item.itemNote,
      });
    }
  }

  return Array.from(productMap.values())
    .map((group) => ({
      productNo: group.productNo,
      productName: group.productName,
      category: group.category,
      totalQuantity: group.totalQuantity,
      pendingQuantity: group.pendingQuantity,
      preparingQuantity: group.preparingQuantity,
      readyQuantity: group.readyQuantity,
      breakdowns: Array.from(group.breakdownMap.values()).sort(
        (a, b) => b.totalQuantity - a.totalQuantity
      ),
    }))
    .sort((a, b) => {
      const aNeedsAction = a.pendingQuantity + a.preparingQuantity;
      const bNeedsAction = b.pendingQuantity + b.preparingQuantity;
      if (aNeedsAction > 0 && bNeedsAction === 0) return -1;
      if (aNeedsAction === 0 && bNeedsAction > 0) return 1;
      if (b.totalQuantity !== a.totalQuantity) {
        return b.totalQuantity - a.totalQuantity;
      }
      return a.productNo - b.productNo;
    });
}
