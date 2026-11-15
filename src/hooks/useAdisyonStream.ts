"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Adisyon,
  AdisyonStatus,
  AdisyonsApiResponse,
  DbMode,
  GroupedProductBatch,
  ItemStatus,
  PrinterConfig,
} from "@/types/adisyon";

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
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch("/api/adisyons", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Adisyon verisi alınamadı.");
      }
      const data = (await res.json()) as AdisyonsApiResponse;
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
    }
  }, []);

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
    async (adisyonId: number, status: AdisyonStatus) => {
      const res = await fetch(`/api/adisyons/${adisyonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || "Adisyon güncellenemedi.");
      }
      await refresh();
    },
    [refresh]
  );

  const updateItemStatus = useCallback(
    async (adisyonId: number, itemId: number, itemStatus: ItemStatus) => {
      const res = await fetch(`/api/adisyons/${adisyonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, itemStatus }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || "Kalem güncellenemedi.");
      }
      await refresh();
    },
    [refresh]
  );

  const batchUpdateItems = useCallback(
    async (itemIds: number[], status: ItemStatus) => {
      const res = await fetch("/api/adisyons/batch-item-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds, status }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || "Toplu güncelleme başarısız.");
      }
      await refresh();
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
    nowMs,
    refresh,
    updateAdisyonStatus,
    updateItemStatus,
    batchUpdateItems,
    markPrinted,
    updatePrinterConfig,
  };
}
