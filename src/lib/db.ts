import "server-only";
import postgres from "postgres";

// Connexion PostgreSQL côté serveur uniquement. Une seule instance, réutilisée
// entre les rechargements à chaud en développement.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquante : voir .env.example");
  return postgres(url, {
    prepare: false, // compatible avec le pooler Supabase
    max: 5,
    // Les colonnes `date` restent des chaînes YYYY-MM-DD (pas de décalage de fuseau).
    types: {
      date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x },
    },
  });
}

export const sql: postgres.Sql = globalForDb.sql ?? createClient();
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
