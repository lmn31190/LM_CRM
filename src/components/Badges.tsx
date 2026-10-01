import { SITE_ETATS, STATUTS, type SiteEtat, type Statut } from "@/modules/crm/statuts";

export function BadgeStatut({ statut }: { statut: Statut }) {
  return <span className={`badge ${statut}`}>{STATUTS[statut]}</span>;
}

export function SiteInfo({ url, etat }: { url: string; etat: SiteEtat }) {
  if (!url) return <span className="muted small">{SITE_ETATS[etat]}</span>;
  const href = /^https?:\/\//.test(url) ? url : `https://${url}`;
  return (
    <span className="small">
      <a href={href} target="_blank" rel="noreferrer noopener">
        {url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 40)}
      </a>{" "}
      {etat !== "ok" && etat !== "inconnu" && <span className="muted">({SITE_ETATS[etat]})</span>}
    </span>
  );
}
