import "server-only";
import { sql } from "@/lib/db";
import type { Compteurs } from "./stats";

export type LigneSecteur = Compteurs & { secteur: string };

/** Compteurs depuis `depuis` (YYYY-MM-DD, heure de Paris), ou depuis le début si null. */
export async function compteurs(depuis: string | null): Promise<{ total: Compteurs; secteurs: LigneSecteur[] }> {
  const debut = depuis ? sql`${depuis}::timestamp at time zone 'Europe/Paris'` : sql`'-infinity'::timestamptz`;
  const rows = await sql<{ secteur: string; appels: string; decroches: string; rdv: string; ventes: string; ca: string }[]>`
    with a as (
      select p.secteur,
             count(*) as appels,
             count(*) filter (where a.decroche) as decroches,
             count(*) filter (where a.issue = 'rdv_pris') as rdv
      from appels a join prospects p on p.id = a.prospect_id
      where a.date >= ${debut}
      group by p.secteur
    ), v as (
      select secteur, count(*) as ventes, coalesce(sum(montant), 0) as ca
      from prospects
      where statut = 'client' and converti_le >= ${debut}
      group by secteur
    )
    select coalesce(a.secteur, v.secteur) as secteur,
           coalesce(a.appels, 0) as appels, coalesce(a.decroches, 0) as decroches,
           coalesce(a.rdv, 0) as rdv, coalesce(v.ventes, 0) as ventes, coalesce(v.ca, 0) as ca
    from a full join v on v.secteur = a.secteur
    order by appels desc`;

  const secteurs = rows.map((r) => ({
    secteur: r.secteur || "(non renseigné)",
    appels: Number(r.appels),
    decroches: Number(r.decroches),
    rdv: Number(r.rdv),
    ventes: Number(r.ventes),
    ca: Number(r.ca),
  }));
  const total = secteurs.reduce<Compteurs>(
    (t, s) => ({
      appels: t.appels + s.appels,
      decroches: t.decroches + s.decroches,
      rdv: t.rdv + s.rdv,
      ventes: t.ventes + s.ventes,
      ca: t.ca + s.ca,
    }),
    { appels: 0, decroches: 0, rdv: 0, ventes: 0, ca: 0 },
  );
  return { total, secteurs };
}

export async function appelsAujourdhui(today: string): Promise<number> {
  const [r] = await sql<{ n: string }[]>`
    select count(*) as n from appels
    where date >= ${today}::timestamp at time zone 'Europe/Paris'`;
  return Number(r.n);
}
