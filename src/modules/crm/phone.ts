// Normalisation des numéros français : clé de dédoublonnage des prospects.
// Garder la même logique que leads/phone.py.

/** Renvoie le numéro au format E.164 (+33XXXXXXXXX), ou null s'il est vide. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (digits.startsWith("+33")) {
    let rest = digits.slice(3);
    if (rest.startsWith("0")) rest = rest.slice(1);
    return "+33" + rest;
  }
  if (digits.startsWith("0") && digits.length === 10) return "+33" + digits.slice(1);
  if (digits.startsWith("33") && digits.length === 11) return "+" + digits;
  return digits;
}

/** +33561234567 -> 05 61 23 45 67 */
export function displayPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  if (e164.startsWith("+33") && e164.length === 12) {
    const local = "0" + e164.slice(3);
    return local.match(/../g)!.join(" ");
  }
  return e164;
}
