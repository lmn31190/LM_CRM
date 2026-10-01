# LM CRM — prospection téléphonique LM DIGITAL

CRM léger pour prospecter par téléphone et ne perdre aucun rappel : collecte de leads Google Places,
vue « à rappeler aujourd'hui », fiche prospect avec historique, et indicateurs réels (décrochés, RDV, ventes).

**Stack** : Next.js 16 (App Router) + TypeScript, PostgreSQL (Supabase), Python pour la collecte de leads.

## Démarrage

```bash
npm install
cp .env.example .env.local     # puis remplir les valeurs (jamais committé)
npm run db:migrate             # crée les tables dans la base DATABASE_URL
npm run dev                    # http://localhost:3000
```

Variables (`.env.local`) :

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL. Supabase > **Connect** > **Session pooler** (format `postgres.<ref>@aws-0-eu-….pooler.supabase.com:5432`). La connexion directe `db.<ref>.supabase.co` n'est joignable qu'en IPv6. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Réservées aux modules suivants (auth, stockage des enregistrements). La V1 n'utilise que `DATABASE_URL`. |
| `APP_USER`, `APP_PASSWORD` | Identifiant / mot de passe demandés par le navigateur. Sans `APP_PASSWORD`, l'accès est libre en local et **bloqué en production**. |
| `FORM_TOKEN` | Jeton du formulaire public partageable (12 caractères minimum, ex. `openssl rand -hex 16`). |
| `OBJECTIF_APPELS_JOUR` | Objectif affiché sur la vue du jour (20 par défaut). |
| `GOOGLE_PLACES_API_KEY` | Clé « Places API (New) » pour le script de leads. |

**Sécurité Supabase** : l'application parle à la base uniquement côté serveur. Les tables ont la RLS
activée **sans aucune policy** et aucun droit pour les rôles `anon` / `authenticated` : la clé publishable
ne donne accès à rien.

## Utilisation au quotidien

- **Aujourd'hui** (`/`) : rendez-vous à venir (avec « site à préparer »), relances dues, puis nouveaux
  numéros triés par note Google. Bouton **Pas de réponse** en un clic (relance auto au prochain jour ouvré),
  **Décroché →** ouvre la fiche.
- **Fiche prospect** : numéro cliquable, saisie du résultat de l'appel (rappel demandé + date, RDV + date/heure,
  refus), « site prêt », vente conclue avec montant, historique et modification.
- **Prospects** : recherche (nom, ville, téléphone) et filtres statut / secteur.
- **+ Prospect** : saisie manuelle. Le lien `/formulaire/<FORM_TOKEN>` peut être transmis à un tiers : il
  ajoute des prospects sans accès au reste du CRM.
- **Import** : CSV (virgule ou point-virgule), dédoublonné par téléphone.
- **Indicateurs** : appels, décrochés, RDV, ventes, CA et cotisations (21,2 %) par période et par secteur,
  et nombre d'appels nécessaires pour l'objectif de ventes. Les hypothèses du brief (3 % appel → RDV,
  20 % RDV → vente) sont remplacées par les taux réels dès 100 appels / 5 RDV.

## Collecte de leads (Google Places)

```bash
python3 -m venv .venv && .venv/bin/pip install -r leads/requirements.txt
.venv/bin/python leads/places_leads.py "salon de massage" --secteur "Massage / bien-être" --csv leads/out/massage.csv
.venv/bin/python leads/places_leads.py "restaurant" --zone toulouse --secteur Restaurant --crm
```

Le script interroge l'API officielle (Text Search, 60 résultats max par recherche, donc une recherche par
commune avec `--zone toulouse`), écarte les fiches fermées ou sans téléphone, dédoublonne par téléphone, teste
chaque site et ne garde que : **aucun site**, **lien mort** (404/410/5xx ou injoignable), ou **réseau social
seulement** (Instagram, Facebook, Planity...). Sortie en CSV (à importer via `/import`) et/ou écriture directe
dans la base (`--crm`). Chaque page de 20 résultats est une requête facturée : vérifier le quota gratuit sur
la tarification Google Maps Platform.

## Organisation du code

```
db/migrations/        SQL versionné, appliqué par `npm run db:migrate`
src/modules/crm/      logique métier CRM : statuts, téléphone, dates, CSV, accès base, indicateurs
src/app/(crm)/        pages protégées (aujourd'hui, prospects, fiche, import, indicateurs)
src/app/formulaire/   formulaire public partageable
src/app/actions.ts    actions serveur (formulaires)
src/components/       composants d'interface
src/proxy.ts          protection par mot de passe
leads/                collecte Google Places (Python)
```

Un module par fonction : les prochains (`calendrier`, `mails`, `debrief`, `transcription`) s'ajoutent dans
`src/modules/<nom>/` avec leur propre migration SQL, sans toucher au CRM.

## Tests

```bash
npm run typecheck && npm test                 # TypeScript
python3 -m unittest discover leads            # module leads
```

## Feuille de route

1. **V1 (ce dépôt)** : CRM, import des leads, vue « à rappeler aujourd'hui », formulaires d'ajout.
2. V2 : calendrier, mails de confirmation et de rappel, synchronisation Google Calendar.
3. V3 : debrief matinal (mails, devis, relances).
4. V4 : enregistrement, transcription et extraction automatique dans les notes.

Points encore ouverts (voir le brief) : foyer fiscal, calendrier intégré ou Calendly, hébergement
(local ou en ligne), application d'enregistrement d'appels, objectif d'appels du premier mois.
