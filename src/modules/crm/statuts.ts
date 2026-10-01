export const STATUTS = {
  a_appeler: "À appeler",
  pas_de_reponse: "Pas de réponse",
  rappel_demande: "Rappel demandé",
  rdv_pris: "Rendez-vous pris",
  refuse: "Refusé",
  client: "Converti en client",
} as const;

export type Statut = keyof typeof STATUTS;

// Statuts qui sortent le prospect du circuit d'appel.
export const STATUTS_FINAUX: Statut[] = ["refuse", "client"];

// Issue d'un appel -> statut résultant, et l'interlocuteur a-t-il décroché.
export const ISSUES = {
  pas_de_reponse: { label: "Pas de réponse / messagerie", decroche: false },
  rappel_demande: { label: "Décroché — rappel demandé", decroche: true },
  rdv_pris: { label: "Décroché — rendez-vous pris", decroche: true },
  refuse: { label: "Décroché — refus", decroche: true },
} as const;

export type Issue = keyof typeof ISSUES;

export const SITE_ETATS = {
  aucun: "Aucun site",
  "lien mort": "Lien mort",
  "reseau social": "Réseau social seulement",
  ok: "Site en ligne",
  inconnu: "Non vérifié",
} as const;

export type SiteEtat = keyof typeof SITE_ETATS;

// Secteurs ciblés (liste indicative, champ libre dans les formulaires).
export const SECTEURS_SUGGERES = [
  "Beauté / esthétique",
  "Massage / bien-être",
  "Coiffure",
  "Restaurant",
  "Commerce alimentaire",
  "Coach sportif",
];

export function isStatut(v: unknown): v is Statut {
  return typeof v === "string" && v in STATUTS;
}

export function isIssue(v: unknown): v is Issue {
  return typeof v === "string" && v in ISSUES;
}

export function isSiteEtat(v: unknown): v is SiteEtat {
  return typeof v === "string" && v in SITE_ETATS;
}
