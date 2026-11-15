"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import type { MenuItem } from "@/types/adisyon";

interface VariationDialogProps {
  item: MenuItem | null;
  onClose: () => void;
  onConfirm: (payload: {
    menuItem: MenuItem;
    variations: string[];
    quantity: number;
    itemNote: string;
  }) => void;
}

export function VariationDialog({
  item,
  onClose,
  onConfirm,
}: VariationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const [selectedVariations, setSelectedVariations] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [itemNote, setItemNote] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (item) {
      // Pre-select first cooking option for single-select items when helpful, or leave empty for quick tap
      if (item.selectionMode === "single" && item.variations.length > 0) {
        const defaultOpt = item.variations.includes("ORTA")
          ? "ORTA"
          : item.variations[0];
        setSelectedVariations([defaultOpt]);
      } else {
        setSelectedVariations([]);
      }
      setQuantity(1);
      setItemNote("");

      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [item]);

  // Fallback light-dismiss for browsers without native closedby="any" support (e.g. Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if ("closedBy" in HTMLDialogElement.prototype) return;

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
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const handleCloseEvent = () => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.returnValue = "";
    }
    onClose();
  };

  const toggleVariation = (variation: string) => {
    if (!item) return;
    if (item.selectionMode === "single") {
      setSelectedVariations((prev) =>
        prev.includes(variation) ? [] : [variation]
      );
      return;
    }

    setSelectedVariations((prev) =>
      prev.includes(variation)
        ? prev.filter((v) => v !== variation)
        : [...prev, variation]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    onConfirm({
      menuItem: item,
      variations: selectedVariations,
      quantity,
      itemNote: itemNote.trim(),
    });
    dialogRef.current?.close("confirmed");
  };

  return (
    <dialog
      ref={dialogRef}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...({ closedby: "any" } as any)}
      aria-labelledby={titleId}
      onClose={handleCloseEvent}
      className="open:flex flex-col overflow-hidden"
    >
      {item && (
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90dvh]">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">
                  #{item.productNo}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {item.category}
                </span>
              </div>
              <h2
                id={titleId}
                className="mt-1 text-lg font-bold text-slate-900"
              >
                {item.name}
              </h2>
            </div>

            <button
              type="button"
              onClick={() => dialogRef.current?.close("cancel")}
              aria-label="Kapat"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {item.variations.length > 0 ? (
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="text-sm font-bold text-slate-800">
                    Varyasyon Seçimi
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {item.selectionMode === "single"
                      ? "Tek seçim"
                      : "Birden fazla seçebilirsiniz"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {item.variations.map((variation) => {
                    const active = selectedVariations.includes(variation);
                    return (
                      <button
                        key={variation}
                        type="button"
                        onClick={() => toggleVariation(variation)}
                        aria-pressed={active}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left text-sm font-bold transition-all ${
                          active
                            ? "border-sky-600 bg-sky-50 text-sky-900 ring-2 ring-sky-600/20"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span className="leading-snug">{variation}</span>
                        {active && (
                          <Check
                            className="h-4 w-4 shrink-0 text-sky-600"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
                Bu ürün standart hazırlanır (ek varyasyon tanımlı değil). Adet
                veya özel mutfak notu ekleyebilirsiniz.
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <span className="text-sm font-bold text-slate-800">
                Porsiyon / Adet
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Adeti azalt"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 active:scale-95"
                >
                  <Minus className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="min-w-[2.5rem] text-center text-lg font-bold text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(30, q + 1))}
                  aria-label="Adeti artır"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 active:scale-95"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Item Note */}
            <div>
              <label
                htmlFor="item-note-input"
                className="block text-sm font-bold text-slate-800 mb-1.5"
              >
                Ürün Notu (Opsiyonel)
              </label>
              <input
                id="item-note-input"
                type="text"
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                placeholder="Örn: Tuzsuz, ekstra sıcak, tereyağsız..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 bg-slate-50 px-5 py-3.5">
            <button
              type="button"
              onClick={() => dialogRef.current?.close("cancel")}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              autoFocus
              className="flex-1 sm:flex-none rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-sky-700 active:scale-[0.99]"
            >
              Adisyona Ekle ({quantity}x)
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
