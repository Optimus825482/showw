"use client";

import {
  Check,
  CheckCheck,
  Clock,
  Flame,
  Printer,
  RotateCcw,
  Timer,
  Undo2,
  User,
} from "lucide-react";
import {
  ADISYON_STATUS_META,
  ITEM_STATUS_META,
  formatClockTimeWithSeconds,
  formatGuestHeader,
  formatLiveDuration,
} from "@/lib/formatters";
import type { Adisyon, AdisyonStatus, ItemStatus } from "@/types/adisyon";

interface AdisyonCardProps {
  adisyon: Adisyon;
  nowMs: number;
  allowItemToggle?: boolean;
  showPrintButton?: boolean;
  compact?: boolean;
  onUpdateStatus: (adisyonId: number, status: AdisyonStatus) => Promise<void>;
  onUpdateItemStatus?: (
    adisyonId: number,
    itemId: number,
    status: ItemStatus
  ) => Promise<void>;
  onPrint?: (adisyon: Adisyon) => void;
}

function getNextItemStatus(current: ItemStatus): ItemStatus {
  if (current === "BEKLIYOR") return "HAZIRLANIYOR";
  if (current === "HAZIRLANIYOR") return "HAZIR";
  if (current === "HAZIR") return "BEKLIYOR";
  return "TESLIM_EDILDI";
}

function getPrevItemStatus(current: ItemStatus): ItemStatus | null {
  if (current === "HAZIRLANIYOR") return "BEKLIYOR";
  if (current === "HAZIR") return "HAZIRLANIYOR";
  if (current === "TESLIM_EDILDI") return "HAZIR";
  return null;
}

export function AdisyonCard({
  adisyon,
  nowMs,
  allowItemToggle = true,
  showPrintButton = false,
  compact = false,
  onUpdateStatus,
  onUpdateItemStatus,
  onPrint,
}: AdisyonCardProps) {
  const statusMeta = ADISYON_STATUS_META[adisyon.status];
  const isCompleted =
    adisyon.status === "TESLIM_EDILDI" || adisyon.status === "IPTAL";
  const totalPortions = adisyon.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const durationInfo = formatLiveDuration(
    adisyon.createdAt,
    isCompleted ? adisyon.completedAt || adisyon.updatedAt : nowMs
  );
  const urgencyBadgeClass =
    durationInfo.urgency === "critical"
      ? "border-rose-300 bg-rose-50 text-rose-800"
      : durationInfo.urgency === "warning"
      ? "border-amber-300 bg-amber-50 text-amber-900"
      : "border-sky-200 bg-sky-50 text-sky-900";

  return (
    <article
      className={`rounded-2xl border border-slate-200 border-l-4 ${statusMeta.borderClass} bg-white shadow-sm transition-shadow hover:shadow-md flex flex-col`}
    >
      {/* Card Header */}
      <div className="border-b border-slate-100 px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-lg bg-slate-900 px-2.5 py-1 text-sm font-extrabold tracking-wide text-white">
                SIRA #{adisyon.queueNumber}
              </span>
              <span
                className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-bold ${statusMeta.badgeClass}`}
              >
                {statusMeta.label}
              </span>
              {adisyon.printedAt && (
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  <Printer className="h-3 w-3" aria-hidden="true" />
                  Yazdırıldı
                </span>
              )}
            </div>

            <div className="mt-2 flex items-center gap-1.5 text-base font-extrabold text-slate-900">
              <User
                className="h-4 w-4 shrink-0 text-sky-600"
                aria-hidden="true"
              />
              <span className="truncate">{formatGuestHeader(adisyon)}</span>
            </div>
          </div>

          <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
            {totalPortions} porsiyon
          </span>
        </div>

        {/* Sipariş Saati ve Canlı Geçen Süre Bandı */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs">
          <div className="inline-flex items-center gap-1.5 font-bold text-slate-700">
            <Clock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
            <span>Saat: {formatClockTimeWithSeconds(adisyon.createdAt)}</span>
            {isCompleted && adisyon.completedAt && (
              <span className="text-emerald-700">
                • Teslim: {formatClockTimeWithSeconds(adisyon.completedAt)}
              </span>
            )}
          </div>

          {!isCompleted ? (
            <div
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 font-extrabold tabular-nums ${urgencyBadgeClass}`}
            >
              <Timer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Geçen: {durationInfo.label}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-bold text-slate-700 tabular-nums">
              <Timer
                className="h-3.5 w-3.5 shrink-0 text-slate-500"
                aria-hidden="true"
              />
              <span>Toplam Süre: {durationInfo.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Items List */}
      <div className={`flex-1 px-4 ${compact ? "py-2.5" : "py-3"} space-y-2`}>
        {adisyon.items.map((item) => {
          const itemMeta = ITEM_STATUS_META[item.status];
          const isReady = item.status === "HAZIR";
          const isDelivered = item.status === "TESLIM_EDILDI";

          return (
            <div
              key={item.id}
              className={`flex items-start justify-between gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                isReady
                  ? "border-emerald-200 bg-emerald-50/50"
                  : item.status === "HAZIRLANIYOR"
                  ? "border-sky-200 bg-sky-50/50"
                  : "border-slate-200/80 bg-slate-50/60"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="inline-flex items-center justify-center rounded-md bg-slate-900 px-1.5 py-0.5 text-xs font-extrabold text-white">
                    {item.quantity}x
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      isDelivered
                        ? "line-through text-slate-400"
                        : "text-slate-900"
                    }`}
                  >
                    {item.productName}
                  </span>
                </div>

                {item.variations.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.variations.map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center rounded-md border border-sky-200 bg-white px-2 py-0.5 text-[11px] font-bold text-sky-800"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                )}

                {item.itemNote && (
                  <p className="mt-1 text-xs font-semibold text-amber-800">
                    Not: {item.itemNote}
                  </p>
                )}
              </div>

              {allowItemToggle && onUpdateItemStatus && !isCompleted ? (
                <div className="flex items-center gap-1 shrink-0">
                  {getPrevItemStatus(item.status) && (
                    <button
                      type="button"
                      onClick={() => {
                        const prevStatus = getPrevItemStatus(item.status);
                        if (prevStatus) {
                          void onUpdateItemStatus(
                            adisyon.id,
                            item.id,
                            prevStatus
                          );
                        }
                      }}
                      title="Önceki duruma geri al"
                      aria-label={`${item.productName} durumunu geri al`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 active:scale-95"
                    >
                      <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      void onUpdateItemStatus(
                        adisyon.id,
                        item.id,
                        getNextItemStatus(item.status)
                      )
                    }
                    title="Kalem durumunu ilerlet (Bekliyor → Ocakta → Hazır)"
                    className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${itemMeta.badgeClass}`}
                  >
                    {itemMeta.label}
                  </button>
                </div>
              ) : (
                <span
                  className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] font-bold ${itemMeta.badgeClass}`}
                >
                  {itemMeta.label}
                </span>
              )}
            </div>
          );
        })}

        {adisyon.note && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            Adisyon Notu: {adisyon.note}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 rounded-b-2xl">
        {showPrintButton && onPrint && (
          <button
            type="button"
            onClick={() => onPrint(adisyon)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-[0.98]"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>Yazdır</span>
          </button>
        )}

        {!isCompleted ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {adisyon.status === "HAZIRLANIYOR" && (
              <button
                type="button"
                onClick={() => void onUpdateStatus(adisyon.id, "BEKLIYOR")}
                title="Bir önceki duruma (Bekliyor) geri al"
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-[0.98]"
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Geri Al (Bekliyor)</span>
              </button>
            )}

            {adisyon.status === "HAZIR" && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    void onUpdateStatus(adisyon.id, "HAZIRLANIYOR")
                  }
                  title="Bir önceki duruma (Hazırlanıyor) geri al"
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-[0.98]"
                >
                  <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Geri Al (Hazırlanıyor)</span>
                </button>
                <button
                  type="button"
                  onClick={() => void onUpdateStatus(adisyon.id, "BEKLIYOR")}
                  title="Bekleyen durumuna geri al"
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 active:scale-[0.98]"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Bekleyene Al</span>
                </button>
              </>
            )}

            {adisyon.status === "BEKLIYOR" && (
              <button
                type="button"
                onClick={() => void onUpdateStatus(adisyon.id, "HAZIRLANIYOR")}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100 active:scale-[0.98]"
              >
                <Flame className="h-4 w-4" aria-hidden="true" />
                <span>Hazırlanıyor</span>
              </button>
            )}

            {adisyon.status !== "HAZIR" && (
              <button
                type="button"
                onClick={() => void onUpdateStatus(adisyon.id, "HAZIR")}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98]"
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Toplandı / Hazır</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void onUpdateStatus(adisyon.id, "TESLIM_EDILDI")}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-[0.98]"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              <span>Teslim Edildi</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {adisyon.status === "TESLIM_EDILDI" && (
              <button
                type="button"
                onClick={() => void onUpdateStatus(adisyon.id, "HAZIR")}
                title="Bir önceki duruma (Toplandı / Hazır) geri al"
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 active:scale-[0.98]"
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Geri Al (Hazır)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => void onUpdateStatus(adisyon.id, "BEKLIYOR")}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-[0.98]"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Bekleyene Geri Al</span>
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
