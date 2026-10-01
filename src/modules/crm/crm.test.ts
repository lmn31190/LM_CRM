import { describe, expect, it } from "vitest";
import { csvToLeads, parseCsv } from "./csv";
import { addDays, nextBusinessDay, todayParis, toDatetimeLocal } from "./dates";
import { displayPhone, normalizePhone } from "./phone";
import { calculerTaux, projeter } from "./stats";

describe("téléphone", () => {
  it.each([
    ["05 61 23 45 67", "+33561234567"],
    ["05.61.23.45.67", "+33561234567"],
    ["+33 5 61 23 45 67", "+33561234567"],
    ["+33 (0)5 61 23 45 67", "+33561234567"],
    ["0033561234567", "+33561234567"],
    ["33561234567", "+33561234567"],
    ["06-12-34-56-78", "+33612345678"],
  ])("%s -> %s", (raw, attendu) => {
    expect(normalizePhone(raw)).toBe(attendu);
  });

  it("vide -> null", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(" - ")).toBeNull();
  });

  it("affichage", () => {
    expect(displayPhone("+33561234567")).toBe("05 61 23 45 67");
    expect(displayPhone("+4412345")).toBe("+4412345");
  });
});

describe("dates", () => {
  it("jour ouvré suivant", () => {
    expect(nextBusinessDay("2026-10-01")).toBe("2026-10-02"); // jeudi -> vendredi
    expect(nextBusinessDay("2026-10-02")).toBe("2026-10-05"); // vendredi -> lundi
    expect(nextBusinessDay("2026-10-03")).toBe("2026-10-05"); // samedi -> lundi
  });

  it("date du jour à Paris", () => {
    // 23h30 UTC le 1er octobre = 1h30 le 2 octobre à Paris
    expect(todayParis(new Date("2026-10-01T23:30:00Z"))).toBe("2026-10-02");
  });

  it("addDays et datetime-local", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(toDatetimeLocal(new Date("2026-10-01T16:00:00Z"))).toBe("2026-10-01T18:00");
  });
});

describe("CSV", () => {
  it("gère guillemets, point-virgule et BOM", () => {
    const rows = parseCsv('﻿nom;adresse\n"Salon ""Zen""";"1 rue A; Toulouse"\n');
    expect(rows).toEqual([
      ["nom", "adresse"],
      ['Salon "Zen"', "1 rue A; Toulouse"],
    ]);
  });

  it("convertit en leads avec en-têtes souples", () => {
    const csv = [
      "Nom,Téléphone,Ville,Site,Note,Avis",
      "Institut Lumière,05 61 00 00 01,Toulouse,,4.8,120",
      "Chez Paulo,05 61 00 00 02,Blagnac,http://chezpaulo.fr,\"4,2\",8",
      ",05 61 00 00 03,Toulouse,,,",
    ].join("\n");
    const { leads, ignorees } = csvToLeads(csv, "Restaurant");
    expect(ignorees).toBe(1);
    expect(leads).toHaveLength(2);
    expect(leads[0]).toMatchObject({
      entreprise: "Institut Lumière",
      telephone: "+33561000001",
      secteur: "Restaurant",
      site_etat: "aucun",
      note_google: 4.8,
      nb_avis: 120,
    });
    expect(leads[1]).toMatchObject({ site_etat: "inconnu", note_google: 4.2 });
  });

  it("signale l'absence de colonne entreprise", () => {
    expect(csvToLeads("telephone\n0561000000").erreur).toBeTruthy();
  });
});

describe("indicateurs", () => {
  it("taux", () => {
    const t = calculerTaux({ appels: 200, decroches: 80, rdv: 6, ventes: 2, ca: 1000 });
    expect(t.decroche).toBe(0.4);
    expect(t.appelVersRdv).toBe(0.03);
    expect(t.rdvVersVente).toBeCloseTo(1 / 3);
    expect(calculerTaux({ appels: 0, decroches: 0, rdv: 0, ventes: 0, ca: 0 }).decroche).toBeNull();
  });

  it("projection : hypothèses du brief sans données, réel ensuite", () => {
    const vide = projeter({ appels: 0, decroches: 0, rdv: 0, ventes: 0, ca: 0 }, 6);
    expect(vide).toMatchObject({ rdvNecessaires: 30, appelsNecessaires: 1000, appelsParJour: 46 });
    expect(vide.sourceAppelVersRdv).toBe("hypothèse");

    const reel = projeter({ appels: 250, decroches: 100, rdv: 10, ventes: 3, ca: 1500 }, 6);
    expect(reel.sourceAppelVersRdv).toBe("réel");
    expect(reel.sourceRdvVersVente).toBe("réel");
    expect(reel.rdvNecessaires).toBe(20); // 6 / 0,3
    expect(reel.appelsNecessaires).toBe(500); // 20 / 0,04
  });
});
