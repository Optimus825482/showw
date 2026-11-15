-- Show Büfe Adisyon & Mutfak KDS PostgreSQL Şeması

CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY,
  product_no INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  variations JSONB NOT NULL DEFAULT '[]'::jsonb,
  selection_mode TEXT NOT NULL DEFAULT 'none',
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS adisyons (
  id SERIAL PRIMARY KEY,
  queue_number INTEGER NOT NULL,
  room_number TEXT NOT NULL DEFAULT '',
  table_number TEXT NOT NULL DEFAULT '',
  guest_name TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'BEKLIYOR',
  printed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE adisyons ADD COLUMN IF NOT EXISTS table_number TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_adisyons_status_queue
  ON adisyons (status, queue_number ASC);

CREATE INDEX IF NOT EXISTS idx_adisyons_created_at
  ON adisyons (created_at DESC);

CREATE TABLE IF NOT EXISTS adisyon_items (
  id SERIAL PRIMARY KEY,
  adisyon_id INTEGER NOT NULL REFERENCES adisyons(id) ON DELETE CASCADE,
  menu_item_id INTEGER NOT NULL,
  product_no INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  variations JSONB NOT NULL DEFAULT '[]'::jsonb,
  quantity INTEGER NOT NULL DEFAULT 1,
  item_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'BEKLIYOR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_adisyon_items_adisyon_id
  ON adisyon_items (adisyon_id);

CREATE INDEX IF NOT EXISTS idx_adisyon_items_status
  ON adisyon_items (status);

CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS printer_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  printer_name TEXT NOT NULL DEFAULT '',
  auto_print BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO printer_settings (id, enabled, printer_name, auto_print)
VALUES (1, FALSE, '', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Show Büfe varsayılan 40 menü ürünü (otomatik ilk kurulum tohumu)
INSERT INTO menu_items (id, product_no, name, category, variations, selection_mode, is_active)
VALUES
  (1, 1, 'FRANSIZ TOST', 'Tost & Ekmek', '[]'::jsonb, 'none', TRUE),
  (2, 2, 'KIYMALI KOL BÖREĞİ', 'Börek & Pişi', '[]'::jsonb, 'none', TRUE),
  (3, 3, 'PATATESLİ KOL BÖREĞİ', 'Börek & Pişi', '[]'::jsonb, 'none', TRUE),
  (4, 4, 'PEYNİRLİ KOL BÖREĞİ', 'Börek & Pişi', '[]'::jsonb, 'none', TRUE),
  (5, 5, 'SU BÖREĞİ', 'Börek & Pişi', '[]'::jsonb, 'none', TRUE),
  (6, 6, 'PANKEK', 'Pankek & Krep', '["ORMAN MEYVELİ","SADE","MAPLE ŞURUP","ÇİKOLATALI"]'::jsonb, 'multi', TRUE),
  (7, 7, 'KREP', 'Pankek & Krep', '["ORMAN MEYVELİ","SADE","ÇİKOLATALI","MUZ VE ÇİKOLATALI"]'::jsonb, 'multi', TRUE),
  (8, 8, 'KUYMAK', 'Sıcak Spesiyal', '[]'::jsonb, 'none', TRUE),
  (9, 9, 'DANA KAVURMA', 'Sıcak Spesiyal', '["BOL YAĞLI","AZ YAĞLI","AZ PİŞMİŞ","İYİ PİŞMİŞ"]'::jsonb, 'multi', TRUE),
  (10, 10, 'SADE OMLET', 'Omletler', '["AZ","ORTA","İYİ","ÇOK İYİ"]'::jsonb, 'single', TRUE),
  (11, 11, 'KAŞARLI OMLET', 'Omletler', '["AZ","ORTA","İYİ","ÇOK İYİ"]'::jsonb, 'single', TRUE),
  (12, 12, 'SUCUKLU OMLET', 'Omletler', '["AZ","ORTA","İYİ","ÇOK İYİ"]'::jsonb, 'single', TRUE),
  (13, 13, 'KARIŞIK SEBZELİ OMLET', 'Omletler', '["AZ","ORTA","İYİ","ÇOK İYİ"]'::jsonb, 'single', TRUE),
  (14, 14, 'PASTIRMALI OMLET', 'Omletler', '["AZ","ORTA","İYİ","ÇOK İYİ"]'::jsonb, 'single', TRUE),
  (15, 15, 'OTLU OMLET', 'Omletler', '["AZ","ORTA","İYİ","ÇOK İYİ"]'::jsonb, 'single', TRUE),
  (16, 16, 'MANTARLI OMLET', 'Omletler', '["AZ","ORTA","İYİ","ÇOK İYİ"]'::jsonb, 'single', TRUE),
  (17, 17, 'BEYAZ PEYNİRLİ OMLET', 'Omletler', '["AZ","ORTA","İYİ","ÇOK İYİ"]'::jsonb, 'single', TRUE),
  (18, 18, 'MENEMEN', 'Sahanda & Yumurta', '["SUCUKLU","SOĞANLI","ACILI","YUMURTASI BOL"]'::jsonb, 'multi', TRUE),
  (19, 19, 'SAHANDA YUMURTA', 'Sahanda & Yumurta', '["AZ","ORTA","İYİ","ÇOK İYİ"]'::jsonb, 'single', TRUE),
  (20, 20, 'KAŞARLI SAHANDA YUMURTA', 'Sahanda & Yumurta', '["AZ","ORTA","İYİ","ÇOK İYİ"]'::jsonb, 'single', TRUE),
  (21, 21, 'PASTIRMALI SAHANDA YUMURTA', 'Sahanda & Yumurta', '["AZ","ORTA","İYİ","ÇOK İYİ"]'::jsonb, 'single', TRUE),
  (22, 22, 'SUCUKLU SAHANDA YUMURTA', 'Sahanda & Yumurta', '["AZ","ORTA","İYİ","ÇOK İYİ"]'::jsonb, 'single', TRUE),
  (23, 23, 'KAVURMALI SAHANDA YUMURTA', 'Sahanda & Yumurta', '["AZ","ORTA","İYİ","ÇOK İYİ"]'::jsonb, 'single', TRUE),
  (24, 24, 'SEBZELİ SAHANDA YUMURTA', 'Sahanda & Yumurta', '["AZ","ORTA","İYİ","ÇOK İYİ"]'::jsonb, 'single', TRUE),
  (25, 25, 'SÜTLÜ YUMURTA', 'Sahanda & Yumurta', '[]'::jsonb, 'none', TRUE),
  (26, 26, 'SOMONLU PİŞİ', 'Börek & Pişi', '["DANA FÜMELİ","PEYNİRLİ"]'::jsonb, 'multi', TRUE),
  (27, 27, 'HOT DOG', 'Sıcak Spesiyal', '[]'::jsonb, 'none', TRUE),
  (28, 28, 'HELLİM PANE', 'Sıcak Spesiyal', '["1 ADET","2 ADET","3 ADET","4 ADET"]'::jsonb, 'single', TRUE),
  (29, 29, 'EGG BENEDICT', 'Sahanda & Yumurta', '["DANA FÜMELİ","YUMURTASIZ","AVOKADOSUZ"]'::jsonb, 'multi', TRUE),
  (30, 30, 'PAÇANGA BÖREĞİ', 'Börek & Pişi', '["1 ADET","2 ADET","3 ADET","4 ADET"]'::jsonb, 'single', TRUE),
  (31, 31, 'CORN DOG', 'Sıcak Spesiyal', '["1 ADET","2 ADET","3 ADET","4 ADET"]'::jsonb, 'single', TRUE),
  (32, 32, 'PATATESLİ KABURGALI POŞE YUMURTA', 'Sahanda & Yumurta', '["YUMURTASIZ"]'::jsonb, 'multi', TRUE),
  (33, 33, 'KREP MONSIEUR', 'Pankek & Krep', '[]'::jsonb, 'none', TRUE),
  (34, 34, 'YUMURTALI SİMİT', 'Tost & Ekmek', '[]'::jsonb, 'none', TRUE),
  (35, 35, 'KARIŞIK TOST', 'Tost & Ekmek', '[]'::jsonb, 'none', TRUE),
  (36, 36, 'KAŞARLI TOST', 'Tost & Ekmek', '[]'::jsonb, 'none', TRUE),
  (37, 37, 'AVOKADOLU TOST', 'Tost & Ekmek', '[]'::jsonb, 'none', TRUE),
  (38, 38, 'SANAYİ TOST', 'Tost & Ekmek', '[]'::jsonb, 'none', TRUE),
  (39, 39, 'BEYAZ PEYNİRLİ TOST', 'Tost & Ekmek', '[]'::jsonb, 'none', TRUE),
  (40, 40, 'HAŞLANMIŞ YUMURTA', 'Sahanda & Yumurta', '["3 DK.","5 DK.","7 DK.","8 DK."]'::jsonb, 'single', TRUE)
ON CONFLICT (id) DO UPDATE SET
  product_no = EXCLUDED.product_no,
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  variations = EXCLUDED.variations,
  selection_mode = EXCLUDED.selection_mode,
  is_active = EXCLUDED.is_active;
