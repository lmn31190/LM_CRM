import { displayPhone } from "@/modules/crm/phone";

export function Tel({ numero }: { numero: string | null }) {
  if (!numero) return <span className="muted small">pas de numéro</span>;
  return (
    <a className="tel" href={`tel:${numero}`}>
      {displayPhone(numero)}
    </a>
  );
}
