"""Teste le site d'une fiche : aucun, lien mort, réseau social seulement, ou en ligne."""

from urllib.parse import urlparse

import requests

RESEAUX_SOCIAUX = (
    "facebook.com", "fb.com", "instagram.com", "linktr.ee", "tiktok.com",
    "linkedin.com", "pagesjaunes.fr", "planity.com", "treatwell.fr",
    "thefork.fr", "lafourchette.com", "ubereats.com", "deliveroo.fr",
)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "fr-FR,fr;q=0.9",
}


def etat_site(url: str | None, timeout: float = 8.0) -> str:
    """Renvoie 'aucun', 'reseau social', 'lien mort' ou 'ok'."""
    if not url or not url.strip():
        return "aucun"
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "http://" + url
    host = (urlparse(url).hostname or "").lower()
    if any(host == d or host.endswith("." + d) for d in RESEAUX_SOCIAUX):
        return "reseau social"
    try:
        r = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True, stream=True)
        r.close()
    except requests.RequestException:
        return "lien mort"
    # 401/403/429 : le site existe mais bloque les robots -> on le considère en ligne.
    if r.status_code in (404, 410) or r.status_code >= 500:
        return "lien mort"
    final_host = (urlparse(r.url).hostname or "").lower()
    if any(final_host == d or final_host.endswith("." + d) for d in RESEAUX_SOCIAUX):
        return "reseau social"
    return "ok"
