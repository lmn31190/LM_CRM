import { notFound } from "next/navigation";
import { marquerClientAction, sitePretAction, supprimerProspectAction } from "@/app/actions";
import { AppelForm } from "@/components/AppelForm";
import { BadgeStatut, SiteInfo } from "@/components/Badges";
import { ProspectForm } from "@/components/ProspectForm";
import { Tel } from "@/components/Tel";
import { formatDate, formatDateTime, nextBusinessDay, todayParis } from "@/modules/crm/dates";
import { displayPhone } from "@/modules/crm/phone";
import { getAppels, getProspect, listSecteurs } from "@/modules/crm/repository";
import { ISSUES } from "@/modules/crm/statuts";
import { euros } from "@/modules/crm/stats";

export default async function FicheProspect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await getProspect(id);
  if (!p) notFound();
  const [appels, secteurs] = await Promise.all([getAppels(id), listSecteurs()]);

  return (
    <>
      <h1 style={{ marginBottom: ".25rem" }}>{p.entreprise}</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        {[p.interlocuteur, p.secteur, p.categorie, p.ville].filter(Boolean).join(" · ")}
      </p>

      <div className="grid2">
        <div className="card">
          <p style={{ fontSize: "1.3rem", margin: "0 0 .5rem" }}>
            <Tel numero={p.telephone} />
          </p>
          <p style={{ margin: ".25rem 0" }}>
            <BadgeStatut statut={p.statut} /> · {p.nb_tentatives} tentative(s)
            {p.dernier_appel && <> · dernier appel {formatDateTime(p.dernier_appel)}</>}
          </p>
          {p.prochaine_relance && <p style={{ margin: ".25rem 0" }}>Relance : <strong>{formatDate(p.prochaine_relance)}</strong></p>}
          <p style={{ margin: ".25rem 0" }}>Site : <SiteInfo url={p.site_web} etat={p.site_etat} /></p>
          {p.email && <p style={{ margin: ".25rem 0" }}>E-mail : <a href={`mailto:${p.email}`}>{p.email}</a></p>}
          {p.adresse && <p className="small muted" style={{ margin: ".25rem 0" }}>{p.adresse}</p>}
          {p.note_google && (
            <p className="small muted" style={{ margin: ".25rem 0" }}>
              Google : {p.note_google} ★ ({p.nb_avis ?? 0} avis)
            </p>
          )}
          {p.notes && <p style={{ whiteSpace: "pre-wrap" }}>{p.notes}</p>}
        </div>

        <div className="card">
          {p.statut === "rdv_pris" && (
            <div className={`alerte ${p.site_pret ? "ok" : "warn"}`}>
              Rendez-vous : <strong>{formatDateTime(p.rdv_date) || "date à fixer"}</strong>
              <br />
              {p.site_pret ? "Site prêt ✔" : "Site à préparer avant le rendez-vous"}
              <form action={sitePretAction} style={{ marginTop: ".4rem" }}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="pret" value={p.site_pret ? "0" : "1"} />
                <button className="petit">{p.site_pret ? "Marquer « à préparer »" : "Marquer le site comme prêt"}</button>
              </form>
            </div>
          )}
          {p.statut === "client" ? (
            <div className="alerte ok">
              Client depuis le {formatDate(p.converti_le)}
              {p.montant && <> · {euros(Number(p.montant))}</>}
            </div>
          ) : (
            <>
              <h2 style={{ marginTop: 0 }}>Enregistrer un appel</h2>
              <AppelForm
                id={p.id}
                retour="/"
                relanceParDefaut={nextBusinessDay(todayParis())}
                interlocuteur={p.interlocuteur}
              />
            </>
          )}
        </div>
      </div>

      {p.statut !== "client" && (
        <form action={marquerClientAction} className="inline" style={{ marginTop: "1rem" }}>
          <input type="hidden" name="id" value={p.id} />
          <label>
            Montant de la vente (€)
            <input name="montant" inputMode="decimal" defaultValue="500" style={{ width: 120 }} />
          </label>
          <button type="submit">Vente conclue → client</button>
        </form>
      )}

      <h2>Historique des appels</h2>
      {appels.length === 0 ? (
        <div className="vide">Aucun appel enregistré.</div>
      ) : (
        <table>
          <tbody>
            {appels.map((a) => (
              <tr key={a.id}>
                <td className="small" style={{ whiteSpace: "nowrap" }}>{formatDateTime(a.date)}</td>
                <td className="small">{ISSUES[a.issue].label}</td>
                <td className="small" style={{ whiteSpace: "pre-wrap" }}>{a.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <details style={{ marginTop: "1.5rem" }}>
        <summary>Modifier la fiche</summary>
        <div className="card">
          <ProspectForm
            mode="modifier"
            id={p.id}
            secteurs={secteurs}
            initial={{
              entreprise: p.entreprise,
              secteur: p.secteur,
              interlocuteur: p.interlocuteur,
              telephone: displayPhone(p.telephone),
              email: p.email,
              ville: p.ville,
              adresse: p.adresse,
              site_web: p.site_web,
              site_etat: p.site_etat,
              statut: p.statut,
              prochaine_relance: p.prochaine_relance ?? "",
              notes: p.notes,
            }}
          />
        </div>
        <form action={supprimerProspectAction} style={{ marginTop: "1rem" }}>
          <input type="hidden" name="id" value={p.id} />
          <button className="danger petit">Supprimer ce prospect</button>
        </form>
      </details>
      <p className="muted small">Source : {p.source} · créé le {formatDate(p.created_at)}</p>
    </>
  );
}
