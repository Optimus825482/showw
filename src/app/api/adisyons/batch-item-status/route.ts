import { NextRequest, NextResponse } from "next/server";
import { batchUpdateItemStatuses } from "@/lib/db";
import type { ItemStatus } from "@/types/adisyon";

export const dynamic = "force-dynamic";

const VALID_ITEM_STATUSES = new Set<ItemStatus>([
  "BEKLIYOR",
  "HAZIRLANIYOR",
  "HAZIR",
  "TESLIM_EDILDI",
]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      itemIds?: number[];
      status?: ItemStatus;
    };

    if (!Array.isArray(body.itemIds) || body.itemIds.length === 0) {
      return NextResponse.json(
        { error: "Güncellenecek kalem kimlikleri boş olamaz." },
        { status: 400 }
      );
    }

    if (!body.status || !VALID_ITEM_STATUSES.has(body.status)) {
      return NextResponse.json(
        { error: "Geçersiz durum bilgisi." },
        { status: 400 }
      );
    }

    const numericIds = body.itemIds
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);

    const result = await batchUpdateItemStatuses(numericIds, body.status);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/adisyons/batch-item-status error:", error);
    return NextResponse.json(
      { error: "Toplu mutfak güncellemesi sırasında hata oluştu." },
      { status: 500 }
    );
  }
}
