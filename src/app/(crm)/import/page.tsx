import { ImportForm } from "@/components/ImportForm";
import { listSecteurs } from "@/modules/crm/repository";
import { SECTEURS_SUGGERES } from "@/modules/crm/statuts";

export default async function Import() {
  const secteurs = [...new Set([...SECTEURS_SUGGERES, ...(await listSecteurs())])];
  return (
    <>
      <h1>Importer des leads</h1>
      <div className="card">
        <ImportForm secteurs={secteurs} />
      </div>
      <h2>Format attendu</h2>
      <p>
        Un CSV (séparateur virgule ou point-virgule) avec une ligne d&apos;en-têtes. Seule la colonne{" "}
        <code>entreprise</code> (ou <code>nom</code>) est obligatoire. Colonnes reconnues :{" "}
        <code>entreprise, secteur, telephone, email, ville, adresse, site_web, site_etat, categorie, note_google, nb_avis</code>.
      </p>
      <p>
        Les prospects arrivent avec le statut « À appeler ». Les numéros déjà présents dans le CRM (ou en double
        dans le fichier) sont ignorés.
      </p>
      <p className="muted small">
        Le script de collecte Google Places (<code>leads/places_leads.py</code>) produit directement ce format, ou
        écrit dans la base sans passer par ici (option <code>--crm</code>).
      </p>
    </>
  );
}
