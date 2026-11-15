import fs from "node:fs";
import path from "node:path";

const OUTPUT_DIR = path.join(process.cwd(), "public", "sunum");
const FONT_SANS =
  "Plus Jakarta Sans, Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
const FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function wrapSvg(width, height, title, defs, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(
    title
  )}">
  <defs>
    <filter id="cardShadow" x="-8%" y="-8%" width="116%" height="122%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#0f172a" flood-opacity="0.10" />
    </filter>
    <filter id="softShadow" x="-6%" y="-6%" width="112%" height="118%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.07" />
    </filter>
    <linearGradient id="skyBrand" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0369a1" />
    </linearGradient>
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>
    <linearGradient id="meshBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="55%" stop-color="#f0f9ff" />
      <stop offset="100%" stop-color="#fffbeb" />
    </linearGradient>
    <pattern id="dotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="#cbd5e1" opacity="0.55" />
    </pattern>
    ${defs}
  </defs>
  ${body}
</svg>
`;
}

function miniBrandBadge(x, y) {
  return `
    <g transform="translate(${x}, ${y})">
      <rect x="0" y="0" width="28" height="28" rx="8" fill="url(#skyBrand)" />
      <path d="M7 18 C7 12.5 21 12.5 21 18 Z" fill="#ffffff" />
      <circle cx="14" cy="9.5" r="2.2" fill="#fbbf24" />
      <rect x="6" y="19.5" width="16" height="2.4" rx="1.2" fill="#e0f2fe" />
    </g>
  `;
}

function pill(x, y, w, h, fill, textColor, label, stroke = "none") {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.round(
      h / 2
    )}" fill="${fill}" stroke="${stroke}" />
    <text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle" font-family="${FONT_SANS}" font-size="11" font-weight="700" fill="${textColor}">${esc(
      label
    )}</text>
  `;
}

function buildHeroEcosystem() {
  return wrapSvg(
    1200,
    680,
    "Show Büfe Çoklu Ekran Adisyon, Mutfak KDS ve Yazıcı Ekosistemi",
    "",
    `
    <rect width="1200" height="680" rx="28" fill="url(#meshBg)" />
    <rect width="1200" height="680" rx="28" fill="url(#dotGrid)" />

    <!-- Soft Ambient Blobs -->
    <circle cx="160" cy="110" r="170" fill="#bae6fd" opacity="0.32" />
    <circle cx="1060" cy="540" r="190" fill="#fde68a" opacity="0.28" />

    <!-- Connector Lines -->
    <path d="M 335 320 C 375 320, 385 265, 420 265" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="6 6" opacity="0.65" />
    <path d="M 865 245 C 905 245, 915 215, 945 215" fill="none" stroke="#10b981" stroke-width="2.5" stroke-dasharray="6 6" opacity="0.7" />
    <path d="M 865 435 C 910 435, 915 485, 945 485" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="6 6" opacity="0.7" />

    <!-- CENTER DESKTOP: MUTFAK KDS -->
    <g filter="url(#cardShadow)">
      <rect x="405" y="72" width="465" height="450" rx="22" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
      <!-- Header -->
      <rect x="405" y="72" width="465" height="58" rx="22" fill="#0f172a" />
      <rect x="405" y="108" width="465" height="22" fill="#0f172a" />
      ${miniBrandBadge(425, 87)}
      <text x="462" y="101" font-family="${FONT_SANS}" font-size="14" font-weight="800" fill="#ffffff">Mutfak Ekranı (KDS)</text>
      <text x="462" y="117" font-family="${FONT_SANS}" font-size="10.5" font-weight="600" fill="#94a3b8">Benzer Ürün Gruplama &amp; Sıra Görünümü</text>
      ${pill(738, 89, 114, 24, "#064e3b", "#6ee7b7", "● CANLI 2.5 SN")}

      <!-- Left Column: Grouped Dishes -->
      <text x="425" y="156" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0f172a">Benzer Ürün Grupları</text>
      <text x="425" y="172" font-family="${FONT_SANS}" font-size="10" font-weight="600" fill="#64748b">Aynı ürün ve varyasyonlar tek kartta birleşir</text>

      <!-- Group Card 1 -->
      <rect x="425" y="186" width="235" height="106" rx="14" fill="#f0f9ff" stroke="#bae6fd" />
      <text x="439" y="208" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#0c4a6e">#11 KAŞARLI OMLET</text>
      ${pill(604, 193, 44, 20, "#0284c7", "#ffffff", "6 AD")}
      <rect x="439" y="220" width="92" height="22" rx="7" fill="#ffffff" stroke="#7dd3fc" />
      <text x="485" y="235" text-anchor="middle" font-family="${FONT_SANS}" font-size="10" font-weight="700" fill="#0369a1">ORTA × 4</text>
      <rect x="537" y="220" width="82" height="22" rx="7" fill="#ffffff" stroke="#7dd3fc" />
      <text x="578" y="235" text-anchor="middle" font-family="${FONT_SANS}" font-size="10" font-weight="700" fill="#0369a1">İYİ × 2</text>
      <rect x="439" y="254" width="98" height="26" rx="8" fill="#f59e0b" />
      <text x="488" y="271" text-anchor="middle" font-family="${FONT_SANS}" font-size="10.5" font-weight="800" fill="#ffffff">Ocağa Al</text>
      <rect x="545" y="254" width="102" height="26" rx="8" fill="#10b981" />
      <text x="596" y="271" text-anchor="middle" font-family="${FONT_SANS}" font-size="10.5" font-weight="800" fill="#ffffff">Hazır İşaretle</text>

      <!-- Group Card 2 -->
      <rect x="425" y="304" width="235" height="94" rx="14" fill="#fffbeb" stroke="#fde68a" />
      <text x="439" y="326" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#78350f">#18 MENEMEN</text>
      ${pill(604, 311, 44, 20, "#d97706", "#ffffff", "4 AD")}
      <rect x="439" y="338" width="198" height="22" rx="7" fill="#ffffff" stroke="#fcd34d" />
      <text x="538" y="353" text-anchor="middle" font-family="${FONT_SANS}" font-size="10" font-weight="700" fill="#92400e">SUCUKLU • SOĞANLI × 3, ACILI × 1</text>
      <rect x="439" y="366" width="208" height="22" rx="7" fill="#d97706" />
      <text x="543" y="381" text-anchor="middle" font-family="${FONT_SANS}" font-size="10" font-weight="800" fill="#ffffff">Toplu Hazırla (3 Adisyonda)</text>

      <!-- Group Card 3 -->
      <rect x="425" y="410" width="235" height="88" rx="14" fill="#f8fafc" stroke="#e2e8f0" />
      <text x="439" y="432" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#0f172a">#6 PANKEK</text>
      ${pill(604, 417, 44, 20, "#475569", "#ffffff", "5 AD")}
      <rect x="439" y="444" width="206" height="22" rx="7" fill="#ffffff" stroke="#cbd5e1" />
      <text x="542" y="459" text-anchor="middle" font-family="${FONT_SANS}" font-size="10" font-weight="700" fill="#334155">ÇİKOLATALI × 3 • ORMAN MEYVELİ × 2</text>
      <text x="439" y="485" font-family="${FONT_SANS}" font-size="10" font-weight="700" fill="#10b981">✓ Mutfak tezgahında hazırlanıyor</text>

      <!-- Right Column: Active Queue -->
      <text x="676" y="156" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0f172a">Sıra Akışı</text>

      <rect x="676" y="170" width="174" height="106" rx="14" fill="#ffffff" stroke="#e2e8f0" />
      <text x="690" y="191" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0284c7">Sıra #14</text>
      ${pill(772, 177, 66, 20, "#fef3c7", "#b45309", "OCAKTA")}
      <text x="690" y="209" font-family="${FONT_SANS}" font-size="10.5" font-weight="700" fill="#334155">Oda 412 • Ahmet Y.</text>
      <text x="690" y="226" font-family="${FONT_SANS}" font-size="10" fill="#475569">2× Kaşarlı Omlet (Orta)</text>
      <text x="690" y="241" font-family="${FONT_SANS}" font-size="10" fill="#475569">1× Menemen (Sucuklu)</text>
      <text x="690" y="262" font-family="${FONT_SANS}" font-size="9.5" font-weight="700" fill="#64748b">🕒 09:14 • 04 dk 18 sn</text>

      <rect x="676" y="286" width="174" height="102" rx="14" fill="#ffffff" stroke="#e2e8f0" />
      <text x="690" y="307" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0284c7">Sıra #15</text>
      ${pill(772, 293, 66, 20, "#dcfce7", "#047857", "HAZIR")}
      <text x="690" y="325" font-family="${FONT_SANS}" font-size="10.5" font-weight="700" fill="#334155">Masa Teras • Selin K.</text>
      <text x="690" y="342" font-family="${FONT_SANS}" font-size="10" fill="#475569">3× Pankek (Çikolatalı)</text>
      <text x="690" y="357" font-family="${FONT_SANS}" font-size="10" fill="#475569">2× Kaşarlı Omlet (İyi)</text>
      <text x="690" y="376" font-family="${FONT_SANS}" font-size="9.5" font-weight="700" fill="#047857">✓ Teslimata hazır</text>

      <rect x="676" y="398" width="174" height="100" rx="14" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="4 3" />
      <text x="690" y="421" font-family="${FONT_SANS}" font-size="11.5" font-weight="800" fill="#0f172a">Admin &amp; Rapor Özeti</text>
      <text x="690" y="441" font-family="${FONT_SANS}" font-size="10" fill="#475569">Bugün: 128 Adisyon</text>
      <text x="690" y="457" font-family="${FONT_SANS}" font-size="10" fill="#475569">342 Porsiyon • %96.8</text>
      ${pill(690, 468, 144, 22, "#e0f2fe", "#0369a1", "Excel &amp; PDF Rapor Hazır")}
    </g>

    <!-- LEFT TABLET: ADISYON AL -->
    <g filter="url(#cardShadow)">
      <rect x="46" y="132" width="302" height="444" rx="28" fill="#0f172a" />
      <rect x="58" y="144" width="278" height="420" rx="20" fill="#ffffff" />
      ${miniBrandBadge(74, 158)}
      <text x="110" y="171" font-family="${FONT_SANS}" font-size="13" font-weight="800" fill="#0f172a">Adisyon Başlat</text>
      <text x="110" y="185" font-family="${FONT_SANS}" font-size="10" font-weight="600" fill="#64748b">Oda / Misafir + Varyasyon</text>

      <!-- Room + Guest -->
      <rect x="74" y="200" width="114" height="36" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="84" y="213" font-family="${FONT_SANS}" font-size="9" font-weight="700" fill="#64748b">ODA NO</text>
      <text x="84" y="229" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0f172a">412</text>

      <rect x="196" y="200" width="124" height="36" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="206" y="213" font-family="${FONT_SANS}" font-size="9" font-weight="700" fill="#64748b">MİSAFİR</text>
      <text x="206" y="229" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0f172a">Ahmet Yılmaz</text>

      <!-- Categories -->
      ${pill(74, 248, 72, 24, "#0284c7", "#ffffff", "Omletler")}
      ${pill(152, 248, 86, 24, "#f1f5f9", "#475569", "Sahanda")}
      ${pill(244, 248, 76, 24, "#f1f5f9", "#475569", "Börekler")}

      <!-- Product with Variation Chips -->
      <rect x="74" y="284" width="246" height="122" rx="14" fill="#f0f9ff" stroke="#0284c7" stroke-width="1.5" />
      <text x="88" y="306" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0f172a">#11 KAŞARLI OMLET</text>
      <text x="88" y="322" font-family="${FONT_SANS}" font-size="10" font-weight="600" fill="#0369a1">Pişirme Derecesi Seçimi</text>
      ${pill(88, 333, 50, 26, "#ffffff", "#334155", "AZ", "#cbd5e1")}
      ${pill(144, 333, 60, 26, "#0284c7", "#ffffff", "ORTA ✓")}
      ${pill(210, 333, 46, 26, "#ffffff", "#334155", "İYİ", "#cbd5e1")}
      ${pill(262, 333, 48, 26, "#ffffff", "#334155", "ÇOK", "#cbd5e1")}
      <text x="88" y="390" font-family="${FONT_SANS}" font-size="10.5" font-weight="700" fill="#0f172a">Adet: 2 • Not: Sıcak servis</text>

      <!-- Action Buttons -->
      <rect x="74" y="420" width="246" height="58" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
      <text x="88" y="443" font-family="${FONT_SANS}" font-size="11" font-weight="800" fill="#0f172a">Sepet: 3 Kalem Ürün</text>
      <text x="88" y="462" font-family="${FONT_SANS}" font-size="10" font-weight="600" fill="#64748b">Yazıcı: Otomatik Açık</text>

      <rect x="74" y="492" width="150" height="44" rx="12" fill="url(#skyBrand)" />
      <text x="149" y="518" text-anchor="middle" font-family="${FONT_SANS}" font-size="11.5" font-weight="800" fill="#ffffff">Kaydet &amp; Yazdır</text>
      <rect x="230" y="492" width="90" height="44" rx="12" fill="#f1f5f9" stroke="#cbd5e1" />
      <text x="275" y="518" text-anchor="middle" font-family="${FONT_SANS}" font-size="11" font-weight="700" fill="#334155">Kaydet</text>
    </g>

    <!-- TOP RIGHT MOBILE: BEKLEYENLER & PWA -->
    <g filter="url(#cardShadow)">
      <rect x="928" y="64" width="224" height="328" rx="28" fill="#0f172a" />
      <rect x="938" y="76" width="204" height="304" rx="20" fill="#f8fafc" />
      <rect x="996" y="84" width="88" height="12" rx="6" fill="#0f172a" />

      <text x="954" y="122" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#0f172a">Bekleyenler &amp; Sıra</text>
      ${pill(954, 134, 172, 26, "#e0f2fe", "#0369a1", "📱 Chrome PWA Hazır")}

      <rect x="954" y="172" width="172" height="114" rx="14" fill="#ffffff" stroke="#e2e8f0" />
      <text x="966" y="193" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0284c7">Sıra #14</text>
      ${pill(1046, 179, 68, 20, "#dcfce7", "#047857", "HAZIR")}
      <text x="966" y="212" font-family="${FONT_SANS}" font-size="10.5" font-weight="700" fill="#0f172a">Oda 412 • 09:14</text>
      <text x="966" y="230" font-family="${FONT_SANS}" font-size="10" font-weight="700" fill="#d97706">⏱ Geçen: 04 dk 18 sn</text>
      <rect x="966" y="244" width="70" height="28" rx="8" fill="#10b981" />
      <text x="1001" y="262" text-anchor="middle" font-family="${FONT_SANS}" font-size="10" font-weight="800" fill="#ffffff">Teslim Et</text>
      <rect x="1042" y="244" width="72" height="28" rx="8" fill="#f1f5f9" stroke="#cbd5e1" />
      <text x="1078" y="262" text-anchor="middle" font-family="${FONT_SANS}" font-size="10" font-weight="700" fill="#334155">↺ Geri Al</text>

      <rect x="954" y="298" width="172" height="62" rx="12" fill="#ecfdf5" stroke="#a7f3d0" />
      <text x="966" y="320" font-family="${FONT_SANS}" font-size="10.5" font-weight="800" fill="#065f46">✓ Teslim Edilenler Arşivi</text>
      <text x="966" y="338" font-family="${FONT_SANS}" font-size="9.5" fill="#047857">Bugün 42 adisyon tamamlandı</text>
    </g>

    <!-- BOTTOM RIGHT CARD: 80MM YAZICI & COOLIFY -->
    <g filter="url(#cardShadow)">
      <rect x="928" y="416" width="224" height="184" rx="20" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" />
      <text x="948" y="444" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#0f172a">80mm Akıllı Yazıcı</text>
      <text x="948" y="460" font-family="${FONT_SANS}" font-size="10" font-weight="600" fill="#64748b">Yazıcı yoksa gizlenir, varsa otomatik</text>

      <rect x="948" y="476" width="184" height="74" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="3 3" />
      <text x="1040" y="497" text-anchor="middle" font-family="${FONT_MONO}" font-size="10" font-weight="700" fill="#0f172a">ROYAL SHOW BÜFE</text>
      <text x="1040" y="513" text-anchor="middle" font-family="${FONT_MONO}" font-size="10" fill="#334155">SIRA #14 | ODA 412</text>
      <text x="1040" y="529" text-anchor="middle" font-family="${FONT_MONO}" font-size="9.5" fill="#475569">2x KAŞARLI OMLET (ORTA)</text>

      ${pill(948, 560, 184, 24, "#dcfce7", "#047857", "● Coolify + Postgres Otomatik")}
    </g>

    <!-- BOTTOM STAT RIBBON -->
    <g filter="url(#softShadow)">
      <rect x="405" y="544" width="465" height="66" rx="18" fill="#ffffff" stroke="#e2e8f0" />
      <text x="455" y="572" text-anchor="middle" font-family="${FONT_SANS}" font-size="17" font-weight="800" fill="#0284c7">40 Ürün</text>
      <text x="455" y="592" text-anchor="middle" font-family="${FONT_SANS}" font-size="10.5" font-weight="600" fill="#64748b">Show Büfe Menüsü</text>
      <line x1="518" y1="556" x2="518" y2="598" stroke="#e2e8f0" />

      <text x="582" y="572" text-anchor="middle" font-family="${FONT_SANS}" font-size="17" font-weight="800" fill="#0f172a">3 Rol</text>
      <text x="582" y="592" text-anchor="middle" font-family="${FONT_SANS}" font-size="10.5" font-weight="600" fill="#64748b">Admin / Sipariş / Mutfak</text>
      <line x1="646" y1="556" x2="646" y2="598" stroke="#e2e8f0" />

      <text x="708" y="572" text-anchor="middle" font-family="${FONT_SANS}" font-size="17" font-weight="800" fill="#10b981">6 Ekran</text>
      <text x="708" y="592" text-anchor="middle" font-family="${FONT_SANS}" font-size="10.5" font-weight="600" fill="#64748b">Çoklu Cihaz Senkronu</text>
      <line x1="770" y1="556" x2="770" y2="598" stroke="#e2e8f0" />

      <text x="822" y="572" text-anchor="middle" font-family="${FONT_SANS}" font-size="17" font-weight="800" fill="#d97706">PWA</text>
      <text x="822" y="592" text-anchor="middle" font-family="${FONT_SANS}" font-size="10.5" font-weight="600" fill="#64748b">Chrome Kurulumu</text>
    </g>
    `
  );
}

function buildWorkflowDiagram() {
  const steps = [
    {
      num: "01",
      title: "Adisyon Başlat",
      sub: "Oda No / Misafir Adı",
      color: "#0284c7",
      bg: "#f0f9ff",
      border: "#bae6fd",
      lines: [
        "• Oda no veya isimle açılış",
        "• 6 kategoride 40 ürün",
        "• Tekli / çoklu varyasyonlar",
        "• Özel not ve porsiyon adedi",
      ],
    },
    {
      num: "02",
      title: "Kaydet & Yazdır",
      sub: "Akıllı Yazıcı Algılama",
      color: "#d97706",
      bg: "#fffbeb",
      border: "#fde68a",
      lines: [
        "• Otomatik sıra numarası (#)",
        "• Yazıcı yoksa buton gizlenir",
        "• Yazıcı varsa otomatik fiş",
        "• 80mm profesyonel şablon",
      ],
    },
    {
      num: "03",
      title: "Mutfak KDS Grubu",
      sub: "Benzer Ürün Birleştirme",
      color: "#7c3aed",
      bg: "#f5f3ff",
      border: "#ddd6fe",
      lines: [
        "• Aynı ürün & varyasyon grubu",
        "• Örn: KAŞARLI OMLET ORTA ×4",
        "• Tek tıkla toplu Ocağa Al",
        "• Sıraya göre adisyon içeriği",
      ],
    },
    {
      num: "04",
      title: "Takip & Rapor",
      sub: "Süre, Geri Al & Analiz",
      color: "#059669",
      bg: "#ecfdf5",
      border: "#a7f3d0",
      lines: [
        "• Saat ve canlı geçen süre",
        "• Hatalı geçişe 1 adım Geri Al",
        "• Teslim edilenler arşivi",
        "• Excel & PDF Akıllı Raporlar",
      ],
    },
  ];

  const cards = steps
    .map((step, i) => {
      const x = 36 + i * 290;
      const linesSvg = step.lines
        .map(
          (line, idx) =>
            `<text x="${x + 22}" y="${224 + idx * 32}" font-family="${FONT_SANS}" font-size="13" font-weight="600" fill="#334155">${esc(
              line
            )}</text>`
        )
        .join("");

      const arrow =
        i < steps.length - 1
          ? `
        <g transform="translate(${x + 266}, 212)">
          <circle cx="8" cy="8" r="16" fill="#ffffff" stroke="#cbd5e1" />
          <path d="M 4 2 L 12 8 L 4 14" fill="none" stroke="#0284c7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </g>`
          : "";

      return `
        <g filter="url(#softShadow)">
          <rect x="${x}" y="76" width="258" height="296" rx="22" fill="#ffffff" stroke="${step.border}" stroke-width="1.8" />
          <rect x="${x + 16}" y="94" width="226" height="92" rx="16" fill="${step.bg}" />
          <rect x="${x + 30}" y="108" width="40" height="40" rx="12" fill="${step.color}" />
          <text x="${x + 50}" y="134" text-anchor="middle" font-family="${FONT_SANS}" font-size="16" font-weight="800" fill="#ffffff">${step.num}</text>
          <text x="${x + 84}" y="126" font-family="${FONT_SANS}" font-size="15.5" font-weight="800" fill="#0f172a">${esc(
            step.title
          )}</text>
          <text x="${x + 84}" y="146" font-family="${FONT_SANS}" font-size="11.5" font-weight="600" fill="#64748b">${esc(
            step.sub
          )}</text>
          ${linesSvg}
        </g>
        ${arrow}
      `;
    })
    .join("");

  return wrapSvg(
    1200,
    420,
    "Show Büfe 4 Adımlı Uçtan Uca Sipariş ve Mutfak İş Akışı",
    "",
    `
    <rect width="1200" height="420" rx="24" fill="#f8fafc" stroke="#e2e8f0" />
    <text x="600" y="42" text-anchor="middle" font-family="${FONT_SANS}" font-size="17" font-weight="800" fill="#0f172a">Uçtan Uca Operasyon Akışı: Tek Ekrandan Mutfak &amp; Teslimata Kesintisiz Senkronizasyon</text>
    ${cards}
    `
  );
}

function browserFrame(title, activeRoute, body) {
  return `
    <rect width="1100" height="660" rx="22" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" />
    <!-- Top Chrome -->
    <rect x="0" y="0" width="1100" height="48" rx="22" fill="#0f172a" />
    <rect x="0" y="26" width="1100" height="22" fill="#0f172a" />
    <circle cx="26" cy="24" r="6" fill="#ef4444" />
    <circle cx="46" cy="24" r="6" fill="#f59e0b" />
    <circle cx="66" cy="24" r="6" fill="#10b981" />
    <rect x="190" y="10" width="520" height="28" rx="14" fill="#1e293b" />
    <text x="450" y="28" text-anchor="middle" font-family="${FONT_MONO}" font-size="11.5" fill="#cbd5e1">https://showbufe.royal.local${esc(
      activeRoute
    )}</text>
    ${pill(940, 12, 136, 24, "#0284c7", "#ffffff", title)}

    <!-- App Header -->
    <rect x="0" y="48" width="1100" height="58" fill="#ffffff" stroke="#e2e8f0" />
    ${miniBrandBadge(24, 63)}
    <text x="60" y="77" font-family="${FONT_SANS}" font-size="14" font-weight="800" fill="#0f172a">Royal Show Büfe</text>
    <text x="60" y="93" font-family="${FONT_SANS}" font-size="10.5" font-weight="600" fill="#64748b">Adisyon &amp; Mutfak KDS</text>
    ${body}
  `;
}

function buildScreenAdisyon() {
  const products = [
    { no: "#10", name: "SADE OMLET", cat: "Omletler", varLabel: "Tekli Pişirme", active: false },
    { no: "#11", name: "KAŞARLI OMLET", cat: "Omletler", varLabel: "AZ • ORTA • İYİ • ÇOK İYİ", active: true },
    { no: "#18", name: "MENEMEN", cat: "Sahanda", varLabel: "Çoklu Tercih (4 seçenek)", active: false },
    { no: "#6", name: "PANKEK", cat: "Pankek & Krep", varLabel: "Orman Meyveli • Çikolatalı", active: false },
    { no: "#9", name: "DANA KAVURMA", cat: "Sıcak Spesiyal", varLabel: "Yağ & Pişme Seçimi", active: false },
    { no: "#40", name: "HAŞLANMIŞ YUMURTA", cat: "Sahanda", varLabel: "3 DK • 5 DK • 7 DK • 8 DK", active: false },
  ];

  const cards = products
    .map((p, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const x = 24 + col * 336;
      const y = 248 + row * 124;
      const bg = p.active ? "#f0f9ff" : "#ffffff";
      const bd = p.active ? "#0284c7" : "#e2e8f0";
      return `
        <rect x="${x}" y="${y}" width="320" height="110" rx="16" fill="${bg}" stroke="${bd}" stroke-width="${
          p.active ? "2" : "1.2"
        }" />
        ${pill(x + 14, y + 14, 44, 22, "#e0f2fe", "#0369a1", p.no)}
        <text x="${x + 68}" y="${y + 29}" font-family="${FONT_SANS}" font-size="13" font-weight="800" fill="#0f172a">${esc(
          p.name
        )}</text>
        <text x="${x + 16}" y="${y + 58}" font-family="${FONT_SANS}" font-size="11" font-weight="600" fill="#64748b">${esc(
          p.cat
        )} • ${esc(p.varLabel)}</text>
        <rect x="${x + 16}" y="${y + 70}" width="118" height="26" rx="8" fill="${
          p.active ? "#0284c7" : "#f1f5f9"
        }" />
        <text x="${x + 75}" y="${y + 87}" text-anchor="middle" font-family="${FONT_SANS}" font-size="11" font-weight="700" fill="${
          p.active ? "#ffffff" : "#0f172a"
        }">${p.active ? "Varyasyon Seçildi ✓" : "+ Varyasyon Seç"}</text>
      `;
    })
    .join("");

  return wrapSvg(
    1100,
    660,
    "Adisyon Al ve Varyasyon Seçim Ekranı Önizlemesi",
    "",
    browserFrame(
      "Sipariş Ekranı",
      "/",
      `
      ${pill(280, 65, 112, 26, "#0284c7", "#ffffff", "Adisyon Al")}
      ${pill(400, 65, 112, 26, "#f1f5f9", "#475569", "Bekleyenler")}
      ${pill(520, 65, 112, 26, "#f1f5f9", "#475569", "Mutfak KDS")}
      ${pill(904, 65, 172, 26, "#dcfce7", "#047857", "🖨 Yazıcı: XP-80C Bağlı")}

      <!-- Guest info bar -->
      <rect x="24" y="122" width="656" height="66" rx="16" fill="#ffffff" stroke="#e2e8f0" />
      <text x="42" y="143" font-family="${FONT_SANS}" font-size="10.5" font-weight="700" fill="#64748b">ODA NUMARASI</text>
      <rect x="42" y="150" width="150" height="28" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="54" y="169" font-family="${FONT_SANS}" font-size="13" font-weight="800" fill="#0f172a">412</text>

      <text x="210" y="143" font-family="${FONT_SANS}" font-size="10.5" font-weight="700" fill="#64748b">MİSAFİR ADI / MASA</text>
      <rect x="210" y="150" width="240" height="28" rx="8" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="222" y="169" font-family="${FONT_SANS}" font-size="13" font-weight="800" fill="#0f172a">Ahmet Yılmaz</text>

      ${pill(468, 145, 196, 30, "#e0f2fe", "#0369a1", "Oda veya İsim Zorunlu ✓")}

      <!-- Category Tabs -->
      ${pill(24, 204, 72, 30, "#0f172a", "#ffffff", "Tümü (40)")}
      ${pill(104, 204, 88, 30, "#0284c7", "#ffffff", "Omletler (8)")}
      ${pill(200, 204, 134, 30, "#ffffff", "#334155", "Sahanda & Yumurta", "#cbd5e1")}
      ${pill(342, 204, 108, 30, "#ffffff", "#334155", "Börek & Pişi", "#cbd5e1")}
      ${pill(458, 204, 108, 30, "#ffffff", "#334155", "Tost & Ekmek", "#cbd5e1")}
      ${pill(574, 204, 106, 30, "#ffffff", "#334155", "Pankek & Krep", "#cbd5e1")}

      ${cards}

      <!-- Floating Variation Selector Highlight -->
      <g filter="url(#cardShadow)">
        <rect x="366" y="198" width="320" height="224" rx="20" fill="#ffffff" stroke="#0284c7" stroke-width="2" />
        <text x="386" y="226" font-family="${FONT_SANS}" font-size="14" font-weight="800" fill="#0f172a">#11 KAŞARLI OMLET — Varyasyon</text>
        <text x="386" y="244" font-family="${FONT_SANS}" font-size="11" font-weight="600" fill="#64748b">Misafir pişirme tercihini seçin:</text>
        ${pill(386, 260, 64, 32, "#f1f5f9", "#334155", "AZ")}
        ${pill(458, 260, 74, 32, "#0284c7", "#ffffff", "ORTA ✓")}
        ${pill(540, 260, 60, 32, "#f1f5f9", "#334155", "İYİ")}
        ${pill(608, 260, 62, 32, "#f1f5f9", "#334155", "ÇOK İYİ")}

        <text x="386" y="314" font-family="${FONT_SANS}" font-size="11" font-weight="700" fill="#334155">Miktar: 2 Adet   •   Not: Az tuzlu olsun</text>
        <rect x="386" y="330" width="280" height="32" rx="10" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="400" y="350" font-family="${FONT_SANS}" font-size="11.5" fill="#475569">Mutfak notu ekle...</text>
        <rect x="386" y="374" width="280" height="34" rx="10" fill="#0284c7" />
        <text x="526" y="396" text-anchor="middle" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#ffffff">Adisyona Ekle (2×)</text>
      </g>

      <!-- Right Cart Panel -->
      <g filter="url(#softShadow)">
        <rect x="704" y="122" width="372" height="514" rx="20" fill="#ffffff" stroke="#e2e8f0" />
        <text x="724" y="154" font-family="${FONT_SANS}" font-size="15.5" font-weight="800" fill="#0f172a">Adisyon Özeti</text>
        ${pill(946, 134, 110, 26, "#e0f2fe", "#0369a1", "Oda 412 • 3 Adet")}

        <rect x="724" y="176" width="332" height="76" rx="14" fill="#f8fafc" stroke="#e2e8f0" />
        <text x="738" y="200" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#0f172a">2× KAŞARLI OMLET</text>
        ${pill(738, 212, 66, 22, "#dbeafe", "#1d4ed8", "ORTA")}
        <text x="814" y="227" font-family="${FONT_SANS}" font-size="11" fill="#64748b">Not: Az tuzlu</text>

        <rect x="724" y="264" width="332" height="76" rx="14" fill="#f8fafc" stroke="#e2e8f0" />
        <text x="738" y="288" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#0f172a">1× MENEMEN</text>
        ${pill(738, 300, 80, 22, "#fef3c7", "#b45309", "SUCUKLU")}
        ${pill(824, 300, 66, 22, "#fee2e2", "#b91c1c", "ACILI")}

        <rect x="724" y="362" width="332" height="62" rx="14" fill="#ecfdf5" stroke="#a7f3d0" />
        <text x="740" y="387" font-family="${FONT_SANS}" font-size="11.5" font-weight="800" fill="#065f46">Otomatik Yazdır: AÇIK (XP-80C)</text>
        <text x="740" y="407" font-family="${FONT_SANS}" font-size="10.5" fill="#047857">Kayıtlı yazıcı yoksa yazdırma seçeneği gizlenir</text>

        <rect x="724" y="446" width="332" height="54" rx="14" fill="url(#skyBrand)" />
        <text x="890" y="478" text-anchor="middle" font-family="${FONT_SANS}" font-size="14" font-weight="800" fill="#ffffff">🖨 Kaydet ve Fiş Yazdır</text>

        <rect x="724" y="512" width="332" height="48" rx="14" fill="#f1f5f9" stroke="#cbd5e1" />
        <text x="890" y="541" text-anchor="middle" font-family="${FONT_SANS}" font-size="13" font-weight="800" fill="#334155">Sadece Kuyruğa Kaydet</text>

        <text x="890" y="592" text-anchor="middle" font-family="${FONT_SANS}" font-size="11" font-weight="600" fill="#64748b">Kayıt sonrası sıra numarası verilir ve Mutfak KDS'ye düşer.</text>
      </g>
      `
    )
  );
}

function buildScreenMutfak() {
  const groups = [
    {
      no: "#11",
      name: "KAŞARLI OMLET",
      total: "6 ADET",
      vars: [
        { label: "ORTA", count: "×4", bg: "#dbeafe", fg: "#1e40af" },
        { label: "İYİ", count: "×2", bg: "#fef3c7", fg: "#92400e" },
      ],
      rooms: "Oda 412, Teras, Oda 208",
    },
    {
      no: "#18",
      name: "MENEMEN",
      total: "4 ADET",
      vars: [
        { label: "SUCUKLU + ACILI", count: "×2", bg: "#fee2e2", fg: "#991b1b" },
        { label: "SOĞANLI", count: "×2", bg: "#e0e7ff", fg: "#3730a3" },
      ],
      rooms: "Oda 412, Oda 305",
    },
    {
      no: "#6",
      name: "PANKEK",
      total: "5 ADET",
      vars: [
        { label: "ÇİKOLATALI", count: "×3", bg: "#f3e8ff", fg: "#6b21a8" },
        { label: "ORMAN MEYVELİ", count: "×2", bg: "#fce7f3", fg: "#9d174d" },
      ],
      rooms: "Masa Teras, Oda 118",
    },
  ];

  const groupCards = groups
    .map((g, i) => {
      const y = 172 + i * 156;
      const chips = g.vars
        .map((v, j) =>
          pill(42 + j * 150, y + 52, 140, 28, v.bg, v.fg, `${v.label} ${v.count}`)
        )
        .join("");

      return `
        <g filter="url(#softShadow)">
          <rect x="24" y="${y}" width="612" height="140" rx="18" fill="#ffffff" stroke="#e2e8f0" />
          ${pill(42, y + 16, 46, 24, "#0f172a", "#ffffff", g.no)}
          <text x="98" y="${y + 33}" font-family="${FONT_SANS}" font-size="14.5" font-weight="800" fill="#0f172a">${esc(
            g.name
          )}</text>
          ${pill(534, y + 16, 84, 24, "#0284c7", "#ffffff", g.total)}
          ${chips}
          <text x="42" y="${y + 110}" font-family="${FONT_SANS}" font-size="11" font-weight="600" fill="#64748b">Adisyonlar: ${esc(
            g.rooms
          )}</text>
          <rect x="372" y="${y + 92}" width="116" height="34" rx="10" fill="#f59e0b" />
          <text x="430" y="${y + 114}" text-anchor="middle" font-family="${FONT_SANS}" font-size="11.5" font-weight="800" fill="#ffffff">Tümünü Ocağa Al</text>
          <rect x="498" y="${y + 92}" width="120" height="34" rx="10" fill="#10b981" />
          <text x="558" y="${y + 114}" text-anchor="middle" font-family="${FONT_SANS}" font-size="11.5" font-weight="800" fill="#ffffff">Hazır İşaretle</text>
        </g>
      `;
    })
    .join("");

  return wrapSvg(
    1100,
    660,
    "Mutfak Ekranı (KDS) Benzer Ürün Gruplama ve Sıra Görünümü",
    "",
    browserFrame(
      "Mutfak KDS",
      "/mutfak",
      `
      ${pill(280, 65, 112, 26, "#f1f5f9", "#475569", "Adisyon Al")}
      ${pill(400, 65, 112, 26, "#f1f5f9", "#475569", "Bekleyenler")}
      ${pill(520, 65, 118, 26, "#0f172a", "#ffffff", "Mutfak KDS ✓")}
      ${pill(904, 65, 172, 26, "#dcfce7", "#047857", "● Canlı Yenileme: 2.5 sn")}

      <text x="24" y="142" font-family="${FONT_SANS}" font-size="16" font-weight="800" fill="#0f172a">Benzer Ürün Grupları (Toplu Hazırlama)</text>
      <text x="24" y="160" font-family="${FONT_SANS}" font-size="11.5" font-weight="600" fill="#64748b">Aşçılar aynı ürünü tek tavada/ocakta topluca görüp işaretler</text>

      ${groupCards}

      <!-- Right: Sequential Order Cards -->
      <text x="664" y="142" font-family="${FONT_SANS}" font-size="16" font-weight="800" fill="#0f172a">Geliş Sırasına Göre Adisyonlar</text>
      <text x="664" y="160" font-family="${FONT_SANS}" font-size="11.5" font-weight="600" fill="#64748b">Her adisyonun saat ve geçen süre bilgisi</text>

      <g filter="url(#softShadow)">
        <rect x="664" y="172" width="412" height="144" rx="18" fill="#ffffff" stroke="#fde68a" stroke-width="1.6" />
        <text x="682" y="198" font-family="${FONT_SANS}" font-size="14" font-weight="800" fill="#0284c7">Sıra #14 — Oda 412 (Ahmet Y.)</text>
        ${pill(972, 180, 86, 24, "#fef3c7", "#b45309", "OCAKTA")}
        <text x="682" y="220" font-family="${FONT_SANS}" font-size="11" font-weight="700" fill="#d97706">🕒 Saat: 09:14  •  Geçen Süre: 04 dk 18 sn</text>
        <text x="682" y="246" font-family="${FONT_SANS}" font-size="12" font-weight="700" fill="#0f172a">• 2× KAŞARLI OMLET (ORTA) — [OCAKTA]</text>
        <text x="682" y="268" font-family="${FONT_SANS}" font-size="12" font-weight="700" fill="#0f172a">• 1× MENEMEN (SUCUKLU, ACILI) — [BEKLİYOR]</text>
        <text x="682" y="294" font-family="${FONT_SANS}" font-size="10.5" font-weight="600" fill="#64748b">Tek kalem veya tüm adisyon durumu tek dokunuşla güncellenir</text>
      </g>

      <g filter="url(#softShadow)">
        <rect x="664" y="330" width="412" height="144" rx="18" fill="#ffffff" stroke="#a7f3d0" stroke-width="1.6" />
        <text x="682" y="356" font-family="${FONT_SANS}" font-size="14" font-weight="800" fill="#0284c7">Sıra #15 — Masa Teras (Selin K.)</text>
        ${pill(972, 338, 86, 24, "#dcfce7", "#047857", "HAZIR")}
        <text x="682" y="378" font-family="${FONT_SANS}" font-size="11" font-weight="700" fill="#059669">🕒 Saat: 09:16  •  Hazırlandı: 02 dk 05 sn</text>
        <text x="682" y="404" font-family="${FONT_SANS}" font-size="12" font-weight="700" fill="#0f172a">• 3× PANKEK (ÇİKOLATALI) — [HAZIR]</text>
        <text x="682" y="426" font-family="${FONT_SANS}" font-size="12" font-weight="700" fill="#0f172a">• 2× KAŞARLI OMLET (İYİ) — [HAZIR]</text>
        ${pill(682, 440, 174, 24, "#ecfdf5", "#047857", "Servis ekibine bildirim hazır ✓")}
      </g>

      <g filter="url(#softShadow)">
        <rect x="664" y="488" width="412" height="144" rx="18" fill="#ffffff" stroke="#e2e8f0" />
        <text x="682" y="514" font-family="${FONT_SANS}" font-size="14" font-weight="800" fill="#0284c7">Sıra #16 — Oda 208 (Mehmet D.)</text>
        ${pill(968, 496, 90, 24, "#e0f2fe", "#0369a1", "BEKLİYOR")}
        <text x="682" y="536" font-family="${FONT_SANS}" font-size="11" font-weight="700" fill="#64748b">🕒 Saat: 09:18  •  Geçen Süre: 00 dk 42 sn</text>
        <text x="682" y="562" font-family="${FONT_SANS}" font-size="12" font-weight="700" fill="#0f172a">• 2× ORMAN MEYVELİ PANKEK</text>
        <text x="682" y="584" font-family="${FONT_SANS}" font-size="12" font-weight="700" fill="#0f172a">• 2× KAŞARLI OMLET (ORTA)</text>
      </g>
      `
    )
  );
}

function buildScreenBekleyenler() {
  return wrapSvg(
    1100,
    660,
    "Bekleyenler ve Teslim Edilenler Kuyruk Takip Ekranı",
    "",
    browserFrame(
      "Sipariş Takibi",
      "/bekleyenler",
      `
      ${pill(280, 65, 112, 26, "#f1f5f9", "#475569", "Adisyon Al")}
      ${pill(400, 65, 132, 26, "#0284c7", "#ffffff", "Bekleyenler ✓")}
      ${pill(540, 65, 112, 26, "#f1f5f9", "#475569", "Mutfak KDS")}
      ${pill(904, 65, 172, 26, "#f8fafc", "#334155", "↺ 1 Adım Geri Al Koruması", "#cbd5e1")}

      <!-- Queue Filter Tabs -->
      ${pill(24, 126, 200, 36, "#0f172a", "#ffffff", "Bekleyen Kuyruk (6 Adisyon)")}
      ${pill(234, 126, 210, 36, "#ffffff", "#047857", "✓ Teslim Edilenler (42)", "#a7f3d0")}
      <rect x="744" y="126" width="332" height="36" rx="18" fill="#ffffff" stroke="#cbd5e1" />
      <text x="764" y="149" font-family="${FONT_SANS}" font-size="12" fill="#64748b">🔍 Oda no, misafir veya sıra no ara...</text>

      <!-- Card 1: Hazır + Geri Al Feature Highlight -->
      <g filter="url(#cardShadow)">
        <rect x="24" y="182" width="516" height="218" rx="20" fill="#ffffff" stroke="#10b981" stroke-width="2" />
        <text x="44" y="212" font-family="${FONT_SANS}" font-size="16" font-weight="800" fill="#0284c7">Sıra #14</text>
        <text x="122" y="212" font-family="${FONT_SANS}" font-size="15" font-weight="800" fill="#0f172a">Oda 412 • Ahmet Yılmaz</text>
        ${pill(444, 192, 78, 26, "#dcfce7", "#047857", "HAZIR")}

        <rect x="44" y="226" width="478" height="30" rx="10" fill="#f0fdf4" />
        <text x="56" y="245" font-family="${FONT_SANS}" font-size="11.5" font-weight="700" fill="#065f46">🕒 Oluşturma: 09:14   |   ⏱ Geçen Süre: 04 dk 18 sn</text>

        <text x="44" y="278" font-family="${FONT_SANS}" font-size="12.5" font-weight="700" fill="#0f172a">• 2× KAŞARLI OMLET (ORTA) — Hazır</text>
        <text x="44" y="300" font-family="${FONT_SANS}" font-size="12.5" font-weight="700" fill="#0f172a">• 1× MENEMEN (SUCUKLU, ACILI) — Hazır</text>

        <!-- Action Row -->
        <rect x="44" y="336" width="154" height="44" rx="12" fill="#10b981" />
        <text x="121" y="363" text-anchor="middle" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#ffffff">✓ Teslim Edildi</text>

        <rect x="208" y="336" width="174" height="44" rx="12" fill="#fffbeb" stroke="#f59e0b" stroke-width="1.8" />
        <text x="295" y="363" text-anchor="middle" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#b45309">↺ Önceki Duruma Al</text>

        <rect x="392" y="336" width="130" height="44" rx="12" fill="#f1f5f9" stroke="#cbd5e1" />
        <text x="457" y="363" text-anchor="middle" font-family="${FONT_SANS}" font-size="12" font-weight="700" fill="#334155">🖨 Yazdır</text>
      </g>

      <!-- Card 2: Ocakta -->
      <g filter="url(#softShadow)">
        <rect x="560" y="182" width="516" height="218" rx="20" fill="#ffffff" stroke="#e2e8f0" />
        <text x="580" y="212" font-family="${FONT_SANS}" font-size="16" font-weight="800" fill="#0284c7">Sıra #15</text>
        <text x="658" y="212" font-family="${FONT_SANS}" font-size="15" font-weight="800" fill="#0f172a">Masa Teras • Selin Kaya</text>
        ${pill(972, 192, 86, 26, "#fef3c7", "#b45309", "OCAKTA")}

        <rect x="580" y="226" width="478" height="30" rx="10" fill="#fffbeb" />
        <text x="592" y="245" font-family="${FONT_SANS}" font-size="11.5" font-weight="700" fill="#92400e">🕒 Oluşturma: 09:16   |   ⏱ Geçen Süre: 02 dk 05 sn</text>

        <text x="580" y="278" font-family="${FONT_SANS}" font-size="12.5" font-weight="700" fill="#0f172a">• 3× PANKEK (ÇİKOLATALI)</text>
        <text x="580" y="300" font-family="${FONT_SANS}" font-size="12.5" font-weight="700" fill="#0f172a">• 2× KAŞARLI OMLET (İYİ)</text>

        <rect x="580" y="336" width="166" height="44" rx="12" fill="#0284c7" />
        <text x="663" y="363" text-anchor="middle" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#ffffff">Hazır / Toplandı</text>
        <rect x="756" y="336" width="170" height="44" rx="12" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="841" y="363" text-anchor="middle" font-family="${FONT_SANS}" font-size="12" font-weight="700" fill="#475569">↺ Bekliyor&apos;a Al</text>
      </g>

      <!-- Bottom Section: Teslim Edilenler Paneli -->
      <g filter="url(#softShadow)">
        <rect x="24" y="422" width="1052" height="210" rx="20" fill="#ffffff" stroke="#e2e8f0" />
        <text x="46" y="454" font-family="${FONT_SANS}" font-size="15" font-weight="800" fill="#0f172a">Teslim Edilenler Listesi (Kuyruktan Çıkarılanlar)</text>
        <text x="46" y="474" font-family="${FONT_SANS}" font-size="11.5" fill="#64748b">Teslim edilen her adisyon saat, teslim zamanı, geçen süre ve geri alma desteğiyle saklanır</text>

        <rect x="46" y="492" width="1008" height="44" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
        <text x="64" y="519" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#0f172a">Sıra #12 • Oda 301 (Murat Bey)</text>
        <text x="330" y="519" font-family="${FONT_SANS}" font-size="12" fill="#475569">09:04 -> 09:08 (03 dk 52 sn)</text>
        ${pill(680, 502, 118, 24, "#dcfce7", "#047857", "TESLİM EDİLDİ")}
        ${pill(820, 502, 214, 24, "#fef3c7", "#92400e", "↺ Kuyruğa (Hazır) Geri Döndür")}

        <rect x="46" y="548" width="1008" height="44" rx="12" fill="#f8fafc" stroke="#e2e8f0" />
        <text x="64" y="575" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#0f172a">Sıra #13 • Oda 518 (Zeynep Hn.)</text>
        <text x="330" y="575" font-family="${FONT_SANS}" font-size="12" fill="#475569">09:07 -> 09:11 (04 dk 08 sn)</text>
        ${pill(680, 560, 118, 24, "#dcfce7", "#047857", "TESLİM EDİLDİ")}
        ${pill(820, 560, 214, 24, "#fef3c7", "#92400e", "↺ Kuyruğa (Hazır) Geri Döndür")}
      </g>
      `
    )
  );
}

function buildScreenAdminRapor() {
  const bars = [
    { name: "Kaşarlı Omlet", qty: 68, w: 330, color: "#0284c7" },
    { name: "Menemen", qty: 54, w: 262, color: "#0ea5e9" },
    { name: "Pankek", qty: 46, w: 224, color: "#f59e0b" },
    { name: "Sahanda Yumurta", qty: 38, w: 185, color: "#10b981" },
    { name: "Su Böreği", qty: 31, w: 152, color: "#6366f1" },
  ];

  const barsSvg = bars
    .map((b, i) => {
      const y = 398 + i * 42;
      return `
        <text x="48" y="${y + 18}" font-family="${FONT_SANS}" font-size="12" font-weight="700" fill="#334155">${esc(
          b.name
        )}</text>
        <rect x="190" y="${y + 2}" width="350" height="22" rx="11" fill="#f1f5f9" />
        <rect x="190" y="${y + 2}" width="${b.w}" height="22" rx="11" fill="${b.color}" />
        <text x="${198 + b.w}" y="${y + 17}" font-family="${FONT_SANS}" font-size="11.5" font-weight="800" fill="#0f172a">${b.qty} Adet</text>
      `;
    })
    .join("");

  return wrapSvg(
    1100,
    660,
    "Admin Paneli, Anlık Akış ve Akıllı Excel PDF Raporlama Ekranı",
    "",
    browserFrame(
      "Admin Paneli",
      "/admin",
      `
      ${pill(280, 65, 118, 26, "#0284c7", "#ffffff", "Anlık Akış")}
      ${pill(406, 65, 134, 26, "#e0f2fe", "#0369a1", "Mutfak Durumu")}
      ${pill(548, 65, 166, 26, "#0f172a", "#ffffff", "Akıllı Raporlar ✓")}
      ${pill(920, 65, 156, 26, "#f3e8ff", "#6b21a8", "Rol: Admin Yönetici")}

      <!-- Filter Bar -->
      <g filter="url(#softShadow)">
        <rect x="24" y="122" width="1052" height="82" rx="18" fill="#ffffff" stroke="#e2e8f0" />
        <rect x="42" y="138" width="196" height="48" rx="12" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="54" y="156" font-family="${FONT_SANS}" font-size="10" font-weight="700" fill="#64748b">TARİH / SAAT ARALIĞI</text>
        <text x="54" y="176" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0f172a">Bugün • 07:00 – 11:30</text>

        <rect x="250" y="138" width="184" height="48" rx="12" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="262" y="156" font-family="${FONT_SANS}" font-size="10" font-weight="700" fill="#64748b">RAPOR TİPİ</text>
        <text x="262" y="176" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0f172a">Ürün &amp; Adisyon Bazlı</text>

        <rect x="446" y="138" width="176" height="48" rx="12" fill="#f8fafc" stroke="#cbd5e1" />
        <text x="458" y="156" font-family="${FONT_SANS}" font-size="10" font-weight="700" fill="#64748b">KATEGORİ / ÜRÜN</text>
        <text x="458" y="176" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0f172a">Tüm Kategoriler (6)</text>

        <rect x="652" y="140" width="198" height="44" rx="12" fill="#10b981" />
        <text x="751" y="167" text-anchor="middle" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#ffffff">📊 Excel İndir (.xls/.csv)</text>

        <rect x="862" y="140" width="194" height="44" rx="12" fill="#4f46e5" />
        <text x="959" y="167" text-anchor="middle" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#ffffff">📄 PDF Rapor / Yazdır</text>
      </g>

      <!-- KPI Cards -->
      <rect x="24" y="220" width="250" height="106" rx="18" fill="#ffffff" stroke="#e2e8f0" />
      <text x="44" y="248" font-family="${FONT_SANS}" font-size="11.5" font-weight="700" fill="#64748b">TOPLAM ADİSYON</text>
      <text x="44" y="292" font-family="${FONT_SANS}" font-size="30" font-weight="800" fill="#0f172a">128</text>
      ${pill(144, 270, 110, 24, "#e0f2fe", "#0369a1", "6 Aktif / 122 Bitti")}

      <rect x="292" y="220" width="250" height="106" rx="18" fill="#ffffff" stroke="#e2e8f0" />
      <text x="312" y="248" font-family="${FONT_SANS}" font-size="11.5" font-weight="700" fill="#64748b">TOPLAM PORSİYON</text>
      <text x="312" y="292" font-family="${FONT_SANS}" font-size="30" font-weight="800" fill="#0284c7">342</text>
      ${pill(414, 270, 108, 24, "#fef3c7", "#92400e", "Ort. 2.67 ürün")}

      <rect x="560" y="220" width="250" height="106" rx="18" fill="#ffffff" stroke="#e2e8f0" />
      <text x="580" y="248" font-family="${FONT_SANS}" font-size="11.5" font-weight="700" fill="#64748b">ORT. HAZIRLAMA SÜRESİ</text>
      <text x="580" y="292" font-family="${FONT_SANS}" font-size="28" font-weight="800" fill="#d97706">03 dk 45 sn</text>

      <rect x="828" y="220" width="248" height="106" rx="18" fill="#ffffff" stroke="#e2e8f0" />
      <text x="848" y="248" font-family="${FONT_SANS}" font-size="11.5" font-weight="700" fill="#64748b">TESLİMAT ORANI</text>
      <text x="848" y="292" font-family="${FONT_SANS}" font-size="30" font-weight="800" fill="#059669">%96.8</text>

      <!-- Left Chart -->
      <g filter="url(#softShadow)">
        <rect x="24" y="344" width="584" height="292" rx="20" fill="#ffffff" stroke="#e2e8f0" />
        <text x="48" y="376" font-family="${FONT_SANS}" font-size="15" font-weight="800" fill="#0f172a">Ürün Bazlı Porsiyon Dağılımı</text>
        ${barsSvg}
      </g>

      <!-- Right Detail Table -->
      <g filter="url(#softShadow)">
        <rect x="624" y="344" width="452" height="292" rx="20" fill="#ffffff" stroke="#e2e8f0" />
        <text x="646" y="376" font-family="${FONT_SANS}" font-size="15" font-weight="800" fill="#0f172a">Varyasyon &amp; Adisyon Detayları</text>

        <rect x="646" y="394" width="408" height="34" rx="8" fill="#f1f5f9" />
        <text x="660" y="416" font-family="${FONT_SANS}" font-size="11" font-weight="800" fill="#475569">ÜRÜN / VARYASYON</text>
        <text x="900" y="416" font-family="${FONT_SANS}" font-size="11" font-weight="800" fill="#475569">ADET</text>
        <text x="980" y="416" font-family="${FONT_SANS}" font-size="11" font-weight="800" fill="#475569">DURUM</text>

        <text x="660" y="454" font-family="${FONT_SANS}" font-size="12" font-weight="700" fill="#0f172a">Kaşarlı Omlet (Orta)</text>
        <text x="905" y="454" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0284c7">42</text>
        ${pill(968, 438, 72, 22, "#dcfce7", "#047857", "Teslim")}
        <line x1="646" y1="472" x2="1054" y2="472" stroke="#f1f5f9" />

        <text x="660" y="498" font-family="${FONT_SANS}" font-size="12" font-weight="700" fill="#0f172a">Menemen (Sucuklu, Soğanlı)</text>
        <text x="905" y="498" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0284c7">31</text>
        ${pill(968, 482, 72, 22, "#dcfce7", "#047857", "Teslim")}
        <line x1="646" y1="516" x2="1054" y2="516" stroke="#f1f5f9" />

        <text x="660" y="542" font-family="${FONT_SANS}" font-size="12" font-weight="700" fill="#0f172a">Pankek (Çikolatalı)</text>
        <text x="905" y="542" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0284c7">29</text>
        ${pill(968, 526, 72, 22, "#fef3c7", "#92400e", "Aktif")}
        <line x1="646" y1="560" x2="1054" y2="560" stroke="#f1f5f9" />

        <text x="660" y="588" font-family="${FONT_SANS}" font-size="12" font-weight="700" fill="#0f172a">Haşlanmış Yumurta (5 DK.)</text>
        <text x="905" y="588" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0284c7">24</text>
        ${pill(968, 572, 72, 22, "#dcfce7", "#047857", "Teslim")}
      </g>
      `
    )
  );
}

function buildPwaChromeReceipt() {
  return wrapSvg(
    1100,
    540,
    "Mobil PWA Chrome Kurulumu ve Akıllı 80mm Termal Fiş Yapısı",
    "",
    `
    <rect width="1100" height="540" rx="26" fill="url(#meshBg)" stroke="#e2e8f0" />

    <!-- LEFT: PWA & CHROME PANEL -->
    <g filter="url(#cardShadow)">
      <rect x="34" y="34" width="504" height="472" rx="22" fill="#ffffff" stroke="#bae6fd" stroke-width="1.5" />
      <text x="62" y="72" font-family="${FONT_SANS}" font-size="17" font-weight="800" fill="#0f172a">PWA &amp; Google Chrome Deneyimi</text>
      <text x="62" y="94" font-family="${FONT_SANS}" font-size="12" font-weight="600" fill="#64748b">Kurulu değilse otomatik kurulum bildirimi ve Chrome yönlendirmesi</text>

      <!-- Notification Mockup -->
      <rect x="62" y="116" width="448" height="104" rx="16" fill="#f0f9ff" stroke="#38bdf8" stroke-width="1.5" />
      ${miniBrandBadge(80, 134)}
      <text x="118" y="147" font-family="${FONT_SANS}" font-size="13" font-weight="800" fill="#0f172a">Uygulama cihazınızda kurulu değil</text>
      <text x="118" y="165" font-family="${FONT_SANS}" font-size="11" font-weight="600" fill="#475569">Kiosk tam ekran için Chrome ile ana ekrana ekleyin</text>
      <rect x="80" y="182" width="164" height="26" rx="8" fill="#0284c7" />
      <text x="162" y="199" text-anchor="middle" font-family="${FONT_SANS}" font-size="11" font-weight="800" fill="#ffffff">⬇ Uygulamayı Kur (PWA)</text>
      <rect x="254" y="182" width="136" height="26" rx="8" fill="#f59e0b" />
      <text x="322" y="199" text-anchor="middle" font-family="${FONT_SANS}" font-size="11" font-weight="800" fill="#ffffff">🌐 Chrome&apos;da Aç</text>

      <!-- Features Grid inside PWA card -->
      <rect x="62" y="240" width="216" height="114" rx="14" fill="#f8fafc" stroke="#e2e8f0" />
      <text x="80" y="266" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#0f172a">Android &amp; iOS Deep-Link</text>
      <text x="80" y="288" font-family="${FONT_SANS}" font-size="11" fill="#475569">• Android intent:// com.android.chrome</text>
      <text x="80" y="308" font-family="${FONT_SANS}" font-size="11" fill="#475569">• iOS googlechromes:// yönlendirme</text>
      <text x="80" y="328" font-family="${FONT_SANS}" font-size="11" fill="#475569">• WhatsApp / WebView uyarısı</text>

      <rect x="294" y="240" width="216" height="114" rx="14" fill="#f8fafc" stroke="#e2e8f0" />
      <text x="312" y="266" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#0f172a">Çevrimdışı &amp; İkon Seti</text>
      <text x="312" y="288" font-family="${FONT_SANS}" font-size="11" fill="#475569">• /manifest.webmanifest + /sw.js</text>
      <text x="312" y="308" font-family="${FONT_SANS}" font-size="11" fill="#475569">• 192px &amp; 512px Maskable PNG</text>
      <text x="312" y="328" font-family="${FONT_SANS}" font-size="11" fill="#475569">• /offline.html kesinti koruması</text>

      <!-- App Icon Showcase -->
      <rect x="62" y="372" width="448" height="106" rx="16" fill="#0f172a" />
      <rect x="84" y="392" width="66" height="66" rx="18" fill="url(#skyBrand)" />
      <path d="M98 434 C98 416 136 416 136 434 Z" fill="#ffffff" />
      <circle cx="117" cy="409" r="5" fill="#fbbf24" />
      <rect x="95" y="438" width="44" height="6" rx="3" fill="#e0f2fe" />
      <text x="172" y="416" font-family="${FONT_SANS}" font-size="14" font-weight="800" fill="#ffffff">Show Büfe — Standalone Kiosk Modu</text>
      <text x="172" y="438" font-family="${FONT_SANS}" font-size="11.5" font-weight="600" fill="#94a3b8">Adres çubuğu olmadan tablet ve mobilde tam ekran uygulama</text>
    </g>

    <!-- RIGHT: 80MM THERMAL RECEIPT & PRINTER RULE -->
    <g filter="url(#cardShadow)">
      <rect x="562" y="34" width="504" height="472" rx="22" fill="#ffffff" stroke="#fde68a" stroke-width="1.5" />
      <text x="590" y="72" font-family="${FONT_SANS}" font-size="17" font-weight="800" fill="#0f172a">Akıllı Yazıcı &amp; 80mm Termal Fiş</text>
      <text x="590" y="94" font-family="${FONT_SANS}" font-size="12" font-weight="600" fill="#64748b">Kayıtlı yazıcı yoksa gizlenir, varsa otomatik fiş çıkarır</text>

      <!-- Receipt Paper -->
      <rect x="592" y="116" width="244" height="364" rx="12" fill="#f8fafc" stroke="#cbd5e1" stroke-dasharray="4 3" />
      <text x="714" y="148" text-anchor="middle" font-family="${FONT_MONO}" font-size="12.5" font-weight="700" fill="#0f172a">ROYAL ANA RESTAURANT</text>
      <text x="714" y="166" text-anchor="middle" font-family="${FONT_MONO}" font-size="11" font-weight="700" fill="#0284c7">SHOW BÜFE ADİSYON</text>
      <line x1="612" y1="180" x2="816" y2="180" stroke="#cbd5e1" stroke-dasharray="4 2" />
      <text x="714" y="206" text-anchor="middle" font-family="${FONT_MONO}" font-size="18" font-weight="700" fill="#0f172a">SIRA #14</text>
      <text x="614" y="232" font-family="${FONT_MONO}" font-size="11" fill="#334155">ODA   : 412</text>
      <text x="614" y="250" font-family="${FONT_MONO}" font-size="11" fill="#334155">MİSAFİR: Ahmet Yılmaz</text>
      <text x="614" y="268" font-family="${FONT_MONO}" font-size="11" fill="#334155">SAAT  : 15.11.2026 09:14</text>
      <line x1="612" y1="282" x2="816" y2="282" stroke="#cbd5e1" stroke-dasharray="4 2" />
      <text x="614" y="306" font-family="${FONT_MONO}" font-size="11.5" font-weight="700" fill="#0f172a">2x KAŞARLI OMLET</text>
      <text x="626" y="324" font-family="${FONT_MONO}" font-size="10.5" fill="#475569">[ORTA] Not: Az tuzlu</text>
      <text x="614" y="352" font-family="${FONT_MONO}" font-size="11.5" font-weight="700" fill="#0f172a">1x MENEMEN</text>
      <text x="626" y="370" font-family="${FONT_MONO}" font-size="10.5" fill="#475569">[SUCUKLU, ACILI]</text>
      <line x1="612" y1="392" x2="816" y2="392" stroke="#cbd5e1" stroke-dasharray="4 2" />
      <text x="714" y="422" text-anchor="middle" font-family="${FONT_MONO}" font-size="11" font-weight="700" fill="#334155">Afiyet Olsun!</text>
      <text x="714" y="446" text-anchor="middle" font-family="${FONT_MONO}" font-size="9.5" fill="#64748b">* 80mm / A5 Yazdırma Uyumlu *</text>

      <!-- Printer Policy Cards -->
      <rect x="854" y="116" width="190" height="170" rx="16" fill="#ecfdf5" stroke="#a7f3d0" />
      <text x="870" y="144" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#065f46">✓ Yazıcı Tanımlıysa</text>
      <text x="870" y="170" font-family="${FONT_SANS}" font-size="11" fill="#047857">• Otomatik yazdır açık</text>
      <text x="870" y="192" font-family="${FONT_SANS}" font-size="11" fill="#047857">• Kayıtta fiş tetiklenir</text>
      <text x="870" y="214" font-family="${FONT_SANS}" font-size="11" fill="#047857">• 5 dk önbellekli tarama</text>
      <text x="870" y="236" font-family="${FONT_SANS}" font-size="11" fill="#047857">• Bekleyenlerde tekrar basım</text>

      <rect x="854" y="306" width="190" height="174" rx="16" fill="#fffbeb" stroke="#fde68a" />
      <text x="870" y="334" font-family="${FONT_SANS}" font-size="12.5" font-weight="800" fill="#92400e">∅ Yazıcı Yoksa</text>
      <text x="870" y="360" font-family="${FONT_SANS}" font-size="11" fill="#b45309">• Yazdır butonları gizlenir</text>
      <text x="870" y="382" font-family="${FONT_SANS}" font-size="11" fill="#b45309">• Gereksiz print penceresi</text>
      <text x="870" y="400" font-family="${FONT_SANS}" font-size="11" fill="#b45309">  açılmaz</text>
      <text x="870" y="424" font-family="${FONT_SANS}" font-size="11" fill="#b45309">• Tek tıkla doğrudan kayıt</text>
    </g>
    `
  );
}

function buildArchitectureCoolify() {
  return wrapSvg(
    1100,
    500,
    "Coolify Tek Proje Docker Compose ve Otomatik PostgreSQL Başlatma Mimarisi",
    "",
    `
    <rect width="1100" height="500" rx="26" fill="#f8fafc" stroke="#e2e8f0" />
    <text x="550" y="42" text-anchor="middle" font-family="${FONT_SANS}" font-size="17" font-weight="800" fill="#0f172a">Coolify Tek-Proje Mimarisi (Next.js Standalone + PostgreSQL 16 + Otomatik Kurulum)</text>

    <!-- Left Tier: Clients -->
    <g filter="url(#softShadow)">
      <rect x="34" y="84" width="220" height="360" rx="20" fill="#ffffff" stroke="#e2e8f0" />
      <text x="144" y="116" text-anchor="middle" font-family="${FONT_SANS}" font-size="13.5" font-weight="800" fill="#0f172a">Çoklu Ekran İstemcileri</text>
      ${pill(54, 138, 180, 44, "#f0f9ff", "#0369a1", "📱 Sipariş Tableti (/)", "#bae6fd")}
      ${pill(54, 198, 180, 44, "#fffbeb", "#b45309", "🍳 Mutfak KDS (/mutfak)", "#fde68a")}
      ${pill(54, 258, 180, 44, "#ecfdf5", "#047857", "⏱ Bekleyenler (/bekleyenler)", "#a7f3d0")}
      ${pill(54, 318, 180, 44, "#f5f3ff", "#6b21a8", "📊 Admin Rapor (/admin)", "#ddd6fe")}
      ${pill(54, 378, 180, 40, "#0f172a", "#ffffff", "Chrome PWA • Offline SW")}
    </g>

    <!-- Arrow Clients -> Coolify Proxy -->
    <path d="M 262 264 L 318 264" fill="none" stroke="#0284c7" stroke-width="3" />
    <polygon points="318,258 330,264 318,270" fill="#0284c7" />
    <text x="294" y="250" text-anchor="middle" font-family="${FONT_SANS}" font-size="10" font-weight="800" fill="#0284c7">HTTPS</text>

    <!-- Coolify Docker Compose Container Box -->
    <rect x="336" y="72" width="730" height="390" rx="24" fill="#f0f9ff" stroke="#0284c7" stroke-width="2" stroke-dasharray="7 5" />
    ${pill(358, 86, 304, 28, "#0284c7", "#ffffff", "docker-compose.yml • Tek Coolify Projesi")}

    <!-- App Service -->
    <g filter="url(#cardShadow)">
      <rect x="364" y="132" width="320" height="298" rx="18" fill="#ffffff" stroke="#bae6fd" stroke-width="1.5" />
      <text x="386" y="164" font-family="${FONT_SANS}" font-size="15" font-weight="800" fill="#0f172a">app (Next.js 16 Standalone)</text>
      <text x="386" y="184" font-family="${FONT_MONO}" font-size="11" font-weight="700" fill="#0284c7">node:22-alpine • Port 3000</text>

      <rect x="386" y="202" width="276" height="66" rx="12" fill="#f8fafc" stroke="#cbd5e1" />
      <text x="400" y="224" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#0f172a">1. scripts/init-db.mjs (Açılışta)</text>
      <text x="400" y="244" font-family="${FONT_SANS}" font-size="10.5" fill="#475569">PG bekler, DB yoksa oluşturur, 40 ürün &amp;</text>
      <text x="400" y="259" font-family="${FONT_SANS}" font-size="10.5" fill="#475569">admin / siparis / mutfak rollerini tohumlar</text>

      <rect x="386" y="280" width="276" height="64" rx="12" fill="#ecfdf5" stroke="#a7f3d0" />
      <text x="400" y="302" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#065f46">2. API &amp; Performans Katmanı</text>
      <text x="400" y="322" font-family="${FONT_SANS}" font-size="10.5" fill="#047857">• Connection Pool (max 10) + /api/health</text>
      <text x="400" y="336" font-family="${FONT_SANS}" font-size="10.5" fill="#047857">• 5 dk yazıcı cache + visibility polling</text>

      ${pill(386, 360, 276, 44, "#0f172a", "#e0f2fe", "HTTP 200 • GET /api/health Doğrulandı")}
    </g>

    <!-- Arrow App <-> DB -->
    <path d="M 692 278 L 748 278" fill="none" stroke="#0f172a" stroke-width="3" />
    <polygon points="748,272 760,278 748,284" fill="#0f172a" />
    <text x="724" y="264" text-anchor="middle" font-family="${FONT_MONO}" font-size="10" font-weight="700" fill="#334155">5432</text>

    <!-- DB Service -->
    <g filter="url(#cardShadow)">
      <rect x="766" y="132" width="276" height="298" rx="18" fill="#ffffff" stroke="#a7f3d0" stroke-width="1.5" />
      <text x="788" y="164" font-family="${FONT_SANS}" font-size="15" font-weight="800" fill="#0f172a">db (PostgreSQL 16 Alpine)</text>
      <text x="788" y="184" font-family="${FONT_MONO}" font-size="11" font-weight="700" fill="#059669">Veritabanı: show_bufe</text>

      <rect x="788" y="202" width="232" height="102" rx="12" fill="#f0fdf4" stroke="#a7f3d0" />
      <text x="802" y="224" font-family="${FONT_SANS}" font-size="12" font-weight="800" fill="#065f46">5 İlişkisel Tablo</text>
      <text x="802" y="244" font-family="${FONT_MONO}" font-size="10.5" fill="#047857">• menu_items (40 Ürün)</text>
      <text x="802" y="260" font-family="${FONT_MONO}" font-size="10.5" fill="#047857">• adisyons &amp; adisyon_items</text>
      <text x="802" y="276" font-family="${FONT_MONO}" font-size="10.5" fill="#047857">• users (3 Rol)</text>
      <text x="802" y="292" font-family="${FONT_MONO}" font-size="10.5" fill="#047857">• printer_settings</text>

      <rect x="788" y="318" width="232" height="54" rx="12" fill="#fffbeb" stroke="#fde68a" />
      <text x="802" y="340" font-family="${FONT_SANS}" font-size="11.5" font-weight="800" fill="#92400e">Kalıcı Disk (postgres_data)</text>
      <text x="802" y="357" font-family="${FONT_SANS}" font-size="10" fill="#b45309">Deploy sonrası veri kaybı olmaz</text>

      ${pill(788, 384, 232, 28, "#dcfce7", "#047857", "pg_isready Healthcheck ✓")}
    </g>
    `
  );
}

function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const assets = [
    ["hero-ecosystem.svg", buildHeroEcosystem()],
    ["workflow-diagram.svg", buildWorkflowDiagram()],
    ["screen-adisyon.svg", buildScreenAdisyon()],
    ["screen-mutfak.svg", buildScreenMutfak()],
    ["screen-bekleyenler.svg", buildScreenBekleyenler()],
    ["screen-admin-rapor.svg", buildScreenAdminRapor()],
    ["pwa-chrome-receipt.svg", buildPwaChromeReceipt()],
    ["architecture-coolify.svg", buildArchitectureCoolify()],
  ];

  for (const [filename, content] of assets) {
    const outPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(outPath, content, "utf8");
    const sizeKb = (Buffer.byteLength(content, "utf8") / 1024).toFixed(1);
    console.log(`Generated ${filename} (${sizeKb} KB)`);
  }
}

main();
