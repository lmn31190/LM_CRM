"use client";

import { useActionState } from "react";
import { importerCsvAction, type FormState } from "@/app/actions";

export function ImportForm({ secteurs }: { secteurs: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(importerCsvAction, {});
  return (
    <form action={action} className="stack">
      {state.ok && <div className="alerte ok">{state.ok}</div>}
      {state.erreur && <div className="alerte erreur">{state.erreur}</div>}
      <div className="inline">
        <label>
          Fichier CSV
          <input type="file" name="fichier" accept=".csv,text/csv" required />
        </label>
        <label>
          Secteur (si absent du fichier)
          <input name="secteur" list="secteurs-import" />
        </label>
        <datalist id="secteurs-import">
          {secteurs.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button type="submit" className="primary" disabled={pending}>
          {pending ? "Import en cours..." : "Importer"}
        </button>
      </div>
    </form>
  );
}
