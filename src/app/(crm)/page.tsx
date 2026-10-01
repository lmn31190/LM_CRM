import Link from "next/link";
import { ListeProspects } from "@/components/ListeProspects";
import { formatDate, todayParis } from "@/modules/crm/dates";
import { vueDuJour } from "@/modules/crm/repository";
import { appelsAujourdhui } from "@/modules/crm/stats-repository";

const OBJECTIF_APPELS_JOUR = Number(process.env.OBJECTIF_APPELS_JOUR) || 20;

export default async function Aujourdhui() {
  const today = todayParis();
  const [{ relances, rdvs, nouveaux, resteAAppeler }, faits] = await Promise.all([
    vueDuJour(today),
    appelsAujourdhui(today),
  ]);
  const sitesAPreparer = rdvs.filter((p) => !p.site_pret).length;

  return (
    <>
      <h1>Aujourd&apos;hui · {formatDate(today)}</h1>
      <div className="kpis">
        <div className="kpi">
          <div className="val">{faits} / {OBJECTIF_APPELS_JOUR}</div>
          <div className="lib">appels passés aujourd&apos;hui</div>
        </div>
        <div className="kpi">
          <div className="val">{relances.length}</div>
          <div className="lib">relances à faire</div>
        </div>
        <div className="kpi">
          <div className="val">{rdvs.length}</div>
          <div className="lib">rendez-vous à venir</div>
        </div>
        <div className="kpi">
          <div className="val">{sitesAPreparer}</div>
          <div className="lib">sites à préparer</div>
        </div>
      </div>

      <h2>Rendez-vous à venir</h2>
      <ListeProspects prospects={rdvs} colonneDate="rdv" />

      <h2>À rappeler aujourd&apos;hui ({relances.length})</h2>
      <ListeProspects prospects={relances} actionRapide />

      <h2>
        Nouveaux numéros à appeler{" "}
        <span className="muted small">
          ({nouveaux.length} affichés sur {resteAAppeler} en attente ·{" "}
          <Link href="/prospects?statut=a_appeler">tout voir</Link>)
        </span>
      </h2>
      {resteAAppeler === 0 ? (
        <div className="vide">
          Plus aucun numéro en attente. <Link href="/import">Importer des leads</Link> ou{" "}
          <Link href="/prospects/nouveau">ajouter un prospect</Link>.
        </div>
      ) : (
        <ListeProspects prospects={nouveaux} actionRapide />
      )}
    </>
  );
}
