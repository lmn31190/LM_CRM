import Link from "next/link";
import { addDays, todayParis } from "@/modules/crm/dates";
import { calculerTaux, COTISATIONS_URSSAF, euros, pourcent, projeter, SEUIL_APPELS, SEUIL_RDV } from "@/modules/crm/stats";
import { compteurs } from "@/modules/crm/stats-repository";

const PERIODES = {
  jour: "Aujourd'hui",
  semaine: "Cette semaine",
  mois: "Ce mois-ci",
  tout: "Depuis le début",
} as const;
type Periode = keyof typeof PERIODES;

function debutPeriode(p: Periode, today: string): string | null {
  if (p === "jour") return today;
  if (p === "semaine") {
    const dow = new Date(today + "T12:00:00Z").getUTCDay(); // 0 = dimanche
    return addDays(today, -((dow + 6) % 7));
  }
  if (p === "mois") return today.slice(0, 8) + "01";
  return null;
}

type SP = Promise<{ periode?: string; objectif?: string }>;

export default async function Indicateurs({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const periode: Periode = sp.periode && sp.periode in PERIODES ? (sp.periode as Periode) : "mois";
  const objectif = Math.max(1, Math.min(100, Number(sp.objectif) || 6));
  const today = todayParis();
  const [{ total, secteurs }, global] = await Promise.all([
    compteurs(debutPeriode(periode, today)),
    compteurs(null),
  ]);
  const t = calculerTaux(total);
  // La projection s'appuie sur tout l'historique, plus fiable qu'une seule période.
  const proj = projeter(global.total, objectif);

  return (
    <>
      <h1>Indicateurs</h1>
      <div className="actions-ligne" style={{ marginBottom: "1rem" }}>
        {(Object.keys(PERIODES) as Periode[]).map((p) => (
          <Link key={p} href={`?periode=${p}&objectif=${objectif}`} className={`btn petit${p === periode ? " primary" : ""}`}>
            {PERIODES[p]}
          </Link>
        ))}
      </div>

      <div className="kpis">
        <div className="kpi"><div className="val">{total.appels}</div><div className="lib">appels passés</div></div>
        <div className="kpi"><div className="val">{total.decroches}</div><div className="lib">décrochés · {pourcent(t.decroche)}</div></div>
        <div className="kpi"><div className="val">{total.rdv}</div><div className="lib">rendez-vous · {pourcent(t.appelVersRdv)} des appels</div></div>
        <div className="kpi"><div className="val">{total.ventes}</div><div className="lib">ventes · {pourcent(t.rdvVersVente)} des RDV</div></div>
        <div className="kpi">
          <div className="val">{euros(total.ca)}</div>
          <div className="lib">CA · dont {euros(total.ca * COTISATIONS_URSSAF)} de cotisations</div>
        </div>
      </div>

      <h2>Par secteur</h2>
      {secteurs.length === 0 ? (
        <div className="vide">Pas encore d&apos;appel sur cette période.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Secteur</th><th>Appels</th><th>Décrochés</th><th>RDV</th><th>Appel → RDV</th><th>Ventes</th><th>CA</th>
              </tr>
            </thead>
            <tbody>
              {secteurs.map((s) => {
                const ts = calculerTaux(s);
                return (
                  <tr key={s.secteur}>
                    <td>{s.secteur}</td>
                    <td>{s.appels}</td>
                    <td>{s.decroches} <span className="muted small">({pourcent(ts.decroche)})</span></td>
                    <td>{s.rdv}</td>
                    <td>{pourcent(ts.appelVersRdv)}</td>
                    <td>{s.ventes}</td>
                    <td>{euros(s.ca)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2>Combien d&apos;appels pour l&apos;objectif ?</h2>
      <div className="card">
        <form className="inline" style={{ marginBottom: ".75rem" }}>
          <input type="hidden" name="periode" value={periode} />
          <label>
            Objectif de ventes sur le mois
            <input name="objectif" type="number" min={1} max={100} defaultValue={objectif} style={{ width: 100 }} />
          </label>
          <button type="submit">Recalculer</button>
        </form>
        <p style={{ margin: 0 }}>
          Pour <strong>{proj.objectifVentes} ventes</strong> : {proj.rdvNecessaires} rendez-vous et{" "}
          <strong>{proj.appelsNecessaires} appels</strong>, soit environ <strong>{proj.appelsParJour} appels par jour</strong>{" "}
          sur 22 jours ouvrés.
        </p>
        <p className="muted small">
          Appel → RDV : {pourcent(proj.appelVersRdv)} ({proj.sourceAppelVersRdv}) · RDV → vente :{" "}
          {pourcent(proj.rdvVersVente)} ({proj.sourceRdvVersVente}). Les taux réels remplacent les hypothèses du brief
          (3 % et 20 %) à partir de {SEUIL_APPELS} appels et {SEUIL_RDV} rendez-vous enregistrés.
        </p>
      </div>
    </>
  );
}
