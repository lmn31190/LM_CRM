import { ListeProspects } from "@/components/ListeProspects";
import { listProspects, listSecteurs } from "@/modules/crm/repository";
import { STATUTS } from "@/modules/crm/statuts";

type SP = Promise<{ statut?: string; secteur?: string; q?: string }>;

export default async function Prospects({ searchParams }: { searchParams: SP }) {
  const f = await searchParams;
  const [prospects, secteurs] = await Promise.all([listProspects(f), listSecteurs()]);
  return (
    <>
      <h1>Prospects</h1>
      <form className="inline card" style={{ marginBottom: "1rem" }}>
        <label>
          Recherche
          <input name="q" defaultValue={f.q} placeholder="nom, ville, téléphone" />
        </label>
        <label>
          Statut
          <select name="statut" defaultValue={f.statut ?? ""}>
            <option value="">Tous</option>
            {Object.entries(STATUTS).map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        </label>
        <label>
          Secteur
          <select name="secteur" defaultValue={f.secteur ?? ""}>
            <option value="">Tous</option>
            {secteurs.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <button type="submit">Filtrer</button>
      </form>
      <p className="muted small">{prospects.length === 200 ? "200 premiers résultats" : `${prospects.length} résultat(s)`}</p>
      <ListeProspects prospects={prospects} colonneDate="maj" />
    </>
  );
}
