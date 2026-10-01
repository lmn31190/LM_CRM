import { NextResponse, type NextRequest } from "next/server";

// Accès protégé par identifiant / mot de passe (APP_USER / APP_PASSWORD).
// Seul le formulaire public /formulaire/<jeton> reste accessible sans mot de passe.
export function proxy(request: NextRequest) {
  const user = process.env.APP_USER || "louis";
  const password = process.env.APP_PASSWORD;

  if (!password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("APP_PASSWORD n'est pas défini : accès bloqué.", { status: 503 });
  }

  const header = request.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const i = decoded.indexOf(":");
    if (i >= 0 && decoded.slice(0, i) === user && decoded.slice(i + 1) === password) {
      return NextResponse.next();
    }
  }
  return new NextResponse("Authentification requise", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="LM CRM", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!formulaire/|_next/static|_next/image|favicon.ico).*)"],
};
