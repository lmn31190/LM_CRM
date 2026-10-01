"""Tests du module leads : python -m unittest discover leads"""

import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

import places_leads  # noqa: E402
from phone import normalize  # noqa: E402
from site_check import etat_site  # noqa: E402


class TestPhone(unittest.TestCase):
    def test_formats(self):
        for raw in ["05 61 23 45 67", "+33 5 61 23 45 67", "+33 (0)5 61 23 45 67", "0033561234567", "33561234567"]:
            self.assertEqual(normalize(raw), "+33561234567", raw)
        self.assertIsNone(normalize(""))
        self.assertIsNone(normalize(None))


class TestSite(unittest.TestCase):
    def test_sans_reseau(self):
        self.assertEqual(etat_site(""), "aucun")
        self.assertEqual(etat_site("https://www.instagram.com/salon"), "reseau social")
        self.assertEqual(etat_site("facebook.com/resto"), "reseau social")

    def test_http(self):
        def rep(code, url="https://exemple.fr/"):
            r = mock.Mock(status_code=code, url=url)
            return r

        with mock.patch("site_check.requests.get", return_value=rep(404)):
            self.assertEqual(etat_site("exemple.fr"), "lien mort")
        with mock.patch("site_check.requests.get", return_value=rep(403)):
            self.assertEqual(etat_site("exemple.fr"), "ok")
        with mock.patch("site_check.requests.get", return_value=rep(200, "https://m.facebook.com/x")):
            self.assertEqual(etat_site("exemple.fr"), "reseau social")
        import requests

        with mock.patch("site_check.requests.get", side_effect=requests.ConnectionError()):
            self.assertEqual(etat_site("exemple.fr"), "lien mort")


class TestCollecte(unittest.TestCase):
    def test_filtre_et_dedoublonne(self):
        def place(i, tel, site="", statut="OPERATIONAL"):
            return {
                "id": f"p{i}",
                "displayName": {"text": f"Salon {i}"},
                "nationalPhoneNumber": tel,
                "addressComponents": [{"types": ["locality", "political"], "longText": "Toulouse"}],
                "websiteUri": site,
                "businessStatus": statut,
                "rating": 4.5,
                "userRatingCount": 10,
            }

        resultats = [
            place(1, "05 61 00 00 01"),
            place(2, "+33 5 61 00 00 01"),  # même numéro
            place(3, "05 61 00 00 03", site="https://ok.fr"),
            place(4, ""),  # sans téléphone
            place(5, "05 61 00 00 05", statut="CLOSED_PERMANENTLY"),
            place(6, "05 61 00 00 06", site="https://instagram.com/s6"),
        ]
        with mock.patch.object(places_leads, "rechercher", return_value=resultats), mock.patch.object(
            places_leads, "etat_site", side_effect=lambda u: "ok" if u == "https://ok.fr" else ("reseau social" if u else "aucun")
        ):
            leads, stats = places_leads.collecter("salon", ["Toulouse"], "Beauté", "cle", 3)
        self.assertEqual([l["entreprise"] for l in leads], ["Salon 1", "Salon 6"])
        self.assertEqual(leads[0]["telephone"], "+33561000001")
        self.assertEqual(leads[0]["ville"], "Toulouse")
        self.assertEqual(stats, {"fiches": 6, "fermees": 1, "sans_tel": 1, "doublons_tel": 1, "avec_site": 1})


if __name__ == "__main__":
    unittest.main()
