# Show Büfe — Adisyon, Sipariş Kuyruğu ve Mutfak (KDS) Uygulaması

**Next.js (App Router, TypeScript, Tailwind CSS)** ve **PostgreSQL** ile geliştirilmiş; mobil, tablet ve masaüstü uyumlu, açık renkli, çoklu ekranlı (multi-screen) Show Büfe adisyon ve mutfak takip sistemi.

## Ekranlar (Multi-Screen)

- **`/login` — Rol Tabanlı Giriş**: Varsayılan kullanıcılar (`admin`, `siparis`, `mutfak` — şifre: `123456`).
- **`/` — Adisyon Al (Sipariş Oluştur)**: Oda numarası ve/veya misafir adı ile adisyon başlatma, 40 ürünlük Show Büfe menüsünden varyasyon seçimi (`<dialog>`), kaydetme veya tanımlı yazıcı varsa otomatik/manuel fiş yazdırma.
- **`/bekleyenler` — Bekleyenler & Teslim Edilenler**: Kuyruktaki adisyonları sıra numarası, saat ve geçen süreyle takip etme; yanlışlıkla ileri alınan kalem veya adisyonları bir önceki duruma geri alma; teslim edilenleri görüntüleme.
- **`/mutfak` — Mutfak Ekranı (KDS)**: Benzer ürün + varyasyon gruplaması (`KAŞARLI OMLET — ORTA x3`) ve sıraya göre adisyon içerikleriyle canlı mutfak yönetimi.
- **`/coklu-ekran` — Çoklu Ekran / Tezgah Modu**: Tablet ve geniş ekranlar için özet çoklu panel görünümü.
- **`/admin` — Yönetim & Akıllı Raporlama Paneli**: Anlık Akış, Mutfak Durumu ve ürün/adisyon/tarih aralığı bazlı Excel (CSV/XLS) & PDF çıktı destekli akıllı raporlama modülü.
- **`/tanitim.html` — Mobil Uyumlu Tanıtım Sunumu**: Görsellerle desteklenmiş, Slayt Modu, interaktif ekran sekmeleri ve 40 ürünlük menü gezgini içeren kurumsal HTML tanıtım sunumu (`public/sunum/*.svg`).

## PWA ve Google Chrome Desteği

- Uygulama tam **PWA** (`manifest.webmanifest`, `/sw.js`, `/offline.html`, `192x192` / `512x512` maskable ve standart ikonlar, Apple Touch Icon) desteğine sahiptir.
- Uygulama henüz PWA olarak kurulmadıysa alt/üst bölümde kurulum bildirimi gösterilir; Android/iOS uygulama içi tarayıcılardan veya farklı tarayıcılardan açıldığında **Google Chrome'da Aç** ve adım adım yükleme rehberi sunulur.

## Coolify ile Tek Proje Deploy (Uygulama + PostgreSQL)

Bu depo hem Next.js standalone uygulamasını hem de PostgreSQL 16 veritabanını **tek bir Docker Compose projesi** içinde ayağa kaldırır (`docker-compose.yml` + `Dockerfile`).

1. Coolify'da **New Resource -> Docker Compose** seçin ve Git deposunu (`https://github.com/Optimus825482/showw.git`, branch `main`) bağlayın.
2. Coolify **Domain** ayarını `app` servisine yönlendirin (uygulama içeride `3000` portunu dinler, `/api/health` sağlık kontrolü tanımlıdır).
3. Coolify Environment Variables bölümünde isteğe bağlı (önerilen) güvenlik değişkenlerini tanımlayın:
   - `POSTGRES_USER` (varsayılan: `postgres`)
   - `POSTGRES_PASSWORD` (üretim için güçlü bir şifre belirleyin)
   - `POSTGRES_DB` (varsayılan: `show_bufe`)
   - `AUTH_SECRET` (üretim için rastgele uzun bir gizli anahtar girin)
   - `DEFAULT_USER_PASSWORD` (varsayılan: `123456`)
4. **İlk Kurulumda Otomatik Veritabanı Başlatma**:
   - `db` servisi ilk açılışta `db/schema.sql` ile tüm tabloları ve 40 menü ürününü yükler.
   - `app` servisi başlatılmadan önce `scripts/init-db.mjs` çalışarak PostgreSQL'in hazır olmasını bekler, hedef veritabanı yoksa otomatik oluşturur, şemayı/ürünleri doğrular ve varsayılan kullanıcıları (`admin`, `siparis`, `mutfak`) oluşturur.

## Local PostgreSQL Kurulumu (`.env`)

Proje kökündeki `.env.example` dosyasını `.env` olarak kopyalayıp yerel PostgreSQL bilgilerinizi girin:

```env
DATABASE_URL="postgresql://KULLANICI:SIFRE@localhost:5432/show_bufe"
PGHOST="localhost"
PGPORT="5432"
PGUSER="postgres"
PGPASSWORD="SIFRENIZ"
PGDATABASE="show_bufe"
AUTH_SECRET="show-bufe-local-auth-secret-2026"
```

- Uygulama ilk açılışta `show_bufe` veritabanı yoksa otomatik oluşturur, `db/schema.sql` içindeki tüm tabloları ve 40 menü ürününü yükler, `admin`/`siparis`/`mutfak` kullanıcılarını oluşturur.

## Çalıştırma

```bash
npm install
npm run dev
```

İsteğe bağlı olarak üretim modunda veya Docker Compose ile yerel test için:

```bash
npm run build
docker compose up -d --build
```
