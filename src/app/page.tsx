"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Check,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  DoorOpen,
  Loader2,
  Minus,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { AdisyonCard } from "@/components/AdisyonCard";
import { AppShell } from "@/components/AppShell";
import { PrintableReceipt } from "@/components/PrintableReceipt";
import { TableDetailDialog } from "@/components/TableDetailDialog";
import { TableSelector } from "@/components/TableSelector";
import { VariationDialog } from "@/components/VariationDialog";
import { useAdisyonStream } from "@/hooks/useAdisyonStream";
import { MENU_CATEGORIES, MENU_ITEMS } from "@/lib/menu-data";
import { summarizeTable, type TableSummary } from "@/lib/status";
import { formatTableLabel } from "@/lib/tables";
import type {
  Adisyon,
  DraftAdisyonItem,
  MenuCategory,
  MenuItem,
} from "@/types/adisyon";

type OrderScreenTab = "MENU" | "BEKLEYEN" | "TESLIM_EDILEN";
type OrderStep = "MASA" | "URUN";

const SAVED_BANNER_MS = 10_000;
const UNDO_CLEAR_MS = 8_000;
const ADD_FEEDBACK_MS = 2_500;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2";

const scrollToTop = () => {
  if (typeof window !== "undefined") window.scrollTo({ top: 0 });
};

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
    batchUpdateItems,
    moveTable,
    markPrinted,
    updatePrinterConfig,
  } = useAdisyonStream(2500);

  // Masa taşıma
  const [detailTable, setDetailTable] = useState<string | null>(null);
  const [moveSource, setMoveSource] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    from: string;
    to: string;
  } | null>(null);
  const [moveBusy, setMoveBusy] = useState(false);
  const [moveNotice, setMoveNotice] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const [orderTab, setOrderTab] = useState<OrderScreenTab>("MENU");
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<
    MenuCategory | "Tümü"
  >("Tümü");
  const [searchQuery, setSearchQuery] = useState("");

  // Adım 1: Masa seçimi → Adım 2: Ürün seçimi
  const [orderStep, setOrderStep] = useState<OrderStep>("MASA");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  // Adisyon başlığı (opsiyonel misafir bilgisi)
  const [roomNumber, setRoomNumber] = useState("");
  const [guestName, setGuestName] = useState("");
  const [adisyonNote, setAdisyonNote] = useState("");

  // Draft items (+ "Temizle" için geri alma tamponu)
  const [draftItems, setDraftItems] = useState<DraftAdisyonItem[]>([]);
  const [clearedDraft, setClearedDraft] = useState<DraftAdisyonItem[] | null>(
    null
  );
  const [addFeedback, setAddFeedback] = useState<{
    id: number;
    text: string;
  } | null>(null);

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
  const [bannerPaused, setBannerPaused] = useState(false);
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

  // Kayıt bildirimi: fare/odak içindeyken bekler, aksi halde kendiliğinden kapanır
  useEffect(() => {
    if (!lastSavedAdisyon || bannerPaused) return;
    const t = window.setTimeout(
      () => setLastSavedAdisyon(null),
      SAVED_BANNER_MS
    );
    return () => window.clearTimeout(t);
  }, [lastSavedAdisyon, bannerPaused]);

  // "Geri Al" süresi
  useEffect(() => {
    if (!clearedDraft) return;
    const t = window.setTimeout(() => setClearedDraft(null), UNDO_CLEAR_MS);
    return () => window.clearTimeout(t);
  }, [clearedDraft]);

  // "… eklendi" geri bildirimi
  useEffect(() => {
    if (!addFeedback) return;
    const t = window.setTimeout(() => setAddFeedback(null), ADD_FEEDBACK_MS);
    return () => window.clearTimeout(t);
  }, [addFeedback]);

  // Arama sonucu (kategori filtresinden önce) — kategori sayaçları buna göre
  const searchMatchedMenu = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("tr");
    if (!q) return menuItems;
    return menuItems.filter((item) => {
      const matchesName = item.name.toLocaleLowerCase("tr").includes(q);
      const matchesNo = String(item.productNo) === q;
      const matchesVar = item.variations.some((v) =>
        v.toLocaleLowerCase("tr").includes(q)
      );
      return matchesName || matchesNo || matchesVar;
    });
  }, [menuItems, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<MenuCategory, number>();
    for (const item of searchMatchedMenu) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return counts;
  }, [searchMatchedMenu]);

  const filteredMenu = useMemo(
    () =>
      selectedCategory === "Tümü"
        ? searchMatchedMenu
        : searchMatchedMenu.filter((item) => item.category === selectedCategory),
    [searchMatchedMenu, selectedCategory]
  );

  const hasMenuFilters =
    searchQuery.trim() !== "" || selectedCategory !== "Tümü";

  const clearMenuFilters = () => {
    setSearchQuery("");
    setSelectedCategory("Tümü");
  };

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

  // Masa → açık adisyon sayısı
  const occupiedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of activeAdisyons) {
      const table = a.tableNumber?.trim();
      if (table) counts[table] = (counts[table] ?? 0) + 1;
    }
    return counts;
  }, [activeAdisyons]);

  // Masa → durum özeti (renk, hazır porsiyon, en eski adisyon saati)
  const tableSummaries = useMemo(() => {
    const byTable = new Map<string, Adisyon[]>();
    for (const a of activeAdisyons) {
      const table = a.tableNumber?.trim();
      if (!table) continue;
      const list = byTable.get(table);
      if (list) list.push(a);
      else byTable.set(table, [a]);
    }
    const summaries: Record<string, TableSummary> = {};
    for (const [table, list] of byTable) {
      const summary = summarizeTable(list);
      if (summary) summaries[table] = summary;
    }
    return summaries;
  }, [activeAdisyons]);

  const activeQueueCount = activeAdisyons.length;

  const readyCount = useMemo(
    () => adisyons.filter((a) => a.status === "HAZIR").length,
    [adisyons]
  );

  const totalDraftCount = useMemo(
    () => draftItems.reduce((sum, item) => sum + item.quantity, 0),
    [draftItems]
  );

  const selectedTableLabel = selectedTable
    ? formatTableLabel(selectedTable)
    : "";
  const selectedTableOpenCount = selectedTable
    ? (occupiedCounts[selectedTable] ?? 0)
    : 0;
  const showMenuStep = orderStep === "URUN" && selectedTable !== null;
  const draftEmpty = draftItems.length === 0;

  // 0: Masa, 1: Ürünler, 2: Kaydet
  const currentStepIndex = !showMenuStep ? 0 : draftEmpty ? 1 : 2;

  const selectTable = (tableNumber: string) => {
    setSelectedTable(tableNumber);
    setOrderStep("URUN");
    setFormError(null);
    scrollToTop();
  };

  const cancelMove = () => {
    setMoveSource(null);
    setPendingMove(null);
  };

  const executeMove = async (from: string, to: string) => {
    setMoveBusy(true);
    try {
      const moved = await moveTable(from, to);
      setMoveNotice({
        kind: "ok",
        text: `Masa ${from} → Masa ${to} taşındı (${moved} adisyon).`,
      });
      // Taslak, taşınan masaya açılıyorsa o da yeni masayı izlesin
      setSelectedTable((prev) => (prev === from ? to : prev));
      setMoveSource(null);
      setPendingMove(null);
    } catch (err) {
      setMoveNotice({
        kind: "error",
        text: err instanceof Error ? err.message : "Masa taşınamadı.",
      });
    } finally {
      setMoveBusy(false);
    }
  };

  // Hedef doluysa önce birleştirme onayı ister; boşsa doğrudan taşır
  const requestMove = (from: string, to: string) => {
    if (from === to || moveBusy) return;
    setMoveNotice(null);
    if ((occupiedCounts[to] ?? 0) > 0) {
      setMoveSource(from);
      setPendingMove({ from, to });
      return;
    }
    void executeMove(from, to);
  };

  // Masa ızgarasında bir masaya dokunulduğunda
  const handleTableTap = (tableNumber: string) => {
    if (moveSource) {
      if (tableNumber === moveSource) {
        cancelMove();
      } else {
        requestMove(moveSource, tableNumber);
      }
      return;
    }
    setMoveNotice(null);
    if ((occupiedCounts[tableNumber] ?? 0) > 0) {
      setDetailTable(tableNumber);
      return;
    }
    selectTable(tableNumber);
  };

  const detailAdisyons = detailTable
    ? activeAdisyons.filter((a) => a.tableNumber === detailTable)
    : [];

  const goToTableStep = () => {
    setOrderStep("MASA");
    setMobileCartOpen(false);
    scrollToTop();
  };

  const addItemToDraft = (payload: {
    menuItem: MenuItem;
    variations: string[];
    quantity: number;
    itemNote: string;
  }) => {
    setFormError(null);
    setClearedDraft(null);
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

    setAddFeedback({
      id: Date.now(),
      text: `${payload.quantity} × ${payload.menuItem.name} eklendi`,
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

  const clearDraft = () => {
    if (draftItems.length === 0) return;
    setClearedDraft(draftItems);
    setDraftItems([]);
    setFormError(null);
  };

  const undoClearDraft = () => {
    if (!clearedDraft) return;
    setDraftItems(clearedDraft);
    setClearedDraft(null);
  };

  const triggerPrintFor = (adisyon: Adisyon) => {
    setReceiptAdisyon(adisyon);
    window.setTimeout(() => {
      window.print();
    }, 120);
  };

  const submitAdisyon = async (withPrint: boolean) => {
    if (submitting) return;
    setFormError(null);

    if (!selectedTable) {
      setFormError("Lütfen önce masa seçiniz.");
      goToTableStep();
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
          tableNumber: selectedTable,
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
      setBannerPaused(false);
      setRoomNumber("");
      setGuestName("");
      setAdisyonNote("");
      setDraftItems([]);
      setClearedDraft(null);
      setAddFeedback(null);
      setSelectedTable(null);
      setOrderStep("MASA");
      setMobileCartOpen(false);
      scrollToTop();
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

  const savedBannerDetails = lastSavedAdisyon
    ? [
        formatTableLabel(lastSavedAdisyon.tableNumber ?? ""),
        lastSavedAdisyon.roomNumber ? `Oda ${lastSavedAdisyon.roomNumber}` : "",
        lastSavedAdisyon.guestName ?? "",
      ]
        .filter(Boolean)
        .join(" • ")
    : "";

  const renderSubmitButton = (
    variant: "primary" | "secondary",
    withPrint: boolean,
    label: string,
    hintId: string
  ) => {
    const Icon = withPrint ? Printer : Save;
    return (
      <button
        type="button"
        disabled={draftEmpty || submitting}
        aria-describedby={draftEmpty ? hintId : undefined}
        onClick={() => void submitAdisyon(withPrint)}
        className={`btn btn-lg btn-block ${
          variant === "primary" ? "btn-primary" : "btn-outline"
        }`}
      >
        {submitting ? (
          <Loader2
            className="h-4 w-4 shrink-0 motion-safe:animate-spin"
            aria-hidden="true"
          />
        ) : (
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span>{submitting ? "Kaydediliyor…" : label}</span>
      </button>
    );
  };

  const renderAdisyonPanel = (isInsideMobileDialog = false) => {
    const idp = isInsideMobileDialog ? "mobile-" : "";
    const hintId = `${idp}submit-hint`;

    return (
      <div className="flex flex-col h-full">
        {/* Masa & opsiyonel misafir bilgisi */}
        <div className="space-y-3 border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="fluid-section-title font-bold text-slate-900">
              Adisyon Bilgileri
            </h2>
            {!draftEmpty && (
              <button
                type="button"
                onClick={clearDraft}
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 ${focusRing}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Taslağı Temizle</span>
              </button>
            )}
          </div>

          {/* Seçili masa */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wide text-sky-700">
                Masa
              </div>
              <div className="text-base font-bold text-sky-950 truncate">
                {selectedTableLabel || "Masa seçilmedi"}
              </div>
              {selectedTableOpenCount > 0 && (
                <div className="text-[11px] font-semibold text-amber-800">
                  Bu masada {selectedTableOpenCount} açık adisyon var
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={goToTableStep}
              className="btn btn-sm btn-outline shrink-0"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{selectedTable ? "Masayı Değiştir" : "Masa Seç"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor={`${idp}room-input`}
                className="block text-xs font-bold text-slate-600 mb-1"
              >
                Oda No (opsiyonel)
              </label>
              <div className="relative">
                <DoorOpen
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id={`${idp}room-input`}
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="Örn: 204"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor={`${idp}guest-input`}
                className="block text-xs font-bold text-slate-600 mb-1"
              >
                Misafir Adı (opsiyonel)
              </label>
              <div className="relative">
                <User
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id={`${idp}guest-input`}
                  type="text"
                  autoComplete="off"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Örn: Ahmet Yılmaz"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm font-bold text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor={`${idp}note-input`}
              className="block text-xs font-bold text-slate-600 mb-1"
            >
              Genel Adisyon Notu (opsiyonel)
            </label>
            <input
              id={`${idp}note-input`}
              type="text"
              autoComplete="off"
              value={adisyonNote}
              onChange={(e) => setAdisyonNote(e.target.value)}
              placeholder="Örn: Alerji uyarısı, çocuk menüsü..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
            />
          </div>
        </div>

        {/* Draft Items */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 min-h-[10rem] max-h-[42dvh] lg:max-h-[46dvh]">
          {clearedDraft && (
            <div
              role="status"
              className="flex items-center justify-between gap-2 rounded-xl border border-slate-300 bg-slate-900 px-3 py-2 text-xs font-bold text-white"
            >
              <span>
                Taslak temizlendi (
                {clearedDraft.reduce((s, d) => s + d.quantity, 0)} ürün).
              </span>
              <button
                type="button"
                onClick={undoClearDraft}
                className={`inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-slate-100 ${focusRing}`}
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Geri Al</span>
              </button>
            </div>
          )}

          {draftEmpty ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-8 text-center">
              <ShoppingBag
                className="h-8 w-8 text-slate-300 mb-2"
                aria-hidden="true"
              />
              <p className="text-sm font-bold text-slate-600">
                Adisyona henüz ürün eklenmedi
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Menüden ürün seçip varyasyon belirleyin.
              </p>
            </div>
          ) : (
            draftItems.map((item) => (
              <div
                key={item.draftId}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-start justify-between gap-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-slate-900">
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

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateDraftQty(item.draftId, -1)}
                    aria-label={
                      item.quantity === 1
                        ? `${item.productName} ürününü kaldır`
                        : `${item.productName} adetini azalt`
                    }
                    className="btn btn-icon"
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
                  <span
                    className="min-w-[1.75rem] text-center text-base font-bold tabular-nums text-slate-900"
                  >
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateDraftQty(item.draftId, 1)}
                    aria-label={`${item.productName} adetini artır`}
                    className="btn btn-icon"
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
            <span className="text-sm font-bold text-slate-900">
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
                  <div className="text-xs font-bold text-sky-950 truncate">
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

          {draftEmpty && (
            <p
              id={hintId}
              className="px-1 text-[11px] font-semibold text-slate-500"
            >
              Kaydetmek için menüden en az bir ürün ekleyin.
            </p>
          )}

          {!hasActivePrinter ? (
            renderSubmitButton(
              "primary",
              false,
              "Adisyonu Kaydet (Kuyruğa Ekle)",
              hintId
            )
          ) : printerConfig.autoPrint ? (
            renderSubmitButton(
              "primary",
              true,
              "Kaydet (Otomatik Yazdırılır)",
              hintId
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {renderSubmitButton("secondary", false, "Sadece Kaydet", hintId)}
              {renderSubmitButton("primary", true, "Kaydet ve Yazdır", hintId)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const bottomExtra =
    orderTab !== "MENU" ? undefined : showMenuStep ? (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5">
        <div className="min-w-0">
          <div className="text-xs font-bold text-sky-950 truncate">
            {selectedTableLabel}
          </div>
          {addFeedback ? (
            <div
              key={addFeedback.id}
              className="step-enter inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 truncate"
            >
              <Check className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{addFeedback.text}</span>
            </div>
          ) : (
            <div className="text-[11px] font-semibold text-sky-700">
              {draftEmpty
                ? "Ürün seçin"
                : `${totalDraftCount} ürün seçildi`}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMobileCartOpen(true)}
          className={`shrink-0 inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold shadow-sm ${focusRing} ${
            draftEmpty
              ? "bg-white text-sky-800 border border-sky-300 hover:bg-sky-100"
              : "bg-sky-600 text-white hover:bg-sky-700"
          }`}
        >
          <span>{draftEmpty ? "Adisyon" : "Adisyonu Aç"}</span>
          <span
            key={addFeedback?.id ?? "count"}
            className={`count-bump inline-flex min-w-[1.5rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-extrabold tabular-nums ${
              draftEmpty ? "bg-sky-100 text-sky-800" : "bg-white text-sky-700"
            }`}
          >
            {totalDraftCount}
          </span>
        </button>
      </div>
    ) : !draftEmpty ? (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
        <div className="text-xs font-bold text-amber-950">
          Masa seçin
        </div>
        <div className="text-[11px] font-semibold text-amber-800">
          Taslakta {totalDraftCount} ürün bekliyor
        </div>
      </div>
    ) : undefined;

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
        bottomExtra={bottomExtra}
      >
        {/* Ekran okuyucular için ekleme bildirimi */}
        <div className="sr-only" aria-live="polite">
          {addFeedback?.text ?? ""}
        </div>

        {/* Saved Banner (10 sn sonra kapanır; fare/odak içindeyken bekler) */}
        {lastSavedAdisyon && (
          <div
            role="status"
            onMouseEnter={() => setBannerPaused(true)}
            onMouseLeave={() => setBannerPaused(false)}
            onFocus={() => setBannerPaused(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setBannerPaused(false);
              }
            }}
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-950 shadow-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <CheckCircle2
                className="h-5 w-5 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              <div className="text-sm font-bold">
                <span className="font-extrabold">
                  SIRA #{lastSavedAdisyon.queueNumber}
                </span>{" "}
                kuyruğa eklendi
                {savedBannerDetails ? ` (${savedBannerDetails})` : ""}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasActivePrinter && (
                <button
                  type="button"
                  onClick={() => triggerPrintFor(lastSavedAdisyon)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 ${focusRing}`}
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Fiş Yazdır</span>
                </button>
              )}
              <Link
                href="/bekleyenler"
                className={`inline-flex items-center rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 ${focusRing}`}
              >
                Bekleyenlere Git
              </Link>
              <button
                type="button"
                onClick={() => {
                  setLastSavedAdisyon(null);
                  setBannerPaused(false);
                }}
                aria-label="Bildirimi kapat"
                className={`inline-flex items-center justify-center rounded-lg p-1 text-emerald-700 hover:bg-emerald-200/60 ${focusRing}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Sipariş Ekranı Alt Sekmeleri: Yeni Adisyon / Bekleyenler / Teslim Edilenler */}
        <div className="mb-4">
          <div role="group" aria-label="Sipariş görünümü" className="seg flex-wrap">
            <button
              type="button"
              aria-pressed={orderTab === "MENU"}
              onClick={() => setOrderTab("MENU")}
              className="seg-btn"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Yeni Adisyon Al</span>
            </button>

            <button
              type="button"
              aria-pressed={orderTab === "BEKLEYEN"}
              onClick={() => setOrderTab("BEKLEYEN")}
              className="seg-btn"
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              <span>Bekleyenler ({activeAdisyons.length})</span>
            </button>

            <button
              type="button"
              aria-pressed={orderTab === "TESLIM_EDILEN"}
              onClick={() => setOrderTab("TESLIM_EDILEN")}
              className="seg-btn"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              <span>Teslim Edilenler ({deliveredAdisyons.length})</span>
            </button>
          </div>

        </div>

        {orderTab === "BEKLEYEN" ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="fluid-section-title font-bold text-slate-900">
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
              <h2 className="fluid-section-title font-bold text-slate-900">
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
            <StepIndicator currentIndex={currentStepIndex} />

            {!showMenuStep ? (
              /* ---------- ADIM 1: MASA SEÇ ---------- */
              <div className="step-enter space-y-4">
                {formError && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800"
                  >
                    {formError}
                  </div>
                )}

                {(selectedTable || !draftEmpty) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-sm font-bold text-amber-950">
                      {draftEmpty
                        ? `Şu an seçili: ${selectedTableLabel}. Yeni bir masa seçebilirsiniz.`
                        : `Taslaktaki ${totalDraftCount} ürün korunuyor; seçeceğiniz masaya aktarılacak.`}
                    </p>
                    {selectedTable && (
                      <button
                        type="button"
                        onClick={() => setOrderStep("URUN")}
                        className={`inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 ${focusRing}`}
                      >
                        <span>
                          {selectedTableLabel} ile devam et
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {moveNotice && (
                  <div
                    role={moveNotice.kind === "error" ? "alert" : "status"}
                    className={`flex items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${
                      moveNotice.kind === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-800"
                        : "border-emerald-200 bg-emerald-50 text-emerald-900"
                    }`}
                  >
                    <span>{moveNotice.text}</span>
                    <button
                      type="button"
                      onClick={() => setMoveNotice(null)}
                      aria-label="Bildirimi kapat"
                      className={`rounded-lg p-1 hover:bg-black/5 ${focusRing}`}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                )}

                {moveSource && (
                  <div
                    role="status"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-violet-300 bg-violet-50 px-4 py-3"
                  >
                    <p className="text-sm font-bold text-violet-950">
                      {pendingMove
                        ? `Masa ${pendingMove.to} dolu (${occupiedCounts[pendingMove.to] ?? 0} açık adisyon). Masa ${pendingMove.from} adisyonları bu masayla birleştirilsin mi?`
                        : `Masa ${moveSource} taşınıyor — hedef masaya dokunun.`}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {pendingMove && (
                        <button
                          type="button"
                          disabled={moveBusy}
                          onClick={() =>
                            void executeMove(pendingMove.from, pendingMove.to)
                          }
                          className="btn btn-move"
                        >
                          {moveBusy ? "Taşınıyor…" : "Birleştir ve Taşı"}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={moveBusy}
                        onClick={cancelMove}
                        className="btn"
                      >
                        Vazgeç
                      </button>
                    </div>
                  </div>
                )}

                <TableSelector
                  selectedTable={selectedTable}
                  occupiedCounts={occupiedCounts}
                  tableSummaries={tableSummaries}
                  nowMs={nowMs}
                  onSelect={handleTableTap}
                  moveSource={moveSource}
                  onDragMove={requestMove}
                />
              </div>
            ) : (
              /* ---------- ADIM 2: ÜRÜN SEÇ ---------- */
              <div className="step-enter">
                {/* Seçili masa şeridi */}
                <section
                  aria-label="Seçili masa"
                  className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-sky-300 bg-sky-50 px-3.5 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      aria-hidden="true"
                      className="inline-flex h-12 min-w-12 items-center justify-center rounded-xl bg-sky-600 px-2 text-lg font-extrabold tabular-nums text-white"
                    >
                      {selectedTable}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-sky-700">
                        Seçili Masa
                      </div>
                      <div className="text-lg font-bold leading-tight text-sky-950">
                        {selectedTableLabel}
                      </div>
                      {selectedTableOpenCount > 0 && (
                        <div className="mt-0.5 inline-flex items-center gap-1 text-xs font-bold text-amber-800">
                          <Users className="h-3.5 w-3.5" aria-hidden="true" />
                          Bu masada {selectedTableOpenCount} açık adisyon var
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* md–lg arası: ne yan panel ne mobil alt çubuk görünür */}
                    <button
                      type="button"
                      onClick={() => setMobileCartOpen(true)}
                      className="btn btn-primary hidden md:inline-flex lg:hidden"
                    >
                      <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                      <span>Adisyonu Aç</span>
                      <span
                        key={addFeedback?.id ?? "count"}
                        className="count-bump inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-xs font-extrabold tabular-nums text-sky-700"
                      >
                        {totalDraftCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={goToTableStep}
                      className="btn btn-outline"
                    >
                      <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                      <span>Masayı Değiştir</span>
                    </button>
                  </div>
                </section>

                {/* Main 2-column POS Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Left: Search, Categories, Menu Products */}
                  <div className="lg:col-span-8 space-y-4">
                    {/* Search & Categories */}
                    <div className="surface p-3.5 sm:p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h2 className="fluid-section-title font-bold text-slate-900">
                            Show Büfe Ürün Menüsü
                          </h2>
                          <p className="text-xs font-medium text-slate-500">
                            Ürün seçerek varyasyon ve adet belirleyin (
                            {filteredMenu.length} ürün)
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
                            className="w-full rounded-xl border border-slate-300 bg-slate-50/50 pl-9 pr-11 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-600/20 [&::-webkit-search-cancel-button]:appearance-none"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery("")}
                              aria-label="Aramayı temizle"
                              className={`absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 ${focusRing}`}
                            >
                              <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Category Filter Pills (telefonda tek satır, yatay kaydırmalı) */}
                      <div
                        role="group"
                        aria-label="Kategori filtresi"
                        className="chip-scroller"
                      >
                        <button
                          type="button"
                          aria-pressed={selectedCategory === "Tümü"}
                          onClick={() => setSelectedCategory("Tümü")}
                          className={`rounded-xl px-3 py-2 text-xs font-bold transition ${focusRing} ${
                            selectedCategory === "Tümü"
                              ? "bg-slate-900 text-white shadow-sm"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          Tümü ({searchMatchedMenu.length})
                        </button>
                        {MENU_CATEGORIES.map((category) => {
                          const count = categoryCounts.get(category) ?? 0;
                          const active = selectedCategory === category;
                          return (
                            <button
                              key={category}
                              type="button"
                              aria-pressed={active}
                              onClick={() => setSelectedCategory(category)}
                              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${focusRing} ${
                                active
                                  ? "bg-sky-600 text-white shadow-sm"
                                  : count === 0
                                    ? "bg-slate-50 text-slate-400 hover:bg-slate-100"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                              }`}
                            >
                              {category}{" "}
                              <span
                                className={
                                  active ? "text-sky-100" : "text-slate-400"
                                }
                              >
                                ({count})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Menu Grid using container query */}
                    <div className="menu-grid-container">
                      {filteredMenu.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-3">
                          <p className="text-sm font-bold text-slate-600">
                            {searchQuery.trim()
                              ? `“${searchQuery.trim()}” ile eşleşen ürün bulunamadı.`
                              : "Bu kategoride ürün bulunamadı."}
                          </p>
                          {hasMenuFilters && (
                            <button
                              type="button"
                              onClick={clearMenuFilters}
                              className="btn btn-dark"
                            >
                              <RotateCcw
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              <span>Filtreleri Temizle</span>
                            </button>
                          )}
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
                                  className="text-left w-full flex-1 flex flex-col justify-between gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-4"
                                >
                                  <div className="flex items-start justify-between gap-2 w-full">
                                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                      #{item.productNo}
                                    </span>

                                    {inDraftQty > 0 ? (
                                      <span className="inline-flex items-center rounded-full bg-sky-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                        {inDraftQty} seçili
                                      </span>
                                    ) : (
                                      <span className="text-[11px] font-semibold text-slate-400">
                                        {item.category}
                                      </span>
                                    )}
                                  </div>

                                  <h3 className="text-sm sm:text-[15px] font-bold text-slate-900 leading-snug group-hover:text-sky-700">
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
                                    className="btn btn-sm flex-1"
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
                                      className="btn btn-sm btn-primary"
                                    >
                                      <Plus
                                        className="h-3.5 w-3.5"
                                        aria-hidden="true"
                                      />
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

                  {/* Right: Desktop Sticky Adisyon Builder */}
                  <aside className="surface hidden lg:block lg:col-span-4 lg:sticky lg:top-20 p-4">
                    {renderAdisyonPanel(false)}
                  </aside>
                </div>
              </div>
            )}
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
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
          <h2
            id={mobileCartTitleId}
            className="min-w-0 text-base font-bold text-slate-900"
          >
            {selectedTableLabel ? `${selectedTableLabel} — ` : ""}Adisyon (
            {totalDraftCount} Ürün)
          </h2>
          <button
            type="button"
            onClick={() => setMobileCartOpen(false)}
            aria-label="Kapat"
            className={`shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 ${focusRing}`}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {renderAdisyonPanel(true)}
        </div>
      </dialog>

      {/* Dolu masa detayı: siparişleri gör, taşı veya ek sipariş al */}
      <TableDetailDialog
        tableNumber={detailTable}
        adisyons={detailAdisyons}
        onClose={() => setDetailTable(null)}
        onChangeItemStatus={(itemIds, status) =>
          batchUpdateItems(itemIds, status, { allowDelivered: true })
        }
        onStartMove={(table) => {
          setDetailTable(null);
          setPendingMove(null);
          setMoveSource(table);
        }}
        onAddOrder={(table) => {
          setDetailTable(null);
          selectTable(table);
        }}
      />

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

const ORDER_STEPS = ["Masa", "Ürünler", "Kaydet"] as const;

function StepIndicator({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="mb-4">
      <ol
        aria-label="Adisyon adımları"
        className="flex items-center gap-1.5 sm:gap-2"
      >
        {ORDER_STEPS.map((label, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          return (
            <li
              key={label}
              aria-current={current ? "step" : undefined}
              className="flex flex-1 items-center gap-1.5 sm:gap-2 min-w-0"
            >
              <span
                className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                  done
                    ? "bg-emerald-600 text-white"
                    : current
                      ? "bg-sky-600 text-white ring-4 ring-sky-600/15"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {done ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={`truncate text-xs sm:text-sm font-bold ${
                  current
                    ? "text-slate-900"
                    : done
                      ? "text-emerald-700"
                      : "text-slate-400"
                }`}
              >
                {label}
                {done && <span className="sr-only"> (tamamlandı)</span>}
              </span>
              {i < ORDER_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`h-0.5 flex-1 rounded-full ${
                    done ? "bg-emerald-300" : "bg-slate-200"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
