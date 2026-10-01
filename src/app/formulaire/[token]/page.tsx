import { notFound } from "next/navigation";
import { ProspectForm } from "@/components/ProspectForm";
import { formTokenValide } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function FormulairePublic({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!formTokenValide(token)) notFound();
  return (
    <main style={{ maxWidth: 640 }}>
      <h1>Ajouter un prospect · LM DIGITAL</h1>
      <p className="muted">
        Renseignez le commerce et son numéro : il sera ajouté directement à la liste d&apos;appels.
      </p>
      <div className="card">
        <ProspectForm mode="public" token={token} />
      </div>
    </main>
  );
}
