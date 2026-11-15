import { NextRequest, NextResponse } from "next/server";
import { getPrinterStatus, savePrinterConfig } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const forceScan = req.nextUrl.searchParams.get("scan") === "1";
    const status = await getPrinterStatus(forceScan);
    return NextResponse.json(status);
  } catch (error) {
    console.error("GET /api/printers error:", error);
    return NextResponse.json(
      { error: "Yazıcı bilgisi alınamadı." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      enabled?: boolean;
      printerName?: string;
      autoPrint?: boolean;
    };

    const result = await savePrinterConfig({
      enabled: Boolean(body.enabled),
      printerName: String(body.printerName ?? "").trim(),
      autoPrint: body.autoPrint !== undefined ? Boolean(body.autoPrint) : true,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/printers error:", error);
    return NextResponse.json(
      { error: "Yazıcı ayarları kaydedilemedi." },
      { status: 500 }
    );
  }
}
