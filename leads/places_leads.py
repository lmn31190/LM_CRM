#!/usr/bin/env python3
"""Collecte de leads via l'API officielle Google Places (Text Search, « Places API (New) »).

Pour chaque fiche : nom, téléphone, adresse, ville, note, nombre d'avis, catégorie, site.
On teste le site et on ne garde que les fiches sans site exploitable
(aucun site, lien mort, ou simple page de réseau social), dédoublonnées par téléphone.

Exemples :
  python leads/places_leads.py "salon de massage" --secteur "Massage / bien-être" --csv leads/out/massage.csv
  python leads/places_leads.py "restaurant" --zone toulouse --secteur Restaurant --crm

Coût : chaque page de 20 résultats est une requête Text Search facturée par Google
(quota gratuit mensuel : voir la page de tarification Google Maps Platform).
"""

from __future__ import annotations

import argparse
import csv
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from phone import normalize  # noqa: E402
from site_check import etat_site  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.nationalPhoneNumber",
        "places.internationalPhoneNumber",
        "places.formattedAddress",
        "places.addressComponents",
        "places.rating",
        "places.userRatingCount",
        "places.primaryTypeDisplayName",
        "places.websiteUri",
        "places.businessStatus",
        "nextPageToken",
    ]
)

# Toulouse et principales communes alentour, pour dépasser la limite de 60 résultats par recherche.
ZONES = {
    "toulouse": [
        "Toulouse", "Blagnac", "Colomiers", "Tournefeuille", "Balma", "L'Union",
        "Muret", "Ramonville-Saint-Agne", "Castanet-Tolosan", "Saint-Orens-de-Gameville",
        "Cugnaux", "Plaisance-du-Touch", "Portet-sur-Garonne", "Labège", "Launaguet",
        "Aucamville", "Fenouillet", "Saint-Jean", "Quint-Fonsegrives", "Villeneuve-Tolosane",
    ],
}

COLONNES = [
    "entreprise", "secteur", "telephone", "email", "ville", "adresse",
    "site_web", "site_etat", "categorie", "note_google", "nb_avis",
]


def charger_env() -> None:
    for nom in (".env.local", ".env"):
        f = ROOT / nom
        if not f.exists():
            continue
        for ligne in f.read_text(encoding="utf-8").splitlines():
            ligne = ligne.strip()
            if ligne and not ligne.startswith("#") and "=" in ligne:
                k, v = ligne.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("\"'"))


def rechercher(requete: str, cle: str, max_pages: int = 3) -> list[dict]:
    """Une recherche texte : jusqu'à 3 pages de 20 résultats (limite Google)."""
    places: list[dict] = []
    token = None
    for _ in range(max_pages):
        body = {"textQuery": requete, "languageCode": "fr", "regionCode": "FR", "pageSize": 20}
        if token:
            body["pageToken"] = token
        r = requests.post(
            URL,
            json=body,
            headers={"X-Goog-Api-Key": cle, "X-Goog-FieldMask": FIELD_MASK},
            timeout=20,
        )
        if r.status_code != 200:
            raise RuntimeError(f"Google Places {r.status_code} : {r.text[:300]}")
        data = r.json()
        places.extend(data.get("places", []))
        token = data.get("nextPageToken")
        if not token:
            break
        time.sleep(0.5)
    return places


def vers_lead(p: dict, secteur: str) -> dict:
    ville = ""
    for c in p.get("addressComponents", []):
        if "locality" in c.get("types", []):
            ville = c.get("longText", "")
            break
    return {
        "place_id": p.get("id"),
        "entreprise": (p.get("displayName") or {}).get("text", "").strip(),
        "secteur": secteur,
        "telephone": normalize(p.get("internationalPhoneNumber") or p.get("nationalPhoneNumber")),
        "email": "",
        "ville": ville,
        "adresse": p.get("formattedAddress", ""),
        "site_web": p.get("websiteUri", ""),
        "site_etat": "",
        "categorie": (p.get("primaryTypeDisplayName") or {}).get("text", ""),
        "note_google": p.get("rating"),
        "nb_avis": p.get("userRatingCount"),
        "_ferme": p.get("businessStatus") not in (None, "OPERATIONAL"),
    }


def collecter(mot_cle: str, villes: list[str], secteur: str, cle: str, max_pages: int) -> tuple[list[dict], dict]:
    bruts: dict[str, dict] = {}
    for ville in villes:
        requete = f"{mot_cle} {ville}"
        res = rechercher(requete, cle, max_pages)
        print(f"  {requete!r} : {len(res)} fiche(s)", file=sys.stderr)
        for p in res:
            bruts.setdefault(p.get("id"), p)

    stats = {"fiches": len(bruts), "fermees": 0, "sans_tel": 0, "doublons_tel": 0, "avec_site": 0}
    leads: list[dict] = []
    vus: set[str] = set()
    for p in bruts.values():
        lead = vers_lead(p, secteur)
        if lead["_ferme"]:
            stats["fermees"] += 1
            continue
        if not lead["telephone"]:
            stats["sans_tel"] += 1
            continue
        if lead["telephone"] in vus:
            stats["doublons_tel"] += 1
            continue
        vus.add(lead["telephone"])
        leads.append(lead)

    print(f"  Test de {len(leads)} site(s)...", file=sys.stderr)
    with ThreadPoolExecutor(max_workers=8) as ex:
        for lead, etat in zip(leads, ex.map(lambda l: etat_site(l["site_web"]), leads)):
            lead["site_etat"] = etat
    garder = [l for l in leads if l["site_etat"] != "ok"]
    stats["avec_site"] = len(leads) - len(garder)
    return garder, stats


def ecrire_csv(leads: list[dict], chemin: Path) -> None:
    chemin.parent.mkdir(parents=True, exist_ok=True)
    # utf-8-sig : s'ouvre correctement dans Excel.
    with chemin.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLONNES, extrasaction="ignore")
        w.writeheader()
        w.writerows(leads)


def ecrire_crm(leads: list[dict]) -> int:
    import psycopg  # import tardif : seulement nécessaire pour --crm

    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL manquante (voir .env.example).")
    ajoutes = 0
    with psycopg.connect(url, prepare_threshold=None) as conn, conn.cursor() as cur:
        for l in leads:
            cur.execute(
                """insert into prospects (entreprise, secteur, telephone, ville, adresse, site_web,
                       site_etat, categorie, note_google, nb_avis, source)
                   values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'google_places')
                   on conflict (telephone) do nothing""",
                (l["entreprise"], l["secteur"], l["telephone"], l["ville"], l["adresse"],
                 l["site_web"], l["site_etat"], l["categorie"], l["note_google"], l["nb_avis"]),
            )
            ajoutes += cur.rowcount
    return ajoutes


def main() -> None:
    charger_env()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mot_cle", help="ex. « salon de massage », « restaurant », « coach sportif »")
    ap.add_argument("--villes", default="Toulouse", help="villes séparées par des virgules (défaut : Toulouse)")
    ap.add_argument("--zone", choices=sorted(ZONES), help="liste de communes prédéfinie (remplace --villes)")
    ap.add_argument("--secteur", default="", help="secteur enregistré dans le CRM (ex. « Restaurant »)")
    ap.add_argument("--max-pages", type=int, default=3, help="pages de 20 résultats par ville (max 3)")
    ap.add_argument("--csv", type=Path, help="fichier CSV de sortie (à importer via la page Import)")
    ap.add_argument("--crm", action="store_true", help="écrire directement dans la base, statut « À appeler »")
    args = ap.parse_args()

    if not args.csv and not args.crm:
        ap.error("préciser --csv FICHIER et/ou --crm")
    cle = os.environ.get("GOOGLE_PLACES_API_KEY")
    if not cle:
        raise SystemExit("GOOGLE_PLACES_API_KEY manquante (dans .env.local).")

    villes = ZONES[args.zone] if args.zone else [v.strip() for v in args.villes.split(",") if v.strip()]
    print(f"Recherche « {args.mot_cle} » sur {len(villes)} ville(s)...", file=sys.stderr)
    leads, s = collecter(args.mot_cle, villes, args.secteur, cle, min(args.max_pages, 3))
    print(
        f"{s['fiches']} fiches · {s['fermees']} fermées · {s['sans_tel']} sans téléphone · "
        f"{s['doublons_tel']} doublons · {s['avec_site']} avec un site en ligne\n"
        f"=> {len(leads)} lead(s) sans site exploitable",
        file=sys.stderr,
    )
    if args.csv:
        ecrire_csv(leads, args.csv)
        print(f"CSV écrit : {args.csv}", file=sys.stderr)
    if args.crm:
        n = ecrire_crm(leads)
        print(f"CRM : {n} prospect(s) ajouté(s), {len(leads) - n} déjà présent(s).", file=sys.stderr)


if __name__ == "__main__":
    main()
