import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 2000;

const DEFAULT_USERS = [
  { username: "admin", displayName: "Sistem Yöneticisi (Admin)", role: "admin" },
  { username: "siparis", displayName: "Sipariş Ekranı", role: "siparis" },
  { username: "mutfak", displayName: "Mutfak Ekibi (KDS)", role: "mutfak" },
];

function loadLocalEnvIfNeeded() {
  if (!process.env.DATABASE_URL && !process.env.PGHOST) {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
      try {
        process.loadEnvFile(envPath);
      } catch {
        // ignore invalid local .env parse and let normal env checks handle it
      }
    }
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function getConnectionParams(databaseOverride) {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const sslConfig =
    process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined;

  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    const targetDb =
      databaseOverride ??
      (parsed.pathname.replace(/^\/+/, "") || "show_bufe");
    parsed.pathname = `/${targetDb}`;
    return {
      targetDb:
        new URL(databaseUrl).pathname.replace(/^\/+/, "") || "show_bufe",
      clientConfig: {
        connectionString: parsed.toString(),
        ssl: sslConfig,
        connectionTimeoutMillis: 5000,
      },
    };
  }

  const host = process.env.PGHOST?.trim() || "localhost";
  const port = Number(process.env.PGPORT || "5432") || 5432;
  const user = process.env.PGUSER?.trim() || "postgres";
  const password = process.env.PGPASSWORD ?? "postgres";
  const targetDb = process.env.PGDATABASE?.trim() || "show_bufe";

  return {
    targetDb,
    clientConfig: {
      host,
      port,
      user,
      password,
      database: databaseOverride ?? targetDb,
      ssl: sslConfig,
      connectionTimeoutMillis: 5000,
    },
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry(databaseOverride) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    const { clientConfig } = getConnectionParams(databaseOverride);
    const client = new Client(clientConfig);
    try {
      await client.connect();
      return client;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => {});
      const code = error && typeof error === "object" ? error.code : undefined;

      // Database does not exist yet -> let caller create it on maintenance DB
      if (code === "3D000") {
        throw error;
      }

      console.log(
        `[init-db] PostgreSQL bekleniyor (${attempt}/${MAX_RETRIES}): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw lastError;
}

async function ensureDatabaseExists(targetDb) {
  let targetClient;
  try {
    targetClient = await connectWithRetry();
    return targetClient;
  } catch (error) {
    const code = error && typeof error === "object" ? error.code : undefined;
    if (code !== "3D000") {
      throw error;
    }

    console.log(
      `[init-db] Veritabanı '${targetDb}' bulunamadı, oluşturuluyor...`
    );
    const adminClient = await connectWithRetry("postgres");
    try {
      const existing = await adminClient.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [targetDb]
      );
      if (existing.rowCount === 0) {
        const escapedDb = targetDb.replace(/"/g, '""');
        await adminClient.query(`CREATE DATABASE "${escapedDb}"`);
        console.log(`[init-db] Veritabanı '${targetDb}' oluşturuldu.`);
      }
    } finally {
      await adminClient.end().catch(() => {});
    }

    return connectWithRetry();
  }
}

async function main() {
  loadLocalEnvIfNeeded();

  if (!process.env.DATABASE_URL?.trim() && !process.env.PGHOST?.trim()) {
    console.log(
      "[init-db] DATABASE_URL veya PGHOST tanımlı değil, otomatik DB başlatma atlandı."
    );
    return;
  }

  const { targetDb } = getConnectionParams();
  console.log(`[init-db] PostgreSQL hedef veritabanı kontrol ediliyor: ${targetDb}`);

  const client = await ensureDatabaseExists(targetDb);
  try {
    const schemaPath = path.join(process.cwd(), "db", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    await client.query(schemaSql);
    console.log("[init-db] Tablolar ve 40 varsayılan menü ürünü doğrulandı.");

    const defaultPassword = process.env.DEFAULT_USER_PASSWORD || "123456";
    const values = [];
    const placeholders = DEFAULT_USERS.map((user, idx) => {
      const base = idx * 4;
      values.push(
        user.username,
        hashPassword(defaultPassword),
        user.displayName,
        user.role
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    });

    await client.query(
      `
      INSERT INTO users (username, password_hash, display_name, role)
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (username) DO NOTHING
      `,
      values
    );
    console.log("[init-db] Varsayılan kullanıcılar (admin, siparis, mutfak) doğrulandı.");
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error("[init-db] Veritabanı başlatma hatası:", error);
  process.exit(1);
});
