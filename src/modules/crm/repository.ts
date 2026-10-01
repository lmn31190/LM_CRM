import "server-only";
import { sql } from "@/lib/db";
import type { LeadImport } from "./csv";
import { nextBusinessDay, todayParis } from "./dates";
import { normalizePhone } from "./phone";
import { ISSUES, type Issue, type SiteEtat, type Statut } from "./statuts";

export type Prospect = {
  id: string;
  entreprise: string;
  secteur: string;
  interlocuteur: string;
  telephone: string | null;
  email: string;
  ville: string;
  adresse: string;
  site_web: string;
  site_etat: SiteEtat;
  categorie: string;
  note_google: string | null;
  nb_avis: number | null;
  statut: Statut;
  nb_tentatives: number;
  dernier_appel: Date | null;
  prochaine_relance: string | null;
  rdv_date: Date | null;
  site_pret: boolean;
  montant: string | null;
  converti_le: Date | null;
  notes: string;
  source: string;
  created_at: Date;
  updated_at: Date;
};

export type Appel = {
  id: string;
  prospect_id: string;
  date: Date;
  issue: Issue;
  decroche: boolean;
  notes: string;
};

export type ProspectInput = {
  entreprise: string;
  secteur?: string;
  interlocuteur?: string;
  telephone?: string | null;
  email?: string;
  ville?: string;
  adresse?: string;
  site_web?: string;
  site_etat?: SiteEtat;
  statut?: Statut;
  prochaine_relance?: string | null;
  notes?: string;
  source?: string;
};

export class DoublonError extends Error {
  constructor(public existingId: string) {
    super("Un prospect avec ce numéro existe déjà.");
  }
}

export async function findByTelephone(telephone: string | null): Promise<string | null> {
  if (!telephone) return null;
  const [row] = await sql<{ id: string }[]>`select id from prospects where telephone = ${telephone}`;
  return row?.id ?? null;
}

export async function createProspect(input: ProspectInput): Promise<string> {
  const telephone = normalizePhone(input.telephone);
  const existing = await findByTelephone(telephone);
  if (existing) throw new DoublonError(existing);
  const [row] = await sql<{ id: string }[]>`
    insert into prospects ${sql({
      entreprise: input.entreprise.trim(),
      secteur: input.secteur?.trim() ?? "",
      interlocuteur: input.interlocuteur?.trim() ?? "",
      telephone,
      email: input.email?.trim() ?? "",
      ville: input.ville?.trim() ?? "",
      adresse: input.adresse?.trim() ?? "",
      site_web: input.site_web?.trim() ?? "",
      site_etat: input.site_etat ?? (input.site_web?.trim() ? "inconnu" : "aucun"),
      statut: input.statut ?? "a_appeler",
      prochaine_relance: input.prochaine_relance || null,
      notes: input.notes?.trim() ?? "",
      source: input.source ?? "manuel",
    })}
    returning id`;
  return row.id;
}

export async function updateProspect(id: string, input: ProspectInput): Promise<void> {
  const telephone = normalizePhone(input.telephone);
  const existing = await findByTelephone(telephone);
  if (existing && existing !== id) throw new DoublonError(existing);
  await sql`
    update prospects set ${sql({
      entreprise: input.entreprise.trim(),
      secteur: input.secteur?.trim() ?? "",
      interlocuteur: input.interlocuteur?.trim() ?? "",
      telephone,
      email: input.email?.trim() ?? "",
      ville: input.ville?.trim() ?? "",
      adresse: input.adresse?.trim() ?? "",
      site_web: input.site_web?.trim() ?? "",
      site_etat: input.site_etat ?? "inconnu",
      statut: input.statut ?? "a_appeler",
      prochaine_relance: input.prochaine_relance || null,
      notes: input.notes?.trim() ?? "",
    })}
    where id = ${id}`;
}

export async function getProspect(id: string): Promise<Prospect | null> {
  if (!/^\d+$/.test(id)) return null;
  const [row] = await sql<Prospect[]>`select * from prospects where id = ${id}`;
  return row ?? null;
}

export async function getAppels(prospectId: string): Promise<Appel[]> {
  return sql<Appel[]>`select * from appels where prospect_id = ${prospectId} order by date desc`;
}

export type Filtres = { statut?: string; secteur?: string; q?: string };

export async function listProspects(f: Filtres, limit = 200): Promise<Prospect[]> {
  const q = f.q?.trim();
  const qPhone = q ? normalizePhone(q) : null;
  return sql<Prospect[]>`
    select * from prospects
    where true
      ${f.statut ? sql`and statut = ${f.statut}` : sql``}
      ${f.secteur ? sql`and secteur = ${f.secteur}` : sql``}
      ${
        q
          ? sql`and (entreprise ilike ${"%" + q + "%"}
                 or interlocuteur ilike ${"%" + q + "%"}
                 or ville ilike ${"%" + q + "%"}
                 ${qPhone && qPhone.length >= 4 ? sql`or telephone like ${"%" + qPhone.slice(-9) + "%"}` : sql``})`
          : sql``
      }
    order by updated_at desc
    limit ${limit}`;
}

export async function listSecteurs(): Promise<string[]> {
  const rows = await sql<{ secteur: string }[]>`
    select distinct secteur from prospects where secteur <> '' order by secteur`;
  return rows.map((r) => r.secteur);
}

/** La vue du matin : rappels dus, rendez-vous à venir, et nouveaux numéros à appeler. */
export async function vueDuJour(today = todayParis(), nbNouveaux = 30) {
  const [relances, rdvs, nouveaux, [{ count: resteAAppeler }]] = await Promise.all([
    sql<Prospect[]>`
      select * from prospects
      where prochaine_relance <= ${today}
        and statut not in ('refuse', 'client', 'rdv_pris')
      order by prochaine_relance, statut = 'rappel_demande' desc, dernier_appel nulls first`,
    sql<Prospect[]>`
      select * from prospects
      where statut = 'rdv_pris' and (rdv_date is null or rdv_date >= ${today}::date)
      order by rdv_date nulls last`,
    sql<Prospect[]>`
      select * from prospects
      where statut = 'a_appeler' and (prochaine_relance is null or prochaine_relance <= ${today})
        and nb_tentatives = 0
      order by note_google desc nulls last, nb_avis desc nulls last, created_at
      limit ${nbNouveaux}`,
    sql<{ count: string }[]>`
      select count(*) from prospects where statut = 'a_appeler' and nb_tentatives = 0`,
  ]);
  return { relances, rdvs, nouveaux, resteAAppeler: Number(resteAAppeler) };
}

export type AppelInput = {
  issue: Issue;
  notes?: string;
  /** YYYY-MM-DD. Par défaut : jour ouvré suivant pour « pas de réponse » et « rappel ». */
  prochaine_relance?: string | null;
  /** Valeur d'un input datetime-local (heure de Paris), pour l'issue « rdv_pris ». */
  rdv_date?: string | null;
  interlocuteur?: string;
};

export async function enregistrerAppel(prospectId: string, input: AppelInput): Promise<void> {
  const { decroche } = ISSUES[input.issue];
  const today = todayParis();
  let relance: string | null = null;
  if (input.issue === "pas_de_reponse" || input.issue === "rappel_demande") {
    relance = input.prochaine_relance || nextBusinessDay(today);
  }
  const rdv = input.issue === "rdv_pris" ? input.rdv_date || null : null;
  const notes = input.notes?.trim() ?? "";

  await sql.begin(async (tx) => {
    await tx`
      insert into appels (prospect_id, issue, decroche, notes)
      values (${prospectId}, ${input.issue}, ${decroche}, ${notes})`;
    await tx`
      update prospects set
        statut = ${input.issue},
        nb_tentatives = nb_tentatives + 1,
        dernier_appel = now(),
        prochaine_relance = ${relance},
        ${
          input.issue === "rdv_pris"
            ? tx`rdv_date = ${rdv}::timestamp at time zone 'Europe/Paris', site_pret = false,`
            : tx``
        }
        ${input.interlocuteur?.trim() ? tx`interlocuteur = ${input.interlocuteur.trim()},` : tx``}
        updated_at = now()
      where id = ${prospectId}`;
  });
}

export async function setSitePret(prospectId: string, pret: boolean): Promise<void> {
  await sql`update prospects set site_pret = ${pret} where id = ${prospectId}`;
}

export async function marquerClient(prospectId: string, montant: number | null): Promise<void> {
  await sql`
    update prospects set statut = 'client', montant = ${montant}, converti_le = now(),
      prochaine_relance = null
    where id = ${prospectId}`;
}

export async function supprimerProspect(prospectId: string): Promise<void> {
  await sql`delete from prospects where id = ${prospectId}`;
}

export type ImportResult = { ajoutes: number; doublons: number };

/** Insère les leads en statut « à appeler », en ignorant les numéros déjà présents. */
export async function importerLeads(leads: LeadImport[], source = "import"): Promise<ImportResult> {
  // Dédoublonnage dans le fichier lui-même (par téléphone), avant la base.
  const vus = new Set<string>();
  const uniques = leads.filter((l) => {
    if (!l.telephone) return true;
    if (vus.has(l.telephone)) return false;
    vus.add(l.telephone);
    return true;
  });
  let ajoutes = 0;
  const lot = 500;
  for (let i = 0; i < uniques.length; i += lot) {
    const rows = uniques.slice(i, i + lot).map((l) => ({ ...l, source }));
    const inserted = await sql`
      insert into prospects ${sql(rows)}
      on conflict (telephone) do nothing
      returning id`;
    ajoutes += inserted.length;
  }
  return { ajoutes, doublons: leads.length - ajoutes };
}
