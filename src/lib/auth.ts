import { timingSafeEqual } from "node:crypto";

function egal(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Le jeton du formulaire public, défini dans FORM_TOKEN (au moins 12 caractères). */
export function formTokenValide(token: string): boolean {
  const attendu = process.env.FORM_TOKEN ?? "";
  return attendu.length >= 12 && egal(token, attendu);
}
