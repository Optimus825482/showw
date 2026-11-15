import { promises as fs } from "node:fs";
import path from "node:path";
import { Pool, type PoolConfig } from "pg";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { MENU_ITEMS } from "@/lib/menu-data";
import { detectSystemPrinters } from "@/lib/printer-detector";
import type {
  Adisyon,
  AdisyonItem,
  AdisyonStatus,
  AuthUser,
  DbMode,
  DetectedSystemPrinter,
  ItemStatus,
  MenuItem,
  PrinterConfig,
  UserRole,
} from "@/types/adisyon";

export interface CreateAdisyonInput {
  roomNumber: string;
  guestName: string;
  note?: string;
  markPrinted?: boolean;
  items: Array<{
    menuItemId: number;
    productNo: number;
    productName: string;
    category: string;
    variations: string[];
    quantity: number;
    itemNote?: string;
  }>;
}

interface StoredUser {
  username: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
}

interface LocalDbStore {
  lastAdisyonId: number;
  lastItemId: number;
  adisyons: Adisyon[];
  users?: StoredUser[];
  printerConfig?: PrinterConfig;
}

const DEFAULT_USER_SEEDS: Array<{
  username: string;
  defaultPassword: string;
  displayName: string;
  role: UserRole;
}> = [
  {
    username: "admin",
    defaultPassword: "123456",
    displayName: "Yönetici (Admin)",
    role: "ADMIN",
  },
  {
    username: "siparis",
    defaultPassword: "123456",
    displayName: "Sipariş Personeli",
    role: "SIPARIS",
  },
  {
    username: "mutfak",
    defaultPassword: "123456",
    displayName: "Mutfak Ekibi",
    role: "MUTFAK",
  },
];

function buildDefaultStoredUsers(): StoredUser[] {
  return DEFAULT_USER_SEEDS.map((u) => ({
    username: u.username,
    passwordHash: hashPassword(u.defaultPassword),
    displayName: u.displayName,
    role: u.role,
  }));
}

const LOCAL_DB_PATH = path.join(process.cwd(), "data", "local-db.json");

const globalForDb = globalThis as unknown as {
  __pgPool?: Pool;
  __pgReady?: boolean;
  __pgLastError?: string;
  __pgRetryAfter?: number;
};

function getTargetDatabaseName(): string {
  if (process.env.PGDATABASE) return process.env.PGDATABASE;
  if (process.env.DATABASE_URL) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      const db = parsed.pathname.replace(/^\//, "");
      if (db) return db;
    } catch {
      // ignore invalid URL
    }
  }
  return "show_bufe";
}

function buildPoolConfig(overrideDatabase?: string): PoolConfig {
  if (process.env.DATABASE_URL && !overrideDatabase) {
    return {
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 3000,
    };
  }

  if (process.env.DATABASE_URL && overrideDatabase) {
    try {
      const parsed = new URL(process.env.DATABASE_URL);
      parsed.pathname = `/${overrideDatabase}`;
      return {
        connectionString: parsed.toString(),
        max: 5,
        idleTimeoutMillis: 15_000,
        connectionTimeoutMillis: 3000,
      };
    } catch {
      // fall through to PG* env vars
    }
  }

  return {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: overrideDatabase || process.env.PGDATABASE || "show_bufe",
    max: overrideDatabase ? 5 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 3000,
  };
}

async function createDatabaseIfMissing(): Promise<void> {
  const targetDb = getTargetDatabaseName();
  const adminPool = new Pool(buildPoolConfig("postgres"));
  try {
    const existsRes = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDb]
    );
    if (existsRes.rowCount === 0) {
      const safeIdent = targetDb.replace(/"/g, '""');
      await adminPool.query(`CREATE DATABASE "${safeIdent}"`);
    }
  } finally {
    await adminPool.end();
  }
}

async function ensureSchemaAndSeed(pool: Pool): Promise<void> {
  await pool.query(`
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
      guest_name TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'BEKLIYOR',
      printed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );

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
  `);

  // Batch insert default users in one parameterized query
  const userPlaceholders: string[] = [];
  const userValues: unknown[] = [];
  DEFAULT_USER_SEEDS.forEach((seed, idx) => {
    const base = idx * 4;
    userPlaceholders.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`
    );
    userValues.push(
      seed.username,
      hashPassword(seed.defaultPassword),
      seed.displayName,
      seed.role
    );
  });

  if (userPlaceholders.length > 0) {
    await pool.query(
      `
      INSERT INTO users (username, password_hash, display_name, role)
      VALUES ${userPlaceholders.join(", ")}
      ON CONFLICT (username) DO NOTHING
      `,
      userValues
    );
  }

  // Batch upsert menu items in one parameterized query
  const itemPlaceholders: string[] = [];
  const itemValues: unknown[] = [];
  MENU_ITEMS.forEach((item, idx) => {
    const base = idx * 7;
    itemPlaceholders.push(
      `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}::jsonb, $${base + 6}, $${base + 7})`
    );
    itemValues.push(
      item.id,
      item.productNo,
      item.name,
      item.category,
      JSON.stringify(item.variations),
      item.selectionMode,
      item.isActive
    );
  });

  if (itemPlaceholders.length > 0) {
    await pool.query(
      `
      INSERT INTO menu_items (id, product_no, name, category, variations, selection_mode, is_active)
      VALUES ${itemPlaceholders.join(", ")}
      ON CONFLICT (id) DO UPDATE SET
        product_no = EXCLUDED.product_no,
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        variations = EXCLUDED.variations,
        selection_mode = EXCLUDED.selection_mode,
        is_active = EXCLUDED.is_active
      `,
      itemValues
    );
  }
}

export async function ensureDbInitialized(): Promise<{
  dbMode: DbMode;
  notice?: string;
}> {
  const { pool, notice } = await getPgPool();
  if (!pool) {
    await readLocalDb();
    return { dbMode: "fallback", notice };
  }
  return { dbMode: "postgres" };
}

async function getPgPool(): Promise<{ pool: Pool | null; notice?: string }> {
  if (globalForDb.__pgReady && globalForDb.__pgPool) {
    return { pool: globalForDb.__pgPool };
  }

  if (globalForDb.__pgRetryAfter && Date.now() < globalForDb.__pgRetryAfter) {
    return { pool: null, notice: globalForDb.__pgLastError };
  }

  try {
    if (!globalForDb.__pgPool) {
      globalForDb.__pgPool = new Pool(buildPoolConfig());
    }

    try {
      await globalForDb.__pgPool.query("SELECT 1");
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr?.code === "3D000") {
        await createDatabaseIfMissing();
        await globalForDb.__pgPool.end().catch(() => {});
        globalForDb.__pgPool = new Pool(buildPoolConfig());
        await globalForDb.__pgPool.query("SELECT 1");
      } else {
        throw err;
      }
    }

    await ensureSchemaAndSeed(globalForDb.__pgPool);
    globalForDb.__pgReady = true;
    globalForDb.__pgLastError = undefined;
    globalForDb.__pgRetryAfter = undefined;
    return { pool: globalForDb.__pgPool };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "PostgreSQL bağlantısı kurulamadı";
    globalForDb.__pgReady = false;
    globalForDb.__pgLastError = `PostgreSQL bekleniyor (${message}). .env ayarlarınız yapılana kadar yerel JSON depolama aktif.`;
    globalForDb.__pgRetryAfter = Date.now() + 15_000;
    if (globalForDb.__pgPool) {
      await globalForDb.__pgPool.end().catch(() => {});
      globalForDb.__pgPool = undefined;
    }
    return { pool: null, notice: globalForDb.__pgLastError };
  }
}

async function readLocalDb(): Promise<LocalDbStore> {
  try {
    const raw = await fs.readFile(LOCAL_DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as LocalDbStore;
    if (!parsed.users || parsed.users.length === 0) {
      parsed.users = buildDefaultStoredUsers();
      await writeLocalDb(parsed);
    }
    return parsed;
  } catch {
    const initial: LocalDbStore = {
      lastAdisyonId: 0,
      lastItemId: 0,
      adisyons: [],
      users: buildDefaultStoredUsers(),
    };
    await writeLocalDb(initial);
    return initial;
  }
}

async function writeLocalDb(store: LocalDbStore): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(store, null, 2), "utf-8");
}

function deriveAdisyonStatusFromItems(items: AdisyonItem[]): AdisyonStatus {
  if (items.length === 0) return "BEKLIYOR";
  const allDelivered = items.every((i) => i.status === "TESLIM_EDILDI");
  if (allDelivered) return "TESLIM_EDILDI";
  const allReadyOrDelivered = items.every(
    (i) => i.status === "HAZIR" || i.status === "TESLIM_EDILDI"
  );
  if (allReadyOrDelivered) return "HAZIR";
  const anyStarted = items.some(
    (i) => i.status === "HAZIRLANIYOR" || i.status === "HAZIR"
  );
  if (anyStarted) return "HAZIRLANIYOR";
  return "BEKLIYOR";
}

function mapPgRowsToAdisyons(
  adisyonRows: Array<Record<string, unknown>>,
  itemRows: Array<Record<string, unknown>>
): Adisyon[] {
  const itemsByAdisyon = new Map<number, AdisyonItem[]>();

  for (const row of itemRows) {
    const adisyonId = Number(row.adisyon_id);
    const list = itemsByAdisyon.get(adisyonId) ?? [];
    list.push({
      id: Number(row.id),
      adisyonId,
      menuItemId: Number(row.menu_item_id),
      productNo: Number(row.product_no),
      productName: String(row.product_name),
      category: String(row.category ?? ""),
      variations: Array.isArray(row.variations)
        ? (row.variations as string[])
        : [],
      quantity: Number(row.quantity),
      itemNote: String(row.item_note ?? ""),
      status: String(row.status) as ItemStatus,
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
    });
    itemsByAdisyon.set(adisyonId, list);
  }

  return adisyonRows.map((row) => {
    const id = Number(row.id);
    return {
      id,
      queueNumber: Number(row.queue_number),
      roomNumber: String(row.room_number ?? ""),
      guestName: String(row.guest_name ?? ""),
      note: String(row.note ?? ""),
      status: String(row.status) as AdisyonStatus,
      printedAt: row.printed_at
        ? new Date(String(row.printed_at)).toISOString()
        : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
      completedAt: row.completed_at
        ? new Date(String(row.completed_at)).toISOString()
        : null,
      items: itemsByAdisyon.get(id) ?? [],
    };
  });
}

export async function getMenuItems(): Promise<{
  items: MenuItem[];
  dbMode: DbMode;
  dbNotice?: string;
}> {
  const { pool, notice } = await getPgPool();
  if (!pool) {
    return { items: MENU_ITEMS, dbMode: "fallback", dbNotice: notice };
  }

  const res = await pool.query(
    `SELECT id, product_no, name, category, variations, selection_mode, is_active
     FROM menu_items
     WHERE is_active = TRUE
     ORDER BY product_no ASC`
  );

  const items: MenuItem[] = res.rows.map((r) => ({
    id: Number(r.id),
    productNo: Number(r.product_no),
    name: String(r.name),
    category: String(r.category) as MenuItem["category"],
    variations: Array.isArray(r.variations) ? (r.variations as string[]) : [],
    selectionMode: String(r.selection_mode) as MenuItem["selectionMode"],
    isActive: Boolean(r.is_active),
  }));

  return { items, dbMode: "postgres" };
}

export async function listAdisyons(): Promise<{
  adisyons: Adisyon[];
  dbMode: DbMode;
  dbNotice?: string;
}> {
  const { pool, notice } = await getPgPool();
  if (!pool) {
    const store = await readLocalDb();
    const sorted = [...store.adisyons].sort((a, b) => {
      const aDone = a.status === "TESLIM_EDILDI" || a.status === "IPTAL";
      const bDone = b.status === "TESLIM_EDILDI" || b.status === "IPTAL";
      if (aDone !== bDone) return aDone ? 1 : -1;
      if (!aDone) return a.queueNumber - b.queueNumber;
      return (
        new Date(b.completedAt || b.updatedAt).getTime() -
        new Date(a.completedAt || a.updatedAt).getTime()
      );
    });
    return { adisyons: sorted, dbMode: "fallback", dbNotice: notice };
  }

  const adisyonsRes = await pool.query(
    `SELECT *
     FROM adisyons
     WHERE created_at >= NOW() - INTERVAL '365 days'
        OR status NOT IN ('TESLIM_EDILDI', 'IPTAL')
     ORDER BY
       CASE WHEN status IN ('TESLIM_EDILDI', 'IPTAL') THEN 1 ELSE 0 END ASC,
       CASE WHEN status NOT IN ('TESLIM_EDILDI', 'IPTAL') THEN queue_number END ASC,
       completed_at DESC NULLS LAST,
       id DESC`
  );

  const ids = adisyonsRes.rows.map((r) => Number(r.id));
  let itemRows: Array<Record<string, unknown>> = [];
  if (ids.length > 0) {
    const itemsRes = await pool.query(
      `SELECT * FROM adisyon_items WHERE adisyon_id = ANY($1::int[]) ORDER BY id ASC`,
      [ids]
    );
    itemRows = itemsRes.rows;
  }

  return {
    adisyons: mapPgRowsToAdisyons(adisyonsRes.rows, itemRows),
    dbMode: "postgres",
  };
}

export async function createAdisyon(input: CreateAdisyonInput): Promise<{
  adisyon: Adisyon;
  dbMode: DbMode;
  dbNotice?: string;
}> {
  const { pool, notice } = await getPgPool();
  const roomNumber = input.roomNumber.trim();
  const guestName = input.guestName.trim();
  const note = (input.note ?? "").trim();

  if (!pool) {
    const store = await readLocalDb();
    const today = new Date().toISOString().slice(0, 10);
    const todayMaxQueue = store.adisyons
      .filter((a) => a.createdAt.slice(0, 10) === today)
      .reduce((max, a) => Math.max(max, a.queueNumber), 0);

    const now = new Date().toISOString();
    store.lastAdisyonId += 1;
    const adisyonId = store.lastAdisyonId;

    const createdItems: AdisyonItem[] = input.items.map((item) => {
      store.lastItemId += 1;
      return {
        id: store.lastItemId,
        adisyonId,
        menuItemId: item.menuItemId,
        productNo: item.productNo,
        productName: item.productName,
        category: item.category,
        variations: item.variations ?? [],
        quantity: Math.max(1, Math.floor(item.quantity || 1)),
        itemNote: (item.itemNote ?? "").trim(),
        status: "BEKLIYOR",
        createdAt: now,
        updatedAt: now,
      };
    });

    const newAdisyon: Adisyon = {
      id: adisyonId,
      queueNumber: todayMaxQueue + 1,
      roomNumber,
      guestName,
      note,
      status: "BEKLIYOR",
      printedAt: input.markPrinted ? now : null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      items: createdItems,
    };

    store.adisyons.push(newAdisyon);
    await writeLocalDb(store);
    return { adisyon: newAdisyon, dbMode: "fallback", dbNotice: notice };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE adisyons IN SHARE ROW EXCLUSIVE MODE");

    const queueRes = await client.query<{ next_queue: number }>(
      `SELECT COALESCE(MAX(queue_number), 0) + 1 AS next_queue
       FROM adisyons
       WHERE created_at::date = CURRENT_DATE`
    );
    const queueNumber = Number(queueRes.rows[0]?.next_queue ?? 1);

    const adisyonRes = await client.query(
      `INSERT INTO adisyons (queue_number, room_number, guest_name, note, status, printed_at)
       VALUES ($1, $2, $3, $4, 'BEKLIYOR', $5)
       RETURNING *`,
      [
        queueNumber,
        roomNumber,
        guestName,
        note,
        input.markPrinted ? new Date().toISOString() : null,
      ]
    );

    const adisyonRow = adisyonRes.rows[0];
    const adisyonId = Number(adisyonRow.id);
    const itemRows: Array<Record<string, unknown>> = [];

    for (const item of input.items) {
      const inserted = await client.query(
        `INSERT INTO adisyon_items (
          adisyon_id, menu_item_id, product_no, product_name, category, variations, quantity, item_note, status
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, 'BEKLIYOR')
        RETURNING *`,
        [
          adisyonId,
          item.menuItemId,
          item.productNo,
          item.productName,
          item.category,
          JSON.stringify(item.variations ?? []),
          Math.max(1, Math.floor(item.quantity || 1)),
          (item.itemNote ?? "").trim(),
        ]
      );
      itemRows.push(inserted.rows[0]);
    }

    await client.query("COMMIT");
    const [adisyon] = mapPgRowsToAdisyons([adisyonRow], itemRows);
    return { adisyon, dbMode: "postgres" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAdisyonOrItem(
  adisyonId: number,
  payload: {
    status?: AdisyonStatus;
    itemId?: number;
    itemStatus?: ItemStatus;
    markPrinted?: boolean;
  }
): Promise<{
  adisyon: Adisyon | null;
  dbMode: DbMode;
  dbNotice?: string;
}> {
  const { pool, notice } = await getPgPool();

  if (!pool) {
    const store = await readLocalDb();
    const target = store.adisyons.find((a) => a.id === adisyonId);
    if (!target) {
      return { adisyon: null, dbMode: "fallback", dbNotice: notice };
    }

    const now = new Date().toISOString();

    if (payload.markPrinted) {
      target.printedAt = now;
      target.updatedAt = now;
    }

    if (payload.itemId && payload.itemStatus) {
      const targetItem = target.items.find((i) => i.id === payload.itemId);
      if (targetItem) {
        targetItem.status = payload.itemStatus;
        targetItem.updatedAt = now;
      }
      if (target.status !== "IPTAL") {
        target.status = deriveAdisyonStatusFromItems(target.items);
        target.completedAt =
          target.status === "TESLIM_EDILDI" ? now : null;
      }
      target.updatedAt = now;
    } else if (payload.status) {
      target.status = payload.status;
      target.updatedAt = now;
      target.completedAt =
        payload.status === "TESLIM_EDILDI" || payload.status === "IPTAL"
          ? now
          : null;

      if (payload.status !== "IPTAL") {
        const nextItemStatus = payload.status as ItemStatus;
        for (const item of target.items) {
          item.status = nextItemStatus;
          item.updatedAt = now;
        }
      }
    }

    await writeLocalDb(store);
    return { adisyon: target, dbMode: "fallback", dbNotice: notice };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (payload.markPrinted) {
      await client.query(
        `UPDATE adisyons SET printed_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [adisyonId]
      );
    }

    if (payload.itemId && payload.itemStatus) {
      await client.query(
        `UPDATE adisyon_items SET status = $1, updated_at = NOW()
         WHERE id = $2 AND adisyon_id = $3`,
        [payload.itemStatus, payload.itemId, adisyonId]
      );

      const itemsCheck = await client.query(
        `SELECT * FROM adisyon_items WHERE adisyon_id = $1 ORDER BY id ASC`,
        [adisyonId]
      );
      const mappedItems: AdisyonItem[] = itemsCheck.rows.map((r) => ({
        id: Number(r.id),
        adisyonId,
        menuItemId: Number(r.menu_item_id),
        productNo: Number(r.product_no),
        productName: String(r.product_name),
        category: String(r.category ?? ""),
        variations: Array.isArray(r.variations)
          ? (r.variations as string[])
          : [],
        quantity: Number(r.quantity),
        itemNote: String(r.item_note ?? ""),
        status: String(r.status) as ItemStatus,
        createdAt: new Date(String(r.created_at)).toISOString(),
        updatedAt: new Date(String(r.updated_at)).toISOString(),
      }));

      const nextStatus = deriveAdisyonStatusFromItems(mappedItems);
      await client.query(
        `UPDATE adisyons
         SET status = $1,
             updated_at = NOW(),
             completed_at = CASE WHEN $1 = 'TESLIM_EDILDI' THEN COALESCE(completed_at, NOW()) ELSE NULL END
         WHERE id = $2 AND status <> 'IPTAL'`,
        [nextStatus, adisyonId]
      );
    } else if (payload.status) {
      await client.query(
        `UPDATE adisyons
         SET status = $1,
             updated_at = NOW(),
             completed_at = CASE WHEN $1 IN ('TESLIM_EDILDI', 'IPTAL') THEN COALESCE(completed_at, NOW()) ELSE NULL END
         WHERE id = $2`,
        [payload.status, adisyonId]
      );

      if (payload.status !== "IPTAL") {
        await client.query(
          `UPDATE adisyon_items SET status = $1, updated_at = NOW() WHERE adisyon_id = $2`,
          [payload.status, adisyonId]
        );
      }
    }

    const adisyonRes = await client.query(
      `SELECT * FROM adisyons WHERE id = $1`,
      [adisyonId]
    );
    if (adisyonRes.rowCount === 0) {
      await client.query("COMMIT");
      return { adisyon: null, dbMode: "postgres" };
    }

    const itemsRes = await client.query(
      `SELECT * FROM adisyon_items WHERE adisyon_id = $1 ORDER BY id ASC`,
      [adisyonId]
    );

    await client.query("COMMIT");
    const [adisyon] = mapPgRowsToAdisyons(adisyonRes.rows, itemsRes.rows);
    return { adisyon, dbMode: "postgres" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function batchUpdateItemStatuses(
  itemIds: number[],
  nextItemStatus: ItemStatus
): Promise<{
  updatedCount: number;
  dbMode: DbMode;
  dbNotice?: string;
}> {
  if (itemIds.length === 0) {
    return { updatedCount: 0, dbMode: "postgres" };
  }

  const { pool, notice } = await getPgPool();

  if (!pool) {
    const store = await readLocalDb();
    const idSet = new Set(itemIds);
    const now = new Date().toISOString();
    let updatedCount = 0;

    for (const adisyon of store.adisyons) {
      if (adisyon.status === "IPTAL") continue;
      let touched = false;
      for (const item of adisyon.items) {
        if (idSet.has(item.id) && item.status !== "TESLIM_EDILDI") {
          item.status = nextItemStatus;
          item.updatedAt = now;
          updatedCount += 1;
          touched = true;
        }
      }
      if (touched) {
        adisyon.status = deriveAdisyonStatusFromItems(adisyon.items);
        adisyon.updatedAt = now;
        adisyon.completedAt =
          adisyon.status === "TESLIM_EDILDI" ? now : null;
      }
    }

    await writeLocalDb(store);
    return { updatedCount, dbMode: "fallback", dbNotice: notice };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const updatedRes = await client.query<{ adisyon_id: number }>(
      `UPDATE adisyon_items
       SET status = $1, updated_at = NOW()
       WHERE id = ANY($2::int[]) AND status <> 'TESLIM_EDILDI'
       RETURNING adisyon_id`,
      [nextItemStatus, itemIds]
    );

    const affectedAdisyonIds = Array.from(
      new Set(updatedRes.rows.map((r) => Number(r.adisyon_id)))
    );

    for (const adisyonId of affectedAdisyonIds) {
      const itemsCheck = await client.query(
        `SELECT * FROM adisyon_items WHERE adisyon_id = $1`,
        [adisyonId]
      );
      const mapped: AdisyonItem[] = itemsCheck.rows.map((r) => ({
        id: Number(r.id),
        adisyonId,
        menuItemId: Number(r.menu_item_id),
        productNo: Number(r.product_no),
        productName: String(r.product_name),
        category: String(r.category ?? ""),
        variations: Array.isArray(r.variations)
          ? (r.variations as string[])
          : [],
        quantity: Number(r.quantity),
        itemNote: String(r.item_note ?? ""),
        status: String(r.status) as ItemStatus,
        createdAt: new Date(String(r.created_at)).toISOString(),
        updatedAt: new Date(String(r.updated_at)).toISOString(),
      }));

      const nextStatus = deriveAdisyonStatusFromItems(mapped);
      await client.query(
        `UPDATE adisyons
         SET status = $1,
             updated_at = NOW(),
             completed_at = CASE WHEN $1 = 'TESLIM_EDILDI' THEN COALESCE(completed_at, NOW()) ELSE NULL END
         WHERE id = $2 AND status <> 'IPTAL'`,
        [nextStatus, adisyonId]
      );
    }

    await client.query("COMMIT");
    return { updatedCount: updatedRes.rowCount ?? 0, dbMode: "postgres" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function verifyUserCredentials(
  usernameInput: string,
  passwordInput: string
): Promise<{ user: AuthUser | null; dbMode: DbMode }> {
  const normalizedUsername = usernameInput.trim().toLowerCase();
  const { pool } = await getPgPool();

  if (!pool) {
    const store = await readLocalDb();
    const matched = (store.users ?? []).find(
      (u) => u.username.toLowerCase() === normalizedUsername
    );
    if (!matched || !verifyPassword(passwordInput, matched.passwordHash)) {
      return { user: null, dbMode: "fallback" };
    }
    return {
      user: {
        username: matched.username,
        displayName: matched.displayName,
        role: matched.role,
      },
      dbMode: "fallback",
    };
  }

  const res = await pool.query<{
    username: string;
    password_hash: string;
    display_name: string;
    role: string;
  }>(
    `SELECT username, password_hash, display_name, role
     FROM users
     WHERE LOWER(username) = $1
     LIMIT 1`,
    [normalizedUsername]
  );

  const row = res.rows[0];
  if (!row || !verifyPassword(passwordInput, row.password_hash)) {
    return { user: null, dbMode: "postgres" };
  }

  return {
    user: {
      username: row.username,
      displayName: row.display_name,
      role: row.role as UserRole,
    },
    dbMode: "postgres",
  };
}

export async function getPrinterStatus(forceSystemScan = false): Promise<{
  systemPrinters: DetectedSystemPrinter[];
  printerConfig: PrinterConfig;
  hasActivePrinter: boolean;
  dbMode: DbMode;
}> {
  const systemPrinters = await detectSystemPrinters(forceSystemScan);
  const firstPhysical = systemPrinters.find((p) => !p.isVirtual);
  const { pool } = await getPgPool();

  let savedConfig: PrinterConfig | null = null;
  let dbMode: DbMode = "postgres";

  if (!pool) {
    dbMode = "fallback";
    const store = await readLocalDb();
    savedConfig = store.printerConfig ?? null;
  } else {
    const res = await pool.query<{
      enabled: boolean;
      printer_name: string;
      auto_print: boolean;
    }>(
      `SELECT enabled, printer_name, auto_print FROM printer_settings WHERE id = 1 LIMIT 1`
    );
    if (res.rows[0]) {
      savedConfig = {
        enabled: Boolean(res.rows[0].enabled),
        printerName: String(res.rows[0].printer_name ?? ""),
        autoPrint: Boolean(res.rows[0].auto_print),
      };
    }
  }

  const printerConfig: PrinterConfig = savedConfig
    ? savedConfig
    : firstPhysical
    ? {
        enabled: true,
        printerName: firstPhysical.name,
        autoPrint: true,
      }
    : {
        enabled: false,
        printerName: "",
        autoPrint: true,
      };

  const hasActivePrinter =
    Boolean(printerConfig.enabled) &&
    printerConfig.printerName.trim().length > 0;

  return {
    systemPrinters,
    printerConfig,
    hasActivePrinter,
    dbMode,
  };
}

export async function savePrinterConfig(
  nextConfig: PrinterConfig
): Promise<{
  systemPrinters: DetectedSystemPrinter[];
  printerConfig: PrinterConfig;
  hasActivePrinter: boolean;
  dbMode: DbMode;
}> {
  const cleaned: PrinterConfig = {
    enabled: Boolean(nextConfig.enabled) && Boolean(nextConfig.printerName.trim()),
    printerName: nextConfig.printerName.trim(),
    autoPrint: Boolean(nextConfig.autoPrint),
  };

  const { pool } = await getPgPool();

  if (!pool) {
    const store = await readLocalDb();
    store.printerConfig = cleaned;
    await writeLocalDb(store);
  } else {
    await pool.query(
      `
      INSERT INTO printer_settings (id, enabled, printer_name, auto_print, updated_at)
      VALUES (1, $1, $2, $3, NOW())
      ON CONFLICT (id) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        printer_name = EXCLUDED.printer_name,
        auto_print = EXCLUDED.auto_print,
        updated_at = NOW()
      `,
      [cleaned.enabled, cleaned.printerName, cleaned.autoPrint]
    );
  }

  return getPrinterStatus(false);
}
