// Lecture des CSV d'import (export du module leads, Pages Jaunes, tableur...).
// Accepte « , » ou « ; » comme séparateur (Excel FR) et des en-têtes souples.

import { normalizePhone } from "./phone";
import { isSiteEtat, type SiteEtat } from "./statuts";

export function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

export type LeadImport = {
  entreprise: string;
  secteur: string;
  telephone: string | null;
  email: string;
  ville: string;
  adresse: string;
  site_web: string;
  site_etat: SiteEtat;
  categorie: string;
  note_google: number | null;
  nb_avis: number | null;
};

const ALIASES: Record<keyof LeadImport, string[]> = {
  entreprise: ["entreprise", "nom", "name", "raison sociale", "societe"],
  secteur: ["secteur"],
  telephone: ["telephone", "tel", "phone", "numero"],
  email: ["email", "e-mail", "mail"],
  ville: ["ville", "city", "commune"],
  adresse: ["adresse", "address"],
  site_web: ["site_web", "site web", "site", "website", "url"],
  site_etat: ["site_etat", "etat site", "etat_site"],
  categorie: ["categorie", "category", "type"],
  note_google: ["note_google", "note", "rating"],
  nb_avis: ["nb_avis", "avis", "reviews", "nombre d'avis"],
};

function normHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function toNumber(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v.replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

export type CsvResult = { leads: LeadImport[]; ignorees: number; erreur?: string };

/** Convertit un CSV en leads. `secteurParDefaut` s'applique aux lignes sans secteur. */
export function csvToLeads(text: string, secteurParDefaut = ""): CsvResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { leads: [], ignorees: 0, erreur: "Fichier vide ou sans ligne de données." };
  const headers = rows[0].map(normHeader);
  const col = {} as Record<keyof LeadImport, number>;
  for (const [key, names] of Object.entries(ALIASES) as [keyof LeadImport, string[]][]) {
    col[key] = headers.findIndex((h) => names.includes(h));
  }
  if (col.entreprise < 0) {
    return { leads: [], ignorees: 0, erreur: "Colonne « entreprise » (ou « nom ») introuvable." };
  }
  const get = (r: string[], k: keyof LeadImport) => (col[k] >= 0 ? (r[col[k]] ?? "").trim() : "");

  const leads: LeadImport[] = [];
  let ignorees = 0;
  for (const r of rows.slice(1)) {
    const entreprise = get(r, "entreprise");
    if (!entreprise) {
      ignorees++;
      continue;
    }
    const site_web = get(r, "site_web");
    const etat = get(r, "site_etat").toLowerCase();
    const nbAvis = toNumber(get(r, "nb_avis"));
    leads.push({
      entreprise,
      secteur: get(r, "secteur") || secteurParDefaut,
      telephone: normalizePhone(get(r, "telephone")),
      email: get(r, "email"),
      ville: get(r, "ville"),
      adresse: get(r, "adresse"),
      site_web,
      site_etat: isSiteEtat(etat) ? etat : site_web ? "inconnu" : "aucun",
      categorie: get(r, "categorie"),
      note_google: toNumber(get(r, "note_google")),
      nb_avis: nbAvis === null ? null : Math.round(nbAvis),
    });
  }
  return { leads, ignorees };
}
