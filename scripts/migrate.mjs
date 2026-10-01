// Applique les fichiers db/migrations/*.sql pas encore passés, dans l'ordre.
// Usage : npm run db:migrate   (lit DATABASE_URL dans .env.local)
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {}
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquante (voir .env.example).");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });
const dir = path.join(import.meta.dirname, "..", "db", "migrations");

try {
  await sql`create table if not exists schema_migrations (
    nom text primary key,
    applique_le timestamptz not null default now()
  )`;
  await sql`alter table schema_migrations enable row level security`;
  const faites = new Set((await sql`select nom from schema_migrations`).map((r) => r.nom));
  const fichiers = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  let n = 0;
  for (const f of fichiers) {
    if (faites.has(f)) continue;
    const contenu = await readFile(path.join(dir, f), "utf8");
    await sql.begin(async (tx) => {
      await tx.unsafe(contenu);
      await tx`insert into schema_migrations (nom) values (${f})`;
    });
    console.log(`✔ ${f}`);
    n++;
  }
  console.log(n ? `${n} migration(s) appliquée(s).` : "Base à jour.");
} finally {
  await sql.end();
}
