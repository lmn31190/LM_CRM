import Link from "next/link";
import { enregistrerAppelAction } from "@/app/actions";
import { formatDate, formatDateTime } from "@/modules/crm/dates";
import type { Prospect } from "@/modules/crm/repository";
import { BadgeStatut, SiteInfo } from "./Badges";
import { Tel } from "./Tel";

type Props = {
  prospects: Prospect[];
  /** Affiche le bouton « Pas de réponse » en un clic (vue du jour). */
  actionRapide?: boolean;
  colonneDate?: "relance" | "rdv" | "maj";
  retour?: string;
};

export function ListeProspects({ prospects, actionRapide, colonneDate = "relance", retour = "/" }: Props) {
  if (prospects.length === 0) return <div className="vide">Rien ici.</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Entreprise</th>
            <th>Téléphone</th>
            <th>Statut</th>
            <th>{colonneDate === "rdv" ? "Rendez-vous" : colonneDate === "maj" ? "Dernier appel" : "Relance"}</th>
            <th>Notes</th>
            {actionRapide && <th></th>}
          </tr>
        </thead>
        <tbody>
          {prospects.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/prospects/${p.id}`}><strong>{p.entreprise}</strong></Link>
                <div className="muted small">
                  {[p.interlocuteur, p.secteur, p.ville].filter(Boolean).join(" · ")}
                </div>
                <SiteInfo url={p.site_web} etat={p.site_etat} />
              </td>
              <td><Tel numero={p.telephone} /></td>
              <td>
                <BadgeStatut statut={p.statut} />
                {p.nb_tentatives > 0 && <div className="muted small">{p.nb_tentatives} tentative(s)</div>}
              </td>
              <td className="small">
                {colonneDate === "rdv" ? (
                  <>
                    {formatDateTime(p.rdv_date) || "date à fixer"}
                    <div>
                      {p.site_pret ? (
                        <span className="badge rdv_pris">site prêt</span>
                      ) : (
                        <span className="badge pas_de_reponse">site à préparer</span>
                      )}
                    </div>
                  </>
                ) : colonneDate === "maj" ? (
                  formatDateTime(p.dernier_appel)
                ) : (
                  formatDate(p.prochaine_relance)
                )}
              </td>
              <td className="small" style={{ maxWidth: 260 }}>{p.notes.slice(0, 140)}</td>
              {actionRapide && (
                <td>
                  <div className="actions-ligne">
                    <form action={enregistrerAppelAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="issue" value="pas_de_reponse" />
                      <input type="hidden" name="retour" value={retour} />
                      <button className="petit" title="Relance automatique au prochain jour ouvré">Pas de réponse</button>
                    </form>
                    <Link className="btn petit" href={`/prospects/${p.id}`}>Décroché →</Link>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
