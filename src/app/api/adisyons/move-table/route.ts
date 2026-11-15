import { NextRequest, NextResponse } from "next/server";
import { moveTableAdisyons } from "@/lib/db";
import { isValidTableNumber } from "@/lib/tables";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      fromTable?: string;
      toTable?: string;
    };

    const fromTable = String(body.fromTable ?? "").trim();
    const toTable = String(body.toTable ?? "").trim();

    if (!isValidTableNumber(fromTable) || !isValidTableNumber(toTable)) {
      return NextResponse.json(
        { error: "Lütfen geçerli masalar seçiniz (101–133)." },
        { status: 400 }
      );
    }

    if (fromTable === toTable) {
      return NextResponse.json(
        { error: "Kaynak ve hedef masa aynı olamaz." },
        { status: 400 }
      );
    }

    const result = await moveTableAdisyons(fromTable, toTable);

    if (result.movedCount === 0) {
      return NextResponse.json(
        { error: `Masa ${fromTable} üzerinde taşınacak açık adisyon yok.` },
        { status: 409 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/adisyons/move-table error:", error);
    return NextResponse.json(
      { error: "Masa taşınırken bir hata oluştu." },
      { status: 500 }
    );
  }
}
