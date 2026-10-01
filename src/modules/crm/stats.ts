// Indicateurs : remplacent les taux moyens du brief par les vrais chiffres de Louis.

export type Compteurs = {
  appels: number;
  decroches: number;
  rdv: number;
  ventes: number;
  ca: number;
};

export type Taux = {
  decroche: number | null; // décrochés / appels
  appelVersRdv: number | null; // RDV / appels
  rdvVersVente: number | null; // ventes / RDV
  appelVersVente: number | null; // ventes / appels
};

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export function calculerTaux(c: Compteurs): Taux {
  return {
    decroche: ratio(c.decroches, c.appels),
    appelVersRdv: ratio(c.rdv, c.appels),
    rdvVersVente: ratio(c.ventes, c.rdv),
    appelVersVente: ratio(c.ventes, c.appels),
  };
}

// Hypothèses du brief (scénario « moyen ») tant qu'il n'y a pas assez de données réelles.
export const TAUX_PAR_DEFAUT = { appelVersRdv: 0.03, rdvVersVente: 0.2 };
// En dessous de ces volumes, les taux réels sont trop bruités pour planifier.
export const SEUIL_APPELS = 100;
export const SEUIL_RDV = 5;

export const COTISATIONS_URSSAF = 0.212; // BIC prestations de services, 2026

export type Projection = {
  objectifVentes: number;
  appelVersRdv: number;
  rdvVersVente: number;
  sourceAppelVersRdv: "réel" | "hypothèse";
  sourceRdvVersVente: "réel" | "hypothèse";
  rdvNecessaires: number;
  appelsNecessaires: number;
  appelsParJour: number;
};

/** Combien d'appels pour atteindre l'objectif de ventes, avec les taux réels dès qu'ils sont fiables. */
export function projeter(c: Compteurs, objectifVentes: number, joursOuvres = 22): Projection {
  const t = calculerTaux(c);
  const reelRdv = c.appels >= SEUIL_APPELS && t.appelVersRdv !== null && t.appelVersRdv > 0;
  const reelVente = c.rdv >= SEUIL_RDV && t.rdvVersVente !== null && t.rdvVersVente > 0;
  const appelVersRdv = reelRdv ? t.appelVersRdv! : TAUX_PAR_DEFAUT.appelVersRdv;
  const rdvVersVente = reelVente ? t.rdvVersVente! : TAUX_PAR_DEFAUT.rdvVersVente;
  const rdvNecessaires = Math.ceil(objectifVentes / rdvVersVente);
  const appelsNecessaires = Math.ceil(rdvNecessaires / appelVersRdv);
  return {
    objectifVentes,
    appelVersRdv,
    rdvVersVente,
    sourceAppelVersRdv: reelRdv ? "réel" : "hypothèse",
    sourceRdvVersVente: reelVente ? "réel" : "hypothèse",
    rdvNecessaires,
    appelsNecessaires,
    appelsParJour: Math.ceil(appelsNecessaires / joursOuvres),
  };
}

export function pourcent(x: number | null): string {
  return x === null ? "—" : `${(x * 100).toFixed(1).replace(".", ",")} %`;
}

export function euros(x: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(x);
}
