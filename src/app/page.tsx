"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  Minus,
  Plus,
  Printer,
  Save,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { AdisyonCard } from "@/components/AdisyonCard";
import { AppShell } from "@/components/AppShell";
import { PrintableReceipt } from "@/components/PrintableReceipt";
import { VariationDialog } from "@/components/VariationDialog";
import { useAdisyonStream } from "@/hooks/useAdisyonStream";
import { MENU_CATEGORIES, MENU_ITEMS } from "@/lib/menu-data";
import type {
  Adisyon,
  DraftAdisyonItem,
  MenuCategory,
  MenuItem,
} from "@/types/adisyon";

type OrderScreenTab = "MENU" | "BEKLEYEN" | "TESLIM_EDILEN";

export default function AdisyonCreatePage() {
  const {
    adisyons,
    printerConfig,
    hasActivePrinter,
    dbMode,
    dbNotice,
    nowMs,
    refresh,
    updateAdisyonStatus,
    updateItemStatus,
    markPrinted,
    updatePrinterConfig,
  } = useAdisyonStream(2500);

  const [orderTab, setOrderTab] = useState<OrderScreenTab>("MENU");
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<
    MenuCategory | "Tümü"
  >("Tümü");
  const [searchQuery, setSearchQuery] = useState("");

  // Adisyon header (Misafir Bilgisi)
  const [roomNumber, setRoomNumber] = useState("");
  const [guestName, setGuestName] = useState("");
  const [adisyonNote, setAdisyonNote] = useState("");

  // Draft items
  const [draftItems, setDraftItems] = useState<DraftAdisyonItem[]>([]);

  // Modal states
  const [activeMenuItem, setActiveMenuItem] = useState<MenuItem | null>(null);
  const mobileCartDialogRef = useRef<HTMLDialogElement | null>(null);
  const mobileCartTitleId = useId();
  const [mobileCartOpen, setMobileCartOpen] = useState(false);

  // Submission & printing
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastSavedAdisyon, setLastSavedAdisyon] = useState<Adisyon | null>(
    null
  );
  const [receiptAdisyon, setReceiptAdisyon] = useState<Adisyon | null>(null);

  useEffect(() => {
    fetch("/api/menu")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { items?: MenuItem[] } | null) => {
        if (data?.items && data.items.length > 0) {
          setMenuItems(data.items);
        }
      })
      .catch(() => {
        // Static MENU_ITEMS already loaded as initial state
      });
  }, []);

  // Control mobile cart <dialog> via showModal()
  useEffect(() => {
    const dialog = mobileCartDialogRef.current;
    if (!dialog) return;
    if (mobileCartOpen && !dialog.open) {
      dialog.showModal();
    } else if (!mobileCartOpen && dialog.open) {
      dialog.close();
    }
  }, [mobileCartOpen]);

  // Fallback light-dismiss for Safari / browsers without closedby="any"
  useEffect(() => {
    const dialog = mobileCartDialogRef.current;
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

  const filteredMenu = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("tr");
    return menuItems.filter((item) => {
      if (selectedCategory !== "Tümü" && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      const matchesName = item.name.toLocaleLowerCase("tr").includes(q);
      const matchesNo = String(item.productNo) === q;
      const matchesVar = item.variations.some((v) =>
        v.toLocaleLowerCase("tr").includes(q)
      );
      return matchesName || matchesNo || matchesVar;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const activeAdisyons = useMemo(
    () =>
      adisyons.filter(
        (a) => a.status !== "TESLIM_EDILDI" && a.status !== "IPTAL"
      ),
    [adisyons]
  );

  const deliveredAdisyons = useMemo(
    () => adisyons.filter((a) => a.status === "TESLIM_EDILDI"),
    [adisyons]
  );

  const activeQueueCount = activeAdisyons.length;

  const readyCount = useMemo(
    () => adisyons.filter((a) => a.status === "HAZIR").length,
    [adisyons]
  );

  const totalDraftCount = useMemo(
    () => draftItems.reduce((sum, item) => sum + item.quantity, 0),
    [draftItems]
  );

  const addItemToDraft = (payload: {
    menuItem: MenuItem;
    variations: string[];
    quantity: number;
    itemNote: string;
  }) => {
    setFormError(null);
    const normalizedVars = [...payload.variations].sort((a, b) =>
      a.localeCompare(b, "tr")
    );
    const note = payload.itemNote.trim();

    setDraftItems((prev) => {
      const existingIdx = prev.findIndex(
        (d) =>
          d.menuItemId === payload.menuItem.id &&
          d.itemNote === note &&
          JSON.stringify(
            [...d.variations].sort((a, b) => a.localeCompare(b, "tr"))
          ) === JSON.stringify(normalizedVars)
      );

      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: next[existingIdx].quantity + payload.quantity,
        };
        return next;
      }

      return [
        ...prev,
        {
          draftId: `${payload.menuItem.id}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 6)}`,
          menuItemId: payload.menuItem.id,
          productNo: payload.menuItem.productNo,
          productName: payload.menuItem.name,
          category: payload.menuItem.category,
          variations: payload.variations,
          quantity: payload.quantity,
          itemNote: note,
        },
      ];
    });
  };

  const updateDraftQty = (draftId: string, delta: number) => {
    setDraftItems((prev) =>
      prev
        .map((item) =>
          item.draftId === draftId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const triggerPrintFor = (adisyon: Adisyon) => {
    setReceiptAdisyon(adisyon);
    window.setTimeout(() => {
      window.print();
    }, 120);
  };

  const submitAdisyon = async (withPrint: boolean) => {
    setFormError(null);

    if (!roomNumber.trim() && !guestName.trim()) {
      setFormError(
        "Adisyon başlatmak için Oda Numarası veya Misafir Adı alanlarından en az birini giriniz."
      );
      return;
    }

    if (draftItems.length === 0) {
      setFormError("Adisyona en az bir ürün ekleyiniz.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/adisyons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: roomNumber.trim(),
          guestName: guestName.trim(),
          note: adisyonNote.trim(),
          markPrinted: withPrint,
          items: draftItems.map((d) => ({
            menuItemId: d.menuItemId,
            productNo: d.productNo,
            productName: d.productName,
            category: d.category,
            variations: d.variations,
            quantity: d.quantity,
            itemNote: d.itemNote,
          })),
        }),
      });

      const body = (await res.json()) as {
        adisyon?: Adisyon;
        error?: string;
      };

      if (!res.ok || !body.adisyon) {
        throw new Error(body.error || "Adisyon kaydedilemedi.");
      }

      setLastSavedAdisyon(body.adisyon);
      setRoomNumber("");
      setGuestName("");
      setAdisyonNote("");
      setDraftItems([]);
      setMobileCartOpen(false);
      await refresh();

      if (withPrint) {
        triggerPrintFor(body.adisyon);
      }
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Kayıt sırasında hata oluştu."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderAdisyonPanel = (isInsideMobileDialog = false) => (
    <div className="flex flex-col h-full">
      {/* Guest Info Section */}
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="fluid-section-title font-extrabold text-slate-900">
            Adisyon Bilgileri
          </h2>
          {draftItems.length > 0 && (
            <button
              type="button"
              onClick={() => setDraftItems([])}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1 rounded-lg hover:bg-rose-50"
            >
              Temizle
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5">
          <div>
            <label
              htmlFor={
                isInsideMobileDialog ? "mobile-room-input" : "room-input"
              }
              className="block text-xs font-bold text-slate-600 mb-1"
            >
              Oda Numarası
            </label>
            <div className="relative">
              <DoorOpen
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                id={isInsideMobileDialog ? "mobile-room-input" : "room-input"}
                type="text"
                inputMode="text"
                value={roomNumber}
                onChange={(e) => {
                  setRoomNumber(e.target.value);
                  setFormError(null);
                }}
                placeholder="Örn: 204"
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={
                isInsideMobileDialog ? "mobile-guest-input" : "guest-input"
              }
              className="block text-xs font-bold text-slate-600 mb-1"
            >
              Misafir Adı
            </label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                id={
                  isInsideMobileDialog ? "mobile-guest-input" : "guest-input"
                }
                type="text"
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  setFormError(null);
                }}
                placeholder="Örn: Ahmet Yılmaz"
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
              />
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor={isInsideMobileDialog ? "mobile-note-input" : "note-input"}
            className="block text-xs font-bold text-slate-600 mb-1"
          >
            Genel Adisyon Notu (Opsiyonel)
          </label>
          <input
            id={isInsideMobileDialog ? "mobile-note-input" : "note-input"}
            type="text"
            value={adisyonNote}
            onChange={(e) => setAdisyonNote(e.target.value)}
            placeholder="Örn: Teras masa, alerji uyarısı..."
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
          />
        </div>
      </div>

      {/* Draft Items */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2 min-h-[10rem] max-h-[42dvh] lg:max-h-[46dvh]">
        {draftItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-8 text-center">
            <ShoppingBag
              className="h-8 w-8 text-slate-300 mb-2"
              aria-hidden="true"
            />
            <p className="text-sm font-bold text-slate-600">
              Adisyona henüz ürün eklenmedi
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Soldaki menüden ürün seçip varyasyon belirleyin.
            </p>
          </div>
        ) : (
          draftItems.map((item) => (
            <div
              key={item.draftId}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-start justify-between gap-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold text-slate-900">
                  #{item.productNo} {item.productName}
                </div>
                {item.variations.length > 0 ? (
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
                ) : (
                  <div className="mt-0.5 text-xs font-medium text-slate-500">
                    Standart
                  </div>
                )}
                {item.itemNote && (
                  <p className="mt-1 text-xs font-semibold text-amber-800">
                    Not: {item.itemNote}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => updateDraftQty(item.draftId, -1)}
                  aria-label={`${item.productName} adetini azalt`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                >
                  {item.quantity === 1 ? (
                    <Trash2
                      className="h-4 w-4 text-rose-600"
                      aria-hidden="true"
                    />
                  ) : (
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
                <span className="min-w-[1.75rem] text-center text-sm font-extrabold text-slate-900">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateDraftQty(item.draftId, 1)}
                  aria-label={`${item.productName} adetini artır`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Error & Submit Buttons */}
      <div className="border-t border-slate-200 pt-3 space-y-2.5">
        {formError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800"
          >
            {formError}
          </div>
        )}

        <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
          <span>Toplam Ürün Adedi</span>
          <span className="text-sm font-extrabold text-slate-900">
            {totalDraftCount} Adet
          </span>
        </div>

        {hasActivePrinter && (
          <label className="flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2 cursor-pointer">
            <div className="flex items-center gap-2 min-w-0">
              <Printer
                className="h-4 w-4 shrink-0 text-sky-700"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-sky-950 truncate">
                  Otomatik Yazdır
                </div>
                <div className="text-[11px] font-medium text-sky-700 truncate">
                  {printerConfig.printerName}
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={printerConfig.autoPrint}
              onChange={(e) =>
                void updatePrinterConfig({
                  ...printerConfig,
                  autoPrint: e.target.checked,
                })
              }
              className="h-5 w-5 accent-sky-600 rounded shrink-0"
            />
          </label>
        )}

        {!hasActivePrinter ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submitAdisyon(false)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 active:scale-[0.99]"
          >
            <Save className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Adisyonu Kaydet (Kuyruğa Ekle)</span>
          </button>
        ) : printerConfig.autoPrint ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submitAdisyon(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 active:scale-[0.99]"
          >
            <Printer className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Kaydet (Otomatik Yazdırılır)</span>
          </button>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submitAdisyon(false)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-600 bg-white px-4 py-3 text-sm font-extrabold text-sky-700 hover:bg-sky-50 disabled:opacity-50 active:scale-[0.99]"
            >
              <Save className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Sadece Kaydet</span>
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => void submitAdisyon(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 active:scale-[0.99]"
            >
              <Printer className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Kaydet ve Yazdır</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <AppShell
        activeQueueCount={activeQueueCount}
        readyCount={readyCount}
        hasActivePrinter={hasActivePrinter}
        printerConfig={printerConfig}
        dbMode={dbMode}
        dbNotice={dbNotice}
        onRefresh={() => void refresh()}
        bottomExtra={
          <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-sky-950 truncate">
                {roomNumber || guestName
                  ? `${roomNumber ? `Oda ${roomNumber}` : ""} ${guestName}`.trim()
                  : "Yeni Adisyon (Oda / İsim Girin)"}
              </div>
              <div className="text-[11px] font-semibold text-sky-700">
                {totalDraftCount} ürün seçildi
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileCartOpen(true)}
              className="shrink-0 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-sky-700"
            >
              Adisyonu Aç ({totalDraftCount})
            </button>
          </div>
        }
      >
        {/* Saved Banner */}
        {lastSavedAdisyon && (
          <div
            role="status"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950 shadow-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2
                className="h-5 w-5 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              <div className="text-sm font-bold">
                <span className="font-black">
                  SIRA #{lastSavedAdisyon.queueNumber}
                </span>{" "}
                kuyruğa eklendi (
                {lastSavedAdisyon.roomNumber
                  ? `Oda ${lastSavedAdisyon.roomNumber}`
                  : ""}
                {lastSavedAdisyon.roomNumber && lastSavedAdisyon.guestName
                  ? " • "
                  : ""}
                {lastSavedAdisyon.guestName})
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasActivePrinter && (
                <button
                  type="button"
                  onClick={() => triggerPrintFor(lastSavedAdisyon)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Fiş Yazdır</span>
                </button>
              )}
              <Link
                href="/bekleyenler"
                className="inline-flex items-center rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Bekleyenlere Git
              </Link>
              <button
                type="button"
                onClick={() => setLastSavedAdisyon(null)}
                aria-label="Bildirimi kapat"
                className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-200/60"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Sipariş Ekranı Alt Sekmeleri: Yeni Adisyon / Bekleyenler / Teslim Edilenler */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setOrderTab("MENU")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-extrabold transition ${
                orderTab === "MENU"
                  ? "bg-sky-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Yeni Adisyon Al</span>
            </button>

            <button
              type="button"
              onClick={() => setOrderTab("BEKLEYEN")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-extrabold transition ${
                orderTab === "BEKLEYEN"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              <span>Bekleyenler ({activeAdisyons.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setOrderTab("TESLIM_EDILEN")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-extrabold transition ${
                orderTab === "TESLIM_EDILEN"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              <span>Teslim Edilenler ({deliveredAdisyons.length})</span>
            </button>
          </div>

          <span className="hidden sm:inline text-xs font-semibold text-slate-500 px-2">
            Saat &amp; canlı süre takibi tüm adisyonlarda aktiftir
          </span>
        </div>

        {orderTab === "BEKLEYEN" ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="fluid-section-title font-extrabold text-slate-900">
                Bekleyen Adisyonlar ({activeAdisyons.length})
              </h2>
            </div>
            {activeAdisyons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-600">
                Şu anda bekleyen adisyon bulunmuyor.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeAdisyons.map((adisyon) => (
                  <AdisyonCard
                    key={adisyon.id}
                    adisyon={adisyon}
                    nowMs={nowMs}
                    allowItemToggle={true}
                    showPrintButton={hasActivePrinter}
                    onUpdateStatus={updateAdisyonStatus}
                    onUpdateItemStatus={updateItemStatus}
                    onPrint={(a) => {
                      void markPrinted(a.id);
                      triggerPrintFor(a);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        ) : orderTab === "TESLIM_EDILEN" ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="fluid-section-title font-extrabold text-slate-900">
                Teslim Edilen Adisyonlar ({deliveredAdisyons.length})
              </h2>
            </div>
            {deliveredAdisyons.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm font-bold text-slate-600">
                Henüz teslim edilmiş adisyon bulunmuyor.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {deliveredAdisyons.map((adisyon) => (
                  <AdisyonCard
                    key={adisyon.id}
                    adisyon={adisyon}
                    nowMs={nowMs}
                    allowItemToggle={false}
                    showPrintButton={hasActivePrinter}
                    onUpdateStatus={updateAdisyonStatus}
                    onUpdateItemStatus={updateItemStatus}
                    onPrint={(a) => {
                      void markPrinted(a.id);
                      triggerPrintFor(a);
                    }}
                  />
                ))}
              </div>
            )}
          </section>
        ) : (
          <>
            {/* Quick Mobile Adisyon Start Bar (so mobile users start with Room / Name immediately) */}
            <section className="lg:hidden mb-4 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-extrabold text-slate-900">
              1. Adisyon Başlat (Misafir Bilgisi)
            </h2>
            <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
              Oda No veya İsim
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={roomNumber}
              onChange={(e) => {
                setRoomNumber(e.target.value);
                setFormError(null);
              }}
              aria-label="Oda Numarası"
              placeholder="Oda No (Örn: 204)"
              className="rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none"
            />
            <input
              type="text"
              value={guestName}
              onChange={(e) => {
                setGuestName(e.target.value);
                setFormError(null);
              }}
              aria-label="Misafir Adı"
              placeholder="Misafir Adı"
              className="rounded-xl border border-slate-300 bg-slate-50/50 px-3 py-2 text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none"
            />
          </div>
        </section>

        {/* Main 2-column POS Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Search, Categories, 40 Menu Products */}
          <div className="lg:col-span-8 space-y-4">
            {/* Search & Categories */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="fluid-section-title font-extrabold text-slate-900">
                    Show Büfe Ürün Menüsü
                  </h2>
                  <p className="text-xs font-medium text-slate-500">
                    Ürün seçerek varyasyon ve adet belirleyin ({filteredMenu.length}{" "}
                    ürün)
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ürün ara (Omlet, Krep, 18...)"
                    aria-label="Menüde ürün ara"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600/20"
                  />
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("Tümü")}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    selectedCategory === "Tümü"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Tümü (40)
                </button>
                {MENU_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                      selectedCategory === category
                        ? "bg-sky-600 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Grid using container query */}
            <div className="menu-grid-container">
              {filteredMenu.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <p className="text-sm font-bold text-slate-600">
                    Aramanızla eşleşen ürün bulunamadı.
                  </p>
                </div>
              ) : (
                <div className="menu-grid">
                  {filteredMenu.map((item) => {
                    const hasVariations = item.variations.length > 0;
                    const inDraftQty = draftItems
                      .filter((d) => d.menuItemId === item.id)
                      .reduce((s, d) => s + d.quantity, 0);

                    return (
                      <div
                        key={item.id}
                        className={`menu-card group relative rounded-2xl border bg-white p-3.5 shadow-sm transition-all flex flex-col justify-between gap-2.5 ${
                          inDraftQty > 0
                            ? "border-sky-500 ring-2 ring-sky-500/15"
                            : "border-slate-200 hover:border-sky-300 hover:shadow-md"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveMenuItem(item)}
                          className="text-left w-full flex-1 flex flex-col justify-between gap-2 focus:outline-none"
                        >
                          <div className="flex items-start justify-between gap-2 w-full">
                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-600">
                              #{item.productNo}
                            </span>

                            {inDraftQty > 0 ? (
                              <span className="inline-flex items-center rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-extrabold text-white">
                                {inDraftQty} seçili
                              </span>
                            ) : (
                              <span className="text-[11px] font-semibold text-slate-400">
                                {item.category}
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm sm:text-[15px] font-extrabold text-slate-900 leading-snug group-hover:text-sky-700">
                            {item.name}
                          </h3>

                          {hasVariations ? (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {item.variations.map((v) => (
                                <span
                                  key={v}
                                  className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600"
                                >
                                  {v}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[11px] font-semibold text-slate-400">
                              Standart Porsiyon
                            </div>
                          )}
                        </button>

                        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setActiveMenuItem(item)}
                            className="flex-1 inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:text-sky-800"
                          >
                            {hasVariations ? (
                              <>
                                <Sparkles
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                <span>Varyasyon Seç</span>
                              </>
                            ) : (
                              <span>Detay / Not</span>
                            )}
                          </button>

                          {!hasVariations && (
                            <button
                              type="button"
                              onClick={() =>
                                addItemToDraft({
                                  menuItem: item,
                                  variations: [],
                                  quantity: 1,
                                  itemNote: "",
                                })
                              }
                              aria-label={`${item.name} hızlı ekle`}
                              className="inline-flex items-center justify-center gap-1 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-sky-700 active:scale-95"
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Ekle</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Desktop/Tablet Sticky Adisyon Builder */}
          <aside className="hidden lg:block lg:col-span-4 lg:sticky lg:top-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {renderAdisyonPanel(false)}
          </aside>
        </div>
          </>
        )}
      </AppShell>

      {/* Mobile Adisyon Drawer <dialog> */}
      <dialog
        ref={mobileCartDialogRef}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ closedby: "any" } as any)}
        aria-labelledby={mobileCartTitleId}
        onClose={() => {
          if (mobileCartDialogRef.current) {
            mobileCartDialogRef.current.returnValue = "";
          }
          setMobileCartOpen(false);
        }}
        className="open:flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2
            id={mobileCartTitleId}
            className="text-base font-extrabold text-slate-900"
          >
            Aktif Adisyon ({totalDraftCount} Ürün)
          </h2>
          <button
            type="button"
            onClick={() => setMobileCartOpen(false)}
            aria-label="Kapat"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {renderAdisyonPanel(true)}
        </div>
      </dialog>

      {/* Variation Selection <dialog> */}
      <VariationDialog
        item={activeMenuItem}
        onClose={() => setActiveMenuItem(null)}
        onConfirm={addItemToDraft}
      />

      {/* Hidden Thermal Printable Receipt */}
      <PrintableReceipt adisyon={receiptAdisyon} />
    </>
  );
}
