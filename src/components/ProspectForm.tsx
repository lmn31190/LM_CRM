"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  creerProspectAction,
  formulairePublicAction,
  modifierProspectAction,
  type FormState,
} from "@/app/actions";
import { SECTEURS_SUGGERES, SITE_ETATS, STATUTS } from "@/modules/crm/statuts";

export type ValeursProspect = Partial<Record<string, string>>;

type Props =
  | { mode: "creer"; secteurs: string[] }
  | { mode: "modifier"; secteurs: string[]; id: string; initial: ValeursProspect }
  | { mode: "public"; token: string };

const ACTIONS = {
  creer: creerProspectAction,
  modifier: modifierProspectAction,
  public: formulairePublicAction,
};

export function ProspectForm(props: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(ACTIONS[props.mode], {});
  const initial = props.mode === "modifier" ? props.initial : {};
  // Après une erreur, on réaffiche ce qui avait été saisi.
  const v = (k: string) => state.valeurs?.[k] ?? initial[k] ?? "";
  // La clé force le remontage du formulaire (et donc des defaultValue) à chaque réponse.
  const cle = JSON.stringify(state);
  const secteurs = props.mode === "public" ? SECTEURS_SUGGERES : [...new Set([...SECTEURS_SUGGERES, ...props.secteurs])];
  const complet = props.mode !== "public";

  return (
    <form action={action} className="stack" key={cle}>
      {state.ok && <div className="alerte ok">{state.ok}</div>}
      {state.erreur && (
        <div className="alerte erreur">
          {state.erreur}{" "}
          {state.doublonId && complet && <Link href={`/prospects/${state.doublonId}`}>Voir la fiche existante</Link>}
        </div>
      )}
      {props.mode === "modifier" && <input type="hidden" name="id" value={props.id} />}
      {props.mode === "public" && <input type="hidden" name="token" value={props.token} />}

      <div className="champs">
        <label>
          Entreprise *
          <input name="entreprise" required defaultValue={v("entreprise")} autoFocus={props.mode !== "modifier"} />
        </label>
        <label>
          Téléphone{props.mode === "public" ? " *" : ""}
          <input name="telephone" type="tel" required={props.mode === "public"} defaultValue={v("telephone")} />
        </label>
        <label>
          Secteur
          <input name="secteur" list="secteurs" defaultValue={v("secteur")} />
        </label>
        <label>
          Interlocuteur (gérant·e)
          <input name="interlocuteur" defaultValue={v("interlocuteur")} />
        </label>
        <label>
          Ville
          <input name="ville" defaultValue={v("ville")} />
        </label>
        <label>
          E-mail
          <input name="email" type="email" defaultValue={v("email")} />
        </label>
        <label>
          Site web actuel
          <input name="site_web" placeholder="vide si aucun" defaultValue={v("site_web")} />
        </label>
        {complet && (
          <>
            <label>
              État du site
              <select name="site_etat" defaultValue={v("site_etat") || "inconnu"}>
                {Object.entries(SITE_ETATS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </label>
            <label>
              Adresse
              <input name="adresse" defaultValue={v("adresse")} />
            </label>
            <label>
              Statut
              <select name="statut" defaultValue={v("statut") || "a_appeler"}>
                {Object.entries(STATUTS).map(([k, l]) => (
                  <option key={k} value={k}>{l}</option>
                ))}
              </select>
            </label>
            <label>
              Prochaine relance
              <input name="prochaine_relance" type="date" defaultValue={v("prochaine_relance")} />
            </label>
          </>
        )}
      </div>
      <label>
        Notes
        <textarea name="notes" placeholder="ex. rappeler après 18 h" defaultValue={v("notes")} />
      </label>
      <datalist id="secteurs">
        {secteurs.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="inline">
        <button type="submit" className="primary" disabled={pending}>
          {props.mode === "modifier" ? "Enregistrer" : props.mode === "public" ? "Envoyer" : "Ajouter et ouvrir la fiche"}
        </button>
        {props.mode === "creer" && (
          <button type="submit" name="suivant" value="1" disabled={pending}>
            Ajouter et saisir le suivant
          </button>
        )}
      </div>
    </form>
  );
}
