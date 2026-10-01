// Toutes les dates « métier » sont exprimées à l'heure de Paris.
export const TZ = "Europe/Paris";

/** Date du jour à Paris, au format YYYY-MM-DD. */
export function todayParis(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

/** Prochain jour ouvré (lundi-vendredi) après la date donnée (YYYY-MM-DD). */
export function nextBusinessDay(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00Z");
  do {
    d.setUTCDate(d.getUTCDate() + 1);
  } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
  return d.toISOString().slice(0, 10);
}

/** Ajoute n jours à une date YYYY-MM-DD. */
export function addDays(isoDate: string, n: number): string {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d.length === 10 ? d + "T12:00:00Z" : d) : d;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(typeof d === "string" ? new Date(d) : d);
}

/** Valeur pour un <input type="datetime-local"> à l'heure de Paris. */
export function toDatetimeLocal(d: Date | null | undefined): string {
  if (!d) return "";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Valeur pour un <input type="date"> (les colonnes date arrivent en Date UTC minuit). */
export function toDateInput(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}
