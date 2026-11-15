import { NextRequest, NextResponse } from "next/server";
import { updateAdisyonOrItem } from "@/lib/db";
import type { AdisyonStatus, ItemStatus } from "@/types/adisyon";

export const dynamic = "force-dynamic";

const VALID_ADISYON_STATUSES = new Set<AdisyonStatus>([
  "BEKLIYOR",
  "HAZIRLANIYOR",
  "HAZIR",
  "TESLIM_EDILDI",
  "IPTAL",
]);

const VALID_ITEM_STATUSES = new Set<ItemStatus>([
  "BEKLIYOR",
  "HAZIRLANIYOR",
  "HAZIR",
  "TESLIM_EDILDI",
]);

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const adisyonId = Number(id);
    if (!Number.isInteger(adisyonId) || adisyonId <= 0) {
      return NextResponse.json(
        { error: "Geçersiz adisyon numarası." },
        { status: 400 }
      );
    }

    const body = (await req.json()) as {
      status?: AdisyonStatus;
      itemId?: number;
      itemStatus?: ItemStatus;
      markPrinted?: boolean;
    };

    if (body.status && !VALID_ADISYON_STATUSES.has(body.status)) {
      return NextResponse.json(
        { error: "Geçersiz adisyon durumu." },
        { status: 400 }
      );
    }

    if (body.itemStatus && !VALID_ITEM_STATUSES.has(body.itemStatus)) {
      return NextResponse.json(
        { error: "Geçersiz ürün kalemi durumu." },
        { status: 400 }
      );
    }

    const result = await updateAdisyonOrItem(adisyonId, {
      status: body.status,
      itemId: body.itemId ? Number(body.itemId) : undefined,
      itemStatus: body.itemStatus,
      markPrinted: Boolean(body.markPrinted),
    });

    if (!result.adisyon) {
      return NextResponse.json(
        { error: "Adisyon bulunamadı." },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("PATCH /api/adisyons/[id] error:", error);
    return NextResponse.json(
      { error: "Adisyon güncellenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
