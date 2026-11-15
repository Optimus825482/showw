"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Printer, RefreshCw, Trash2, X } from "lucide-react";
import type { DetectedSystemPrinter, PrinterConfig } from "@/types/adisyon";

interface PrinterSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  initialConfig: PrinterConfig;
  onSaved: (
    config: PrinterConfig,
    hasActivePrinter: boolean
  ) => void;
}

export function PrinterSettingsDialog({
  open,
  onClose,
  initialConfig,
  onSaved,
}: PrinterSettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();

  const [systemPrinters, setSystemPrinters] = useState<DetectedSystemPrinter[]>(
    []
  );
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printerName, setPrinterName] = useState(initialConfig.printerName);
  const [enabled, setEnabled] = useState(initialConfig.enabled);
  const [autoPrint, setAutoPrint] = useState(initialConfig.autoPrint);
  const [error, setError] = useState<string | null>(null);

  const scanPrinters = async (force = true) => {
    setScanning(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/printers${force ? "?scan=1" : ""}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Yazıcı taraması başarısız.");
      const data = (await res.json()) as {
        systemPrinters: DetectedSystemPrinter[];
        printerConfig: PrinterConfig;
      };
      setSystemPrinters(data.systemPrinters || []);
      setPrinterName(data.printerConfig.printerName);
      setEnabled(data.printerConfig.enabled);
      setAutoPrint(data.printerConfig.autoPrint);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Yazıcılar listelenemedi."
      );
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      setPrinterName(initialConfig.printerName);
      setEnabled(initialConfig.enabled);
      setAutoPrint(initialConfig.autoPrint);
      void scanPrinters(true);
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open, initialConfig]);

  // Safari fallback for closedby="any"
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };
    let pressedOutside = false;
    const onDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) dialog.close();
      pressedOutside = false;
    };
    dialog.addEventListener("pointerdown", onDown);
    dialog.addEventListener("pointerup", onUp);
    return () => {
      dialog.removeEventListener("pointerdown", onDown);
      dialog.removeEventListener("pointerup", onUp);
    };
  }, []);

  const persistConfig = async (next: PrinterConfig) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/printers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error("Yazıcı ayarları kaydedilemedi.");
      const data = (await res.json()) as {
        printerConfig: PrinterConfig;
        hasActivePrinter: boolean;
      };
      onSaved(data.printerConfig, data.hasActivePrinter);
      dialogRef.current?.close("saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt hatası");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = printerName.trim();
    if (enabled && !trimmed) {
      setError("Yazıcıyı aktif etmek için bir yazıcı seçin veya adını girin.");
      return;
    }
    void persistConfig({
      enabled,
      printerName: trimmed,
      autoPrint,
    });
  };

  const physicalPrinters = systemPrinters.filter((p) => !p.isVirtual);
  const virtualPrinters = systemPrinters.filter((p) => p.isVirtual);

  return (
    <dialog
      ref={dialogRef}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...({ closedby: "any" } as any)}
      aria-labelledby={titleId}
      onClose={() => {
        if (dialogRef.current) {
          dialogRef.current.returnValue = "";
        }
        onClose();
      }}
      className="open:flex flex-col overflow-hidden"
    >
      <form onSubmit={handleSave} className="flex flex-col max-h-[90dvh]">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <Printer className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id={titleId}
                className="text-base font-extrabold text-slate-900"
              >
                Yazıcı &amp; Otomatik Yazdırma
              </h2>
              <p className="text-xs font-medium text-slate-500">
                Ekli veya kayıtlı yazıcı yoksa yazdırma seçenekleri gizlenir.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => dialogRef.current?.close("cancel")}
            aria-label="Kapat"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Detected System Printers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-700">
                Bilgisayardaki Yazıcılar
              </span>
              <button
                type="button"
                disabled={scanning}
                onClick={() => void scanPrinters(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${scanning ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                <span>Tara</span>
              </button>
            </div>

            {physicalPrinters.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-900">
                Fiziksel/termal yazıcı algılanmadı
                {virtualPrinters.length > 0
                  ? ` (Yalnızca sanal sürücü mevcut: ${virtualPrinters
                      .map((v) => v.name)
                      .join(", ")})`
                  : ""}
                . Yazıcı ekli değilse uygulama yazdırma butonlarını gizler.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {physicalPrinters.map((p) => {
                  const selected = enabled && printerName === p.name;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setPrinterName(p.name);
                        setEnabled(true);
                        setError(null);
                      }}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left transition ${
                        selected
                          ? "border-sky-600 bg-sky-50 text-sky-950 ring-2 ring-sky-600/20"
                          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold truncate">
                          {p.name}
                        </div>
                        <div className="text-[11px] font-medium text-slate-500">
                          {p.driverName} • {p.portName}
                        </div>
                      </div>
                      {selected && (
                        <Check
                          className="h-4 w-4 shrink-0 text-sky-600"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Manual Printer Registration */}
          <div className="space-y-1.5">
            <label
              htmlFor="printer-name-input"
              className="block text-xs font-extrabold text-slate-700"
            >
              Kayıtlı / Ağ Termal Yazıcı Adı
            </label>
            <input
              id="printer-name-input"
              type="text"
              value={printerName}
              onChange={(e) => {
                setPrinterName(e.target.value);
                if (e.target.value.trim()) {
                  setEnabled(true);
                }
                setError(null);
              }}
              placeholder="Örn: Mutfak Termal POS-80"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <div className="text-sm font-extrabold text-slate-900">
                  Yazıcı Kullanımı Aktif
                </div>
                <div className="text-xs font-medium text-slate-500">
                  Kapalıyken tüm &quot;Yazdır&quot; seçenekleri gizlenir.
                </div>
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="h-5 w-5 accent-sky-600 rounded"
              />
            </label>

            {enabled && (
              <label className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2.5 cursor-pointer">
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    Otomatik Yazdır
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                    Adisyon kaydedildiğinde ekstra onay olmadan otomatik fiş
                    yazdırır.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={autoPrint}
                  onChange={(e) => setAutoPrint(e.target.checked)}
                  className="h-5 w-5 accent-emerald-600 rounded"
                />
              </label>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800"
            >
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
          {initialConfig.enabled ? (
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                void persistConfig({
                  enabled: false,
                  printerName: "",
                  autoPrint: false,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Yazıcıyı Kaldır</span>
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => dialogRef.current?.close("cancel")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
