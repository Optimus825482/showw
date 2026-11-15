"use client";

import { formatDateTime } from "@/lib/formatters";
import { formatTableLabel } from "@/lib/tables";
import type { Adisyon } from "@/types/adisyon";

interface PrintableReceiptProps {
  adisyon: Adisyon | null;
}

export function PrintableReceipt({ adisyon }: PrintableReceiptProps) {
  if (!adisyon) return null;

  const totalPortions = adisyon.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <section id="printable-receipt" aria-label="Yazdırılabilir Adisyon Fişi">
      <div
        style={{
          borderBottom: "2px dashed #000",
          paddingBottom: "8px",
          marginBottom: "8px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "16px", fontWeight: 800 }}>SHOW BÜFE</div>
        <div style={{ fontSize: "12px", fontWeight: 700 }}>
          MUTFAK ADİSYON FİŞİ
        </div>
        <div
          style={{
            fontSize: "26px",
            fontWeight: 900,
            marginTop: "4px",
            letterSpacing: "0.04em",
          }}
        >
          SIRA #{adisyon.queueNumber}
        </div>
      </div>

      <div
        style={{
          fontSize: "13px",
          lineHeight: 1.45,
          borderBottom: "1px dashed #000",
          paddingBottom: "8px",
          marginBottom: "8px",
        }}
      >
        {adisyon.tableNumber && (
          <div style={{ fontSize: "18px", fontWeight: 900, marginBottom: "4px" }}>
            {formatTableLabel(adisyon.tableNumber).toLocaleUpperCase("tr")}
          </div>
        )}
        {adisyon.roomNumber && (
          <div>
            <strong>ODA NO:</strong> {adisyon.roomNumber}
          </div>
        )}
        {adisyon.guestName && (
          <div>
            <strong>MİSAFİR:</strong> {adisyon.guestName}
          </div>
        )}
        <div>
          <strong>TARİH:</strong> {formatDateTime(adisyon.createdAt)}
        </div>
        <div>
          <strong>ADİSYON ID:</strong> #{adisyon.id}
        </div>
      </div>

      <div
        style={{
          borderBottom: "2px dashed #000",
          paddingBottom: "8px",
          marginBottom: "8px",
        }}
      >
        {adisyon.items.map((item) => (
          <div
            key={item.id}
            style={{
              marginBottom: "7px",
              fontSize: "13px",
              lineHeight: 1.35,
            }}
          >
            <div style={{ fontWeight: 800 }}>
              {item.quantity}x {item.productName}
            </div>
            {item.variations.length > 0 && (
              <div style={{ paddingLeft: "12px", fontWeight: 700 }}>
                [{item.variations.join(" / ")}]
              </div>
            )}
            {item.itemNote && (
              <div style={{ paddingLeft: "12px", fontStyle: "italic" }}>
                Not: {item.itemNote}
              </div>
            )}
          </div>
        ))}
      </div>

      {adisyon.note && (
        <div
          style={{
            fontSize: "12px",
            marginBottom: "8px",
            paddingBottom: "6px",
            borderBottom: "1px dashed #000",
          }}
        >
          <strong>ADİSYON NOTU:</strong> {adisyon.note}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "13px",
          fontWeight: 800,
          marginBottom: "10px",
        }}
      >
        <span>TOPLAM ÜRÜN:</span>
        <span>{totalPortions} ADET</span>
      </div>

      <div style={{ textAlign: "center", fontSize: "11px" }}>
        Afiyet Olsun • Show Kitchen
      </div>
    </section>
  );
}
