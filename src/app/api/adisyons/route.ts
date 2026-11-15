import { NextRequest, NextResponse } from "next/server";
import { createAdisyon, getPrinterStatus, listAdisyons } from "@/lib/db";
import { buildGroupedBatches } from "@/lib/grouping";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [{ adisyons, dbMode, dbNotice }, printerStatus] = await Promise.all([
      listAdisyons(),
      getPrinterStatus(false),
    ]);
    const groupedBatches = buildGroupedBatches(adisyons, true);
    return NextResponse.json({
      adisyons,
      groupedBatches,
      printerConfig: printerStatus.printerConfig,
      hasActivePrinter: printerStatus.hasActivePrinter,
      dbMode,
      dbNotice,
    });
  } catch (error) {
    console.error("GET /api/adisyons error:", error);
    return NextResponse.json(
      { error: "Adisyonlar alınırken bir hata oluştu." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      roomNumber?: string;
      guestName?: string;
      note?: string;
      markPrinted?: boolean;
      items?: Array<{
        menuItemId: number;
        productNo: number;
        productName: string;
        category?: string;
        variations?: string[];
        quantity?: number;
        itemNote?: string;
      }>;
    };

    const roomNumber = (body.roomNumber ?? "").trim();
    const guestName = (body.guestName ?? "").trim();

    if (!roomNumber && !guestName) {
      return NextResponse.json(
        {
          error:
            "Adisyon başlatmak için Oda Numarası veya Misafir Adı alanlarından en az birini giriniz.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Adisyonda en az bir ürün bulunmalıdır." },
        { status: 400 }
      );
    }

    const sanitizedItems = body.items.map((item) => ({
      menuItemId: Number(item.menuItemId),
      productNo: Number(item.productNo),
      productName: String(item.productName ?? "").trim(),
      category: String(item.category ?? "").trim(),
      variations: Array.isArray(item.variations)
        ? item.variations.map((v) => String(v).trim()).filter(Boolean)
        : [],
      quantity: Math.max(1, Number(item.quantity || 1)),
      itemNote: String(item.itemNote ?? "").trim(),
    }));

    if (sanitizedItems.some((i) => !i.productName || Number.isNaN(i.productNo))) {
      return NextResponse.json(
        { error: "Geçersiz ürün bilgisi gönderildi." },
        { status: 400 }
      );
    }

    const result = await createAdisyon({
      roomNumber,
      guestName,
      note: body.note ?? "",
      markPrinted: Boolean(body.markPrinted),
      items: sanitizedItems,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("POST /api/adisyons error:", error);
    return NextResponse.json(
      { error: "Adisyon kaydedilirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
