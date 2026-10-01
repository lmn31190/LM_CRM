import Link from "next/link";

export function NavPrincipale() {
  return (
    <nav className="top">
      <Link href="/" className="brand">LM CRM</Link>
      <Link href="/" className="lien">Aujourd&apos;hui</Link>
      <Link href="/prospects" className="lien">Prospects</Link>
      <Link href="/import" className="lien">Import</Link>
      <Link href="/indicateurs" className="lien">Indicateurs</Link>
      <Link href="/prospects/nouveau" className="btn primary cta">+ Prospect</Link>
    </nav>
  );
}
