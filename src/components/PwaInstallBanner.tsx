"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  HelpCircle,
  Smartphone,
  X,
} from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt: () => Promise<void>;
}

interface EnvInfo {
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isInAppBrowser: boolean;
  isGoogleChrome: boolean;
  currentUrl: string;
  chromeOpenUrl: string | null;
}

const DISMISS_STORAGE_KEY = "show_bufe_pwa_banner_dismissed";

function detectClientEnv(): EnvInfo {
  if (typeof window === "undefined") {
    return {
      isStandalone: true,
      isIOS: false,
      isAndroid: false,
      isInAppBrowser: false,
      isGoogleChrome: true,
      currentUrl: "",
      chromeOpenUrl: null,
    };
  }

  const ua = window.navigator.userAgent || "";
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true);

  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isInAppBrowser =
    /FBAN|FBAV|Instagram|Line\/|WhatsApp|Twitter|MicroMessenger|wv\)/i.test(ua);

  const isGoogleChrome =
    !isInAppBrowser &&
    (/Chrome\//i.test(ua) || /CriOS\//i.test(ua)) &&
    !/Edg\/|OPR\/|SamsungBrowser|YaBrowser|UCBrowser/i.test(ua);

  const { href, host, pathname, search, protocol } = window.location;
  const scheme = protocol === "https:" ? "https" : "http";

  let chromeOpenUrl: string | null = null;
  if (isAndroid) {
    chromeOpenUrl = `intent://${host}${pathname}${search}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(
      href
    )};end`;
  } else if (isIOS) {
    const iosScheme = protocol === "https:" ? "googlechromes" : "googlechrome";
    chromeOpenUrl = `${iosScheme}://${host}${pathname}${search}`;
  }

  return {
    isStandalone,
    isIOS,
    isAndroid,
    isInAppBrowser,
    isGoogleChrome,
    currentUrl: href,
    chromeOpenUrl,
  };
}

interface PwaInstallBannerProps {
  compact?: boolean;
}

export function PwaInstallBanner({ compact = false }: PwaInstallBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [env, setEnv] = useState<EnvInfo>(() => ({
    isStandalone: true,
    isIOS: false,
    isAndroid: false,
    isInAppBrowser: false,
    isGoogleChrome: true,
    currentUrl: "",
    chromeOpenUrl: null,
  }));
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [liveStatusMessage, setLiveStatusMessage] = useState("");
  const guideDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setMounted(true);
    const currentEnv = detectClientEnv();
    setEnv(currentEnv);

    try {
      if (window.sessionStorage.getItem(DISMISS_STORAGE_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      // ignore storage errors
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    }

    if (!currentEnv.isStandalone) {
      setLiveStatusMessage(
        "Show Büfe uygulaması cihazınızda kurulu değil. Chrome ile yükleyebilirsiniz."
      );
    }

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
      setLiveStatusMessage(
        "Show Büfe uygulaması tek tıkla kuruluma hazır."
      );
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setEnv((prev) => ({ ...prev, isStandalone: true }));
      setLiveStatusMessage("Show Büfe uygulaması cihazınıza başarıyla kuruldu.");
    };

    const mq = window.matchMedia("(display-mode: standalone)");
    const onDisplayChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setEnv((prev) => ({ ...prev, isStandalone: true }));
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    mq.addEventListener("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      mq.removeEventListener("change", onDisplayChange);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === "accepted") {
        setLiveStatusMessage("Uygulama kurulumu başlatıldı.");
        return;
      }
    }
    guideDialogRef.current?.showModal();
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  const handleCopyUrl = async () => {
    if (!env.currentUrl) return;
    try {
      await navigator.clipboard.writeText(env.currentUrl);
      setCopiedUrl(true);
      setLiveStatusMessage("Uygulama adresi panoya kopyalandı.");
      window.setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // ignore clipboard denial
    }
  };

  if (!mounted || env.isStandalone) {
    return null;
  }

  return (
    <>
      {/* Pre-populated live region for screen readers */}
      <div aria-live="polite" className="sr-only">
        {liveStatusMessage}
      </div>

      {!dismissed ? (
        <div
          role="region"
          aria-label="Uygulama Kurulum ve Chrome Bildirimi"
          className={`no-print border-b border-sky-200 bg-gradient-to-r from-sky-50 via-white to-amber-50/70 ${
            compact ? "rounded-2xl border p-3 mb-4 shadow-sm" : "px-3 sm:px-6 py-2.5"
          }`}
        >
          <div className="mx-auto max-w-[1440px] flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
                {env.isInAppBrowser || !env.isGoogleChrome ? (
                  <Globe className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Smartphone className="h-5 w-5" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 text-xs sm:text-sm">
                <div className="font-bold text-slate-900">
                  {env.isInAppBrowser || !env.isGoogleChrome
                    ? "En iyi deneyim ve kurulum için uygulamayı Google Chrome'da açın"
                    : "Show Büfe uygulaması cihazınızda kurulu değil"}
                </div>
                <p className="text-[11px] sm:text-xs font-medium text-slate-600">
                  Tam ekran kiosk görünümü ve hızlı erişim için Chrome üzerinden
                  ana ekrana/masaüstüne kurabilirsiniz.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {env.chromeOpenUrl && !env.isGoogleChrome && (
                <a
                  href={env.chromeOpenUrl}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600 transition"
                >
                  <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Chrome&apos;da Aç</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </a>
              )}

              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={() => void handleInstallClick()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-sky-700 active:scale-[0.99] transition"
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Uygulamayı Kur (PWA)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => guideDialogRef.current?.showModal()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-sky-700 transition"
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Uygulamayı Kur</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Kurulum bildirimini kapat"
                title="Daha Sonra"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-print mx-auto max-w-[1440px] px-3 sm:px-6 pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setDismissed(false);
              guideDialogRef.current?.showModal();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-800 hover:bg-sky-100"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Uygulamayı Kur / Chrome&apos;da Aç</span>
          </button>
        </div>
      )}

      {/* PWA Install & Open in Chrome Guide Modal */}
      <dialog
        ref={guideDialogRef}
        {...({ closedby: "any" } as Record<string, unknown>)}
        aria-labelledby="pwa-guide-title"
        onCancel={(e) => {
          e.preventDefault();
          guideDialogRef.current?.close();
        }}
        onClick={(e) => {
          if (e.target === guideDialogRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const inside =
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom;
            if (!inside) guideDialogRef.current?.close();
          }
        }}
        className="no-print"
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Globe className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3
                  id="pwa-guide-title"
                  className="text-base font-bold text-slate-900"
                >
                  Show Büfe Kurulum &amp; Chrome Rehberi
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  Uygulama olarak kurarak tam ekran ve hızlı kullanım sağlayın.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => guideDialogRef.current?.close()}
              aria-label="Kapat"
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Open in Google Chrome Section */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
              <Globe className="h-4 w-4 text-amber-700" aria-hidden="true" />
              <span>Google Chrome ile Aç</span>
            </div>
            <p className="text-xs font-medium text-amber-900">
              Uygulamayı doğrudan Google Chrome tarayıcısında açarak PWA
              kurulumunu etkinleştirebilirsiniz.
            </p>
            <div className="flex flex-wrap gap-2">
              {env.chromeOpenUrl && (
                <a
                  href={env.chromeOpenUrl}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-amber-700"
                >
                  <Globe className="h-4 w-4" aria-hidden="true" />
                  <span>Google Chrome&apos;da Başlat</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
              <button
                type="button"
                onClick={() => void handleCopyUrl()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100"
              >
                {copiedUrl ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    <span>Adres Kopyalandı</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Adresi Kopyala (Chrome&apos;a Yapıştır)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Step by step installation */}
          <div className="space-y-2.5 text-xs text-slate-700">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <HelpCircle className="h-4 w-4 text-sky-600" aria-hidden="true" />
              <span>Cihaza Göre Kurulum Adımları</span>
            </div>

            {env.isIOS ? (
              <ol className="list-decimal pl-5 space-y-1.5 font-medium">
                <li>
                  Safari veya Chrome alt/üst çubuğundaki{" "}
                  <strong>Paylaş (Share)</strong> simgesine dokunun.
                </li>
                <li>
                  Açılan menüden <strong>&ldquo;Ana Ekrana Ekle&rdquo;</strong>{" "}
                  seçeneğini seçin.
                </li>
                <li>
                  Sağ üstten <strong>&ldquo;Ekle&rdquo;</strong> butonuna
                  dokunarak uygulamayı kurun.
                </li>
              </ol>
            ) : (
              <ol className="list-decimal pl-5 space-y-1.5 font-medium">
                <li>
                  Sayfanın Google Chrome üzerinden (ve HTTPS ile) açık
                  olduğundan emin olun.
                </li>
                <li>
                  Adres çubuğunun sağındaki{" "}
                  <strong>Yükle (Bilgisayar/Telefon +)</strong> simgesine veya
                  sağ üst <strong>⋮ → Uygulamayı yükle / Ana ekrana ekle</strong>{" "}
                  menüsüne tıklayın.
                </li>
                <li>
                  <strong>&ldquo;Yükle&rdquo;</strong> onayı verdiğinizde Show
                  Büfe bağımsız pencere ve ikon ile kurulur.
                </li>
              </ol>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            {deferredPrompt && (
              <button
                type="button"
                onClick={() => void handleInstallClick()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Şimdi Kur</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => guideDialogRef.current?.close()}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            >
              Tamam
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
