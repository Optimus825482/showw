"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deriveAdisyonStatusFromItems } from "@/lib/status";
import type {
  Adisyon,
  AdisyonStatus,
  AdisyonsApiResponse,
  DbMode,
  GroupedProductBatch,
  ItemStatus,
  PrinterConfig,
} from "@/types/adisyon";

/** Başarısız bir durum değişikliğinde yayınlanan pencere olayı */
export const ACTION_ERROR_EVENT = "adisyon-action-error";

const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  enabled: false,
  printerName: "",
  autoPrint: true,
};

export function useAdisyonStream(pollIntervalMs = 2500) {
  const [adisyons, setAdisyons] = useState<Adisyon[]>([]);
  const [groupedBatches, setGroupedBatches] = useState<GroupedProductBatch[]>(
    []
  );
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(
    DEFAULT_PRINTER_CONFIG
  );
  const [hasActivePrinter, setHasActivePrinter] = useState(false);
  const [dbMode, setDbMode] = useState<DbMode>("postgres");
  const [dbNotice, setDbNotice] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const queuedRef = useRef(false);
  // Her durum değişikliğinde artar; değişiklik sırasında yola çıkmış eski bir
  // sorgunun cevabı, ekrandaki anlık (iyimser) durumu ezmesin diye kullanılır.
  const mutationSeqRef = useRef(0);

  const refresh = useCallback(async function run(): Promise<void> {
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }
    inFlightRef.current = true;
    const seqAtStart = mutationSeqRef.current;
    try {
      const res = await fetch("/api/adisyons", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Adisyon verisi alınamadı.");
      }
      const data = (await res.json()) as AdisyonsApiResponse;
      if (seqAtStart !== mutationSeqRef.current) {
        // Bu cevap bir değişiklikten önce istenmişti; bayat, yeniden sor.
        queuedRef.current = true;
        return;
      }
      setAdisyons(data.adisyons);
      setGroupedBatches(data.groupedBatches);
      if (data.printerConfig) {
        setPrinterConfig(data.printerConfig);
      }
      setHasActivePrinter(Boolean(data.hasActivePrinter));
      setDbMode(data.dbMode);
      setDbNotice(data.dbNotice);
      setError(null);
      setNowMs(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı hatası");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
      if (queuedRef.current) {
        queuedRef.current = false;
        void run();
      }
    }
  }, []);

  /** Kalem durumlarını beklemeden ekrana yansıtır (sunucu cevabı sonra doğrular). */
  const applyItemStatusLocally = useCallback(
    (itemIds: number[], status: ItemStatus, allowDelivered: boolean) => {
      const idSet = new Set(itemIds);
      const now = new Date().toISOString();
      setAdisyons((prev) =>
        prev.map((adisyon) => {
          if (adisyon.status === "IPTAL") return adisyon;
          let touched = false;
          const items = adisyon.items.map((item) => {
            if (
              !idSet.has(item.id) ||
              item.status === status ||
              (!allowDelivered && item.status === "TESLIM_EDILDI")
            ) {
              return item;
            }
            touched = true;
            return { ...item, status, updatedAt: now };
          });
          if (!touched) return adisyon;
          const nextStatus = deriveAdisyonStatusFromItems(items);
          return {
            ...adisyon,
            items,
            status: nextStatus,
            updatedAt: now,
            completedAt: nextStatus === "TESLIM_EDILDI" ? now : null,
          };
        })
      );
    },
    []
  );

  /**
   * Bir durum değişikliğini çalıştırır: hata olursa fırlatmaz, `actionError`
   * olarak ekrana bildirir ve gerçek durumu sunucudan geri yükler.
   */
  const runMutation = useCallback(
    async (
      request: () => Promise<Response>,
      fallbackMessage: string
    ): Promise<boolean> => {
      mutationSeqRef.current += 1;
      let ok = false;
      try {
        const res = await request();
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error || fallbackMessage);
        }
        ok = true;
        setActionError(null);
      } catch (err) {
        const message =
          err instanceof TypeError
            ? "Bağlantı kurulamadı. İşlem kaydedilmedi, tekrar deneyin."
            : err instanceof Error
              ? err.message
              : fallbackMessage;
        setActionError(message);
        // AppShell bu olayı dinleyip her ekranda aynı hata bandını gösterir
        window.dispatchEvent(
          new CustomEvent(ACTION_ERROR_EVENT, { detail: message })
        );
      } finally {
        mutationSeqRef.current += 1;
      }
      await refresh();
      return ok;
    },
    [refresh]
  );

  useEffect(() => {
    setNowMs(Date.now());
    void refresh();
    const pollId = window.setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      void refresh();
    }, pollIntervalMs);

    const clockId = window.setInterval(() => {
      if (
        typeof document !== "undefined" &&
        document.visibilityState === "hidden"
      ) {
        return;
      }
      setNowMs(Date.now());
    }, 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setNowMs(Date.now());
        void refresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(pollId);
      window.clearInterval(clockId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pollIntervalMs, refresh]);

  const updateAdisyonStatus = useCallback(
    (adisyonId: number, status: AdisyonStatus) =>
      runMutation(
        () =>
          fetch(`/api/adisyons/${adisyonId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }),
        "Adisyon güncellenemedi."
      ),
    [runMutation]
  );

  const updateItemStatus = useCallback(
    (adisyonId: number, itemId: number, itemStatus: ItemStatus) => {
      applyItemStatusLocally([itemId], itemStatus, true);
      return runMutation(
        () =>
          fetch(`/api/adisyons/${adisyonId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemId, itemStatus }),
          }),
        "Kalem güncellenemedi."
      );
    },
    [applyItemStatusLocally, runMutation]
  );

  const batchUpdateItems = useCallback(
    (
      itemIds: number[],
      status: ItemStatus,
      options?: { allowDelivered?: boolean }
    ) => {
      const allowDelivered = options?.allowDelivered === true;
      applyItemStatusLocally(itemIds, status, allowDelivered);
      return runMutation(
        () =>
          fetch("/api/adisyons/batch-item-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemIds, status, allowDelivered }),
          }),
        "Toplu güncelleme başarısız."
      );
    },
    [applyItemStatusLocally, runMutation]
  );

  const moveTable = useCallback(
    async (fromTable: string, toTable: string): Promise<number> => {
      const res = await fetch("/api/adisyons/move-table", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromTable, toTable }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        movedCount?: number;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(body.error || "Masa taşınamadı.");
      }
      await refresh();
      return body.movedCount ?? 0;
    },
    [refresh]
  );

  const markPrinted = useCallback(
    async (adisyonId: number) => {
      await fetch(`/api/adisyons/${adisyonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markPrinted: true }),
      }).catch(() => {});
      await refresh();
    },
    [refresh]
  );

  const updatePrinterConfig = useCallback(
    async (nextConfig: PrinterConfig) => {
      const res = await fetch("/api/printers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextConfig),
      });
      if (!res.ok) {
        throw new Error("Yazıcı ayarları kaydedilemedi.");
      }
      const data = (await res.json()) as {
        printerConfig: PrinterConfig;
        hasActivePrinter: boolean;
      };
      setPrinterConfig(data.printerConfig);
      setHasActivePrinter(Boolean(data.hasActivePrinter));
      await refresh();
    },
    [refresh]
  );

  return {
    adisyons,
    groupedBatches,
    printerConfig,
    hasActivePrinter,
    dbMode,
    dbNotice,
    loading,
    error,
    actionError,
    clearActionError: () => setActionError(null),
    nowMs,
    refresh,
    updateAdisyonStatus,
    updateItemStatus,
    batchUpdateItems,
    moveTable,
    markPrinted,
    updatePrinterConfig,
  };
}
