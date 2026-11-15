"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  ChefHat,
  ClipboardList,
  Database,
  LayoutGrid,
  LogOut,
  PlusCircle,
  Printer,
  RefreshCw,
  TriangleAlert,
  UserCheck,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PrinterSettingsDialog } from "@/components/PrinterSettingsDialog";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import { ACTION_ERROR_EVENT } from "@/hooks/useAdisyonStream";
import type {
  AuthUser,
  DbMode,
  PrinterConfig,
  UserRole,
} from "@/types/adisyon";

interface AppShellProps {
  children: React.ReactNode;
  activeQueueCount?: number;
  readyCount?: number;
  hasActivePrinter?: boolean;
  printerConfig?: PrinterConfig;
  dbMode?: DbMode;
  dbNotice?: string;
  onRefresh?: () => void;
  bottomExtra?: React.ReactNode;
}

const ROLE_LABELS: Record<UserRole, { label: string; className: string }> = {
  ADMIN: {
    label: "Admin",
    className: "border-sky-200 bg-sky-50 text-sky-800",
  },
  SIPARIS: {
    label: "Sipariş",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  MUTFAK: {
    label: "Mutfak",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  },
};

const ALL_NAV_ITEMS = [
  {
    href: "/",
    label: "Adisyon Al",
    shortLabel: "Adisyon",
    icon: PlusCircle,
    roles: ["ADMIN", "SIPARIS", "MUTFAK"] as UserRole[],
  },
  {
    href: "/bekleyenler",
    label: "Bekleyenler",
    shortLabel: "Bekleyen",
    icon: ClipboardList,
    roles: ["ADMIN", "SIPARIS", "MUTFAK"] as UserRole[],
  },
  {
    href: "/mutfak",
    label: "Mutfak Ekranı",
    shortLabel: "Mutfak",
    icon: ChefHat,
    roles: ["ADMIN", "SIPARIS", "MUTFAK"] as UserRole[],
  },
  {
    href: "/coklu-ekran",
    label: "Çoklu Ekran",
    shortLabel: "Çoklu",
    icon: LayoutGrid,
    roles: ["ADMIN", "SIPARIS", "MUTFAK"] as UserRole[],
  },
  {
    href: "/admin",
    label: "Admin Rapor & Akış",
    shortLabel: "Admin",
    icon: BarChart3,
    roles: ["ADMIN"] as UserRole[],
  },
];

export function AppShell({
  children,
  activeQueueCount = 0,
  readyCount = 0,
  hasActivePrinter = false,
  printerConfig = { enabled: false, printerName: "", autoPrint: true },
  dbMode = "postgres",
  dbNotice,
  onRefresh,
  bottomExtra,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [printerDialogOpen, setPrinterDialogOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Başarısız durum değişikliklerini her ekranda aynı yerde göster
  useEffect(() => {
    const onActionError = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setActionError(detail || "İşlem tamamlanamadı.");
    };
    window.addEventListener(ACTION_ERROR_EVENT, onActionError);
    return () => window.removeEventListener(ACTION_ERROR_EVENT, onActionError);
  }, []);

  useEffect(() => {
    if (!actionError) return;
    const t = window.setTimeout(() => setActionError(null), 8000);
    return () => window.clearTimeout(t);
  }, [actionError]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          if (!cancelled) {
            setUser(null);
            router.replace("/login");
          }
          return;
        }
        const data = (await res.json()) as { user: AuthUser | null };
        if (!cancelled) {
          if (!data.user) {
            router.replace("/login");
          } else {
            setUser(data.user);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          router.replace("/login");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAuthLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
    router.refresh();
  };

  const normalizedRoleKey = String(user?.role ?? "")
    .trim()
    .toUpperCase();
  const normalizedRole: UserRole =
    normalizedRoleKey in ROLE_LABELS
      ? (normalizedRoleKey as UserRole)
      : "SIPARIS";

  const visibleNavItems = ALL_NAV_ITEMS.filter((item) =>
    user ? item.roles.includes(normalizedRole) : item.roles.includes("SIPARIS")
  );

  if (authLoading || !user) {
    return (
      <div className="no-print min-h-dvh flex items-center justify-center bg-slate-50 text-slate-600 p-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm text-sm font-bold">
          Oturum doğrulanıyor...
        </div>
      </div>
    );
  }

  const roleMeta = ROLE_LABELS[normalizedRole] ?? ROLE_LABELS.SIPARIS;

  return (
    <div className="no-print min-h-dvh flex flex-col bg-slate-50 text-slate-900">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1440px] px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
          {/* Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo size="md" />
            <div className="min-w-0">
              <h1 className="fluid-page-title font-extrabold tracking-tight text-slate-900 leading-tight">
                Show Büfe
              </h1>
              <p className="text-xs font-medium text-slate-500 truncate">
                Adisyon &amp; Çoklu Mutfak Ekranı
              </p>
            </div>
          </div>

          {/* Desktop & Tablet Navigation */}
          <nav
            aria-label="Ana Ekranlar"
            className="hidden md:flex items-center gap-1 rounded-xl bg-slate-100 p-1"
          >
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-white text-sky-700 shadow-sm ring-1 ring-slate-200/80"
                      : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.href === "/bekleyenler" && activeQueueCount > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                      {activeQueueCount}
                    </span>
                  )}
                  {item.href === "/mutfak" && readyCount > 0 && (
                    <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                      {readyCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Status, Printer, User & Logout */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setPrinterDialogOpen(true)}
              title={
                hasActivePrinter
                  ? `Aktif Yazıcı: ${printerConfig.printerName}${
                      printerConfig.autoPrint ? " (Otomatik Yazdır)" : ""
                    }`
                  : "Kayıtlı/ekli yazıcı yok. Yazıcı eklemek için tıklayın."
              }
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
                hasActivePrinter
                  ? "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100"
                  : "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Printer className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">
                {hasActivePrinter
                  ? printerConfig.autoPrint
                    ? "Otomatik Yazdır"
                    : "Yazıcı Aktif"
                  : "Yazıcı Yok"}
              </span>
            </button>

            <div
              title={
                dbNotice ||
                "PostgreSQL veritabanı bağlantısı aktif ve senkronize."
              }
              className={`hidden xl:inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold ${
                dbMode === "postgres"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              <Database className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {dbMode === "postgres" ? "PostgreSQL" : "Yerel Mod"}
              </span>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold ${roleMeta.className}`}
            >
              <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">{user.displayName}</span>
              <span className="sm:hidden">{roleMeta.label}</span>
            </div>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                aria-label="Ekranı yenile"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-[0.98] transition"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                <span className="hidden lg:inline">Yenile</span>
              </button>
            )}

            <a
              href="/tanitim.html"
              target="_blank"
              rel="noopener noreferrer"
              title="Uygulama Tanıtım Sunumu (HTML)"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-800 transition"
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden="true" />
              <span className="hidden lg:inline">Tanıtım</span>
            </a>

            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label="Çıkış yap"
              title="Çıkış Yap"
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 active:scale-[0.98] transition"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Çıkış</span>
            </button>
          </div>
        </div>

        {dbMode === "fallback" && dbNotice && (
          <div className="border-t border-amber-200 bg-amber-50 px-3 sm:px-6 py-1.5 text-xs font-medium text-amber-900">
            <div className="mx-auto max-w-[1440px] flex items-center justify-between gap-2">
              <span>
                Bilgi: Local PostgreSQL bağlantısı henüz doğrulanmadı; şu anda{" "}
                <code>data/local-db.json</code> yedek deposu kullanılıyor.{" "}
                <code>.env</code> dosyasına kendi PostgreSQL bilgilerinizi girip
                sunucuyu yenilediğinizde otomatik olarak PostgreSQL&apos;e geçer.
              </span>
            </div>
          </div>
        )}
      </header>

      <PwaInstallBanner />

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-[1440px] px-3 sm:px-6 py-4 pb-28 md:pb-8">
        {children}
      </main>

      {actionError && (
        <div
          role="alert"
          className="fixed inset-x-3 bottom-24 md:bottom-6 z-40 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-900 shadow-lg"
        >
          <span className="inline-flex items-center gap-2 min-w-0">
            <TriangleAlert
              className="h-5 w-5 shrink-0 text-rose-600"
              aria-hidden="true"
            />
            <span>{actionError}</span>
          </span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Hata bildirimini kapat"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-rose-100"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(15,23,42,0.06)] safe-bottom-bar pt-1.5">
        {bottomExtra && <div className="mb-1.5">{bottomExtra}</div>}
        <nav
          aria-label="Mobil Ekranlar"
          className={`grid gap-1 ${
            visibleNavItems.length === 5 ? "grid-cols-5" : "grid-cols-4"
          }`}
        >
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-1.5 px-1 text-[11px] font-bold transition-colors ${
                  isActive
                    ? "bg-sky-50 text-sky-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="truncate max-w-full">{item.shortLabel}</span>
                {item.href === "/bekleyenler" && activeQueueCount > 0 && (
                  <span className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-extrabold text-white">
                    {activeQueueCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <PrinterSettingsDialog
        open={printerDialogOpen}
        onClose={() => setPrinterDialogOpen(false)}
        initialConfig={printerConfig}
        onSaved={() => {
          onRefresh?.();
        }}
      />
    </div>
  );
}
