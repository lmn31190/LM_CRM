"use client";

import { useState } from "react";
import { enregistrerAppelAction } from "@/app/actions";
import { ISSUES, type Issue } from "@/modules/crm/statuts";

type Props = { id: string; retour?: string; relanceParDefaut: string; interlocuteur: string };

/** Saisie rapide du résultat d'un appel, depuis la fiche prospect. */
export function AppelForm({ id, retour, relanceParDefaut, interlocuteur }: Props) {
  const [issue, setIssue] = useState<Issue>("pas_de_reponse");
  return (
    <form action={enregistrerAppelAction} className="stack">
      <input type="hidden" name="id" value={id} />
      {retour && <input type="hidden" name="retour" value={retour} />}
      <div className="actions-ligne" role="radiogroup">
        {(Object.entries(ISSUES) as [Issue, (typeof ISSUES)[Issue]][]).map(([k, { label }]) => (
          <label key={k} className={`btn${issue === k ? " primary" : ""}`} style={{ display: "inline-flex" }}>
            <input
              type="radio"
              name="issue"
              value={k}
              checked={issue === k}
              onChange={() => setIssue(k)}
              style={{ width: "auto", margin: 0 }}
            />
            {label}
          </label>
        ))}
      </div>
      <div className="inline">
        {(issue === "pas_de_reponse" || issue === "rappel_demande") && (
          <label>
            Relancer le
            <input type="date" name="prochaine_relance" defaultValue={relanceParDefaut} key={issue} />
          </label>
        )}
        {issue === "rdv_pris" && (
          <label>
            Rendez-vous le
            <input type="datetime-local" name="rdv_date" required />
          </label>
        )}
        {issue !== "pas_de_reponse" && (
          <label>
            Interlocuteur
            <input name="interlocuteur" defaultValue={interlocuteur} placeholder="Prénom du/de la gérant·e" />
          </label>
        )}
      </div>
      <label>
        Notes de l&apos;appel
        <textarea name="notes" placeholder="objections, disponibilités (« pas avant 18 h »), intérêt..." />
      </label>
      <div>
        <button type="submit" className="primary">Enregistrer l&apos;appel</button>
      </div>
    </form>
  );
}
