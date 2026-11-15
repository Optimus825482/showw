import type { Adisyon, AdisyonStatus, ItemStatus } from "@/types/adisyon";
import { formatTableLabel } from "@/lib/tables";

export const ADISYON_STATUS_META: Record<
  AdisyonStatus,
  { label: string; badgeClass: string; borderClass: string }
> = {
  BEKLIYOR: {
    label: "Bekliyor",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
    borderClass: "border-l-amber-500",
  },
  HAZIRLANIYOR: {
    label: "Hazırlanıyor",
    badgeClass: "bg-sky-100 text-sky-900 border-sky-300",
    borderClass: "border-l-sky-500",
  },
  HAZIR: {
    label: "Toplandı / Hazır",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    borderClass: "border-l-emerald-500",
  },
  TESLIM_EDILDI: {
    label: "Teslim Edildi",
    badgeClass: "bg-slate-200 text-slate-800 border-slate-300",
    borderClass: "border-l-slate-400",
  },
  IPTAL: {
    label: "İptal",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-300",
    borderClass: "border-l-rose-400",
  },
};

export const ITEM_STATUS_META: Record<
  ItemStatus,
  { label: string; badgeClass: string }
> = {
  BEKLIYOR: {
    label: "Bekliyor",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  HAZIRLANIYOR: {
    label: "Ocakta",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200",
  },
  HAZIR: {
    label: "Hazır",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  TESLIM_EDILDI: {
    label: "Teslim",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

export function formatClockTime(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return "";
  }
}

export function formatClockTimeWithSeconds(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return "";
  }
}

export function formatLiveDuration(
  startIso: string,
  endIsoOrNowMs: string | number
): {
  text: string;
  label: string;
  mins: number;
  urgency: "normal" | "warning" | "critical";
} {
  const endMs =
    typeof endIsoOrNowMs === "number"
      ? endIsoOrNowMs
      : new Date(endIsoOrNowMs).getTime();
  if (!endMs || endMs <= 0) {
    return { text: "00:00", label: "0 dk 00 sn", mins: 0, urgency: "normal" };
  }
  const startMs = new Date(startIso).getTime();
  const totalSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const totalMins = Math.floor(totalSec / 60);

  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  const text =
    hours > 0 ? `${String(hours).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
  const label =
    hours > 0
      ? `${hours} sa ${mins} dk ${secs} sn`
      : totalMins > 0
      ? `${totalMins} dk ${ss} sn`
      : `${secs} sn`;

  const urgency =
    totalMins >= 10 ? "critical" : totalMins >= 5 ? "warning" : "normal";

  return { text, label, mins: totalMins, urgency };
}

export function formatDateTime(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export function formatElapsedMinutes(isoString: string, nowMs: number): string {
  if (nowMs <= 0) return "Az önce";
  const diffMs = Math.max(0, nowMs - new Date(isoString).getTime());
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Az önce";
  if (mins < 60) return `${mins} dk`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hours} sa ${rem} dk`;
}

export function formatGuestHeader(
  adisyon: Pick<Adisyon, "tableNumber" | "roomNumber" | "guestName">
): string {
  const parts: string[] = [];
  const tableLabel = formatTableLabel(adisyon.tableNumber ?? "");
  if (tableLabel) parts.push(tableLabel);
  if (adisyon.roomNumber) parts.push(`Oda ${adisyon.roomNumber}`);
  if (adisyon.guestName) parts.push(adisyon.guestName);
  return parts.join(" • ") || "Misafir";
}
