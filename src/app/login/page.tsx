"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChefHat,
  ClipboardList,
  Lock,
  LogIn,
  ShieldCheck,
  User,
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { PwaInstallBanner } from "@/components/PwaInstallBanner";
import type { UserRole } from "@/types/adisyon";

const QUICK_ACCOUNTS: Array<{
  username: string;
  title: string;
  subtitle: string;
  role: UserRole;
  icon: typeof ShieldCheck;
  badgeClass: string;
}> = [
  {
    username: "admin",
    title: "Admin",
    subtitle: "Anlık Akış, Raporlama & Tüm Ekranlar",
    role: "ADMIN",
    icon: ShieldCheck,
    badgeClass: "border-sky-200 bg-sky-50 text-sky-900 hover:border-sky-400",
  },
  {
    username: "siparis",
    title: "Sipariş",
    subtitle: "Adisyon Alma, Bekleyenler & Teslim Edilenler",
    role: "SIPARIS",
    icon: ClipboardList,
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-900 hover:border-emerald-400",
  },
  {
    username: "mutfak",
    title: "Mutfak",
    subtitle: "Ürün Gruplama (KDS) & Sıra Takibi",
    role: "MUTFAK",
    icon: ChefHat,
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-400",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("siparis");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = (await res.json()) as {
        redirectTo?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Giriş başarısız.");
      }

      router.replace(data.redirectTo || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bağlantı hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <PwaInstallBanner compact={true} />
      </div>
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-lg space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <BrandLogo size="lg" />
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">
              Show Büfe Giriş
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Adisyon, Sipariş Kuyruğu ve Mutfak Sistemi
            </p>
          </div>
        </div>

        {/* Role Quick Select */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              Hızlı Kullanıcı Seçimi
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
              Varsayılan Şifre: <code>123456</code>
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {QUICK_ACCOUNTS.map((acc) => {
              const Icon = acc.icon;
              const selected =
                username.trim().toLowerCase() === acc.username.toLowerCase();
              return (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => {
                    setUsername(acc.username);
                    setPassword("123456");
                    setError(null);
                  }}
                  className={`flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition ${
                    acc.badgeClass
                  } ${
                    selected
                      ? "ring-2 ring-sky-600 shadow-sm"
                      : "opacity-85 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-extrabold text-sm">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{acc.title}</span>
                  </div>
                  <span className="text-[11px] font-medium leading-tight opacity-85">
                    {acc.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-username"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Kullanıcı Adı
            </label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin, siparis veya mutfak"
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm font-bold text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
                required
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Şifre
            </label>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2.5 text-sm font-bold text-slate-900 focus:border-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-600/20"
                required
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-sky-700 disabled:opacity-50 active:scale-[0.99]"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            <span>{loading ? "Giriş Yapılıyor..." : "Sisteme Giriş Yap"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
