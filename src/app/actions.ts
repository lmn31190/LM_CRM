"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { csvToLeads } from "@/modules/crm/csv";
import {
  createProspect,
  DoublonError,
  enregistrerAppel,
  importerLeads,
  marquerClient,
  setSitePret,
  supprimerProspect,
  updateProspect,
  type ProspectInput,
} from "@/modules/crm/repository";
import { isIssue, isSiteEtat, isStatut } from "@/modules/crm/statuts";
import { formTokenValide } from "@/lib/auth";

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};

function lireProspect(fd: FormData): ProspectInput {
  const statut = str(fd, "statut");
  const siteEtat = str(fd, "site_etat");
  return {
    entreprise: str(fd, "entreprise"),
    secteur: str(fd, "secteur"),
    interlocuteur: str(fd, "interlocuteur"),
    telephone: str(fd, "telephone"),
    email: str(fd, "email"),
    ville: str(fd, "ville"),
    adresse: str(fd, "adresse"),
    site_web: str(fd, "site_web"),
    site_etat: isSiteEtat(siteEtat) ? siteEtat : undefined,
    statut: isStatut(statut) ? statut : undefined,
    prochaine_relance: str(fd, "prochaine_relance") || null,
    notes: str(fd, "notes"),
  };
}

export type FormState = {
  erreur?: string;
  doublonId?: string;
  ok?: string;
  valeurs?: Record<string, string>;
};

function valeurs(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  return out;
}

export async function creerProspectAction(_: FormState, fd: FormData): Promise<FormState> {
  const input = lireProspect(fd);
  if (!input.entreprise) return { erreur: "Le nom de l'entreprise est obligatoire.", valeurs: valeurs(fd) };
  let id: string;
  try {
    id = await createProspect({ ...input, source: "manuel" });
  } catch (e) {
    if (e instanceof DoublonError) {
      return { erreur: e.message, doublonId: e.existingId, valeurs: valeurs(fd) };
    }
    throw e;
  }
  revalidatePath("/", "layout");
  if (str(fd, "suivant") === "1") return { ok: `« ${input.entreprise} » ajouté.` };
  redirect(`/prospects/${id}`);
}

export async function modifierProspectAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id");
  const input = lireProspect(fd);
  if (!input.entreprise) return { erreur: "Le nom de l'entreprise est obligatoire.", valeurs: valeurs(fd) };
  try {
    await updateProspect(id, input);
  } catch (e) {
    if (e instanceof DoublonError) {
      return { erreur: e.message, doublonId: e.existingId, valeurs: valeurs(fd) };
    }
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: "Fiche enregistrée." };
}

/** Formulaire public (lien partagé à un tiers) : protégé par le jeton dans l'URL. */
export async function formulairePublicAction(_: FormState, fd: FormData): Promise<FormState> {
  if (!formTokenValide(str(fd, "token"))) return { erreur: "Lien invalide ou expiré." };
  const input = lireProspect(fd);
  if (!input.entreprise || !input.telephone) {
    return { erreur: "Le nom de l'entreprise et le téléphone sont obligatoires.", valeurs: valeurs(fd) };
  }
  try {
    await createProspect({
      entreprise: input.entreprise,
      secteur: input.secteur,
      interlocuteur: input.interlocuteur,
      telephone: input.telephone,
      email: input.email,
      ville: input.ville,
      site_web: input.site_web,
      notes: input.notes,
      source: "formulaire",
    });
  } catch (e) {
    if (e instanceof DoublonError) {
      return { erreur: "Ce numéro est déjà enregistré, merci !", valeurs: {} };
    }
    throw e;
  }
  revalidatePath("/", "layout");
  return { ok: `Merci, « ${input.entreprise} » a bien été ajouté.` };
}

export async function enregistrerAppelAction(fd: FormData): Promise<void> {
  const id = str(fd, "id");
  const issue = str(fd, "issue");
  if (!isIssue(issue)) throw new Error("Issue d'appel invalide");
  await enregistrerAppel(id, {
    issue,
    notes: str(fd, "notes"),
    prochaine_relance: str(fd, "prochaine_relance") || null,
    rdv_date: str(fd, "rdv_date") || null,
    interlocuteur: str(fd, "interlocuteur"),
  });
  revalidatePath("/", "layout");
  const retour = str(fd, "retour");
  if (retour.startsWith("/")) redirect(retour);
}

export async function sitePretAction(fd: FormData): Promise<void> {
  await setSitePret(str(fd, "id"), str(fd, "pret") === "1");
  revalidatePath("/", "layout");
}

export async function marquerClientAction(fd: FormData): Promise<void> {
  const montant = Number(str(fd, "montant").replace(",", "."));
  await marquerClient(str(fd, "id"), Number.isFinite(montant) && montant > 0 ? montant : null);
  revalidatePath("/", "layout");
}

export async function supprimerProspectAction(fd: FormData): Promise<void> {
  await supprimerProspect(str(fd, "id"));
  revalidatePath("/", "layout");
  redirect("/prospects");
}

export async function importerCsvAction(_: FormState, fd: FormData): Promise<FormState> {
  const fichier = fd.get("fichier");
  if (!(fichier instanceof File) || fichier.size === 0) return { erreur: "Choisis un fichier CSV." };
  if (fichier.size > 10 * 1024 * 1024) return { erreur: "Fichier trop lourd (10 Mo max)." };
  const { leads, ignorees, erreur } = csvToLeads(await fichier.text(), str(fd, "secteur"));
  if (erreur) return { erreur };
  const sansTel = leads.filter((l) => !l.telephone).length;
  const { ajoutes, doublons } = await importerLeads(leads, "import");
  revalidatePath("/", "layout");
  return {
    ok:
      `${ajoutes} prospect(s) ajouté(s), ${doublons} doublon(s) ignoré(s)` +
      (ignorees ? `, ${ignorees} ligne(s) sans nom ignorée(s)` : "") +
      (sansTel ? `. Attention : ${sansTel} ligne(s) sans téléphone.` : "."),
  };
}
