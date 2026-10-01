import { ProspectForm } from "@/components/ProspectForm";
import { listSecteurs } from "@/modules/crm/repository";

export default async function NouveauProspect() {
  const lienFormulaire = process.env.FORM_TOKEN ? `/formulaire/${process.env.FORM_TOKEN}` : null;
  return (
    <>
      <h1>Nouveau prospect</h1>
      <div className="card">
        <ProspectForm mode="creer" secteurs={await listSecteurs()} />
      </div>
      <p className="muted small">
        {lienFormulaire ? (
          <>
            Lien à transmettre à un tiers pour saisir des prospects sans accès au CRM :{" "}
            <a href={lienFormulaire}>{lienFormulaire}</a>
          </>
        ) : (
          "Définis FORM_TOKEN dans .env.local pour activer le formulaire partageable."
        )}
      </p>
    </>
  );
}
