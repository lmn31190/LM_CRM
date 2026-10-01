import { NavPrincipale } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavPrincipale />
      <main>{children}</main>
    </>
  );
}
