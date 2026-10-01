-- Module CRM : prospects et historique des appels.
-- L'application accède à la base côté serveur uniquement (DATABASE_URL).
-- RLS est activée sans aucune policy : l'API publique Supabase (clé publishable)
-- ne peut ni lire ni écrire ces tables.

create table if not exists prospects (
    id                bigint generated always as identity primary key,
    entreprise        text not null,
    secteur           text not null default '',
    interlocuteur     text not null default '',
    telephone         text unique,
    email             text not null default '',
    ville             text not null default '',
    adresse           text not null default '',
    site_web          text not null default '',
    site_etat         text not null default 'inconnu'
                      check (site_etat in ('aucun', 'lien mort', 'reseau social', 'ok', 'inconnu')),
    categorie         text not null default '',
    note_google       numeric(2, 1),
    nb_avis           integer,
    statut            text not null default 'a_appeler'
                      check (statut in ('a_appeler', 'pas_de_reponse', 'rappel_demande', 'rdv_pris', 'refuse', 'client')),
    nb_tentatives     integer not null default 0,
    dernier_appel     timestamptz,
    prochaine_relance date,
    rdv_date          timestamptz,
    site_pret         boolean not null default false,
    montant           numeric(10, 2),
    converti_le       timestamptz,
    notes             text not null default '',
    source            text not null default 'manuel',
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

create index if not exists prospects_statut_idx on prospects (statut);
create index if not exists prospects_relance_idx on prospects (prochaine_relance);
create index if not exists prospects_secteur_idx on prospects (secteur);

create table if not exists appels (
    id          bigint generated always as identity primary key,
    prospect_id bigint not null references prospects (id) on delete cascade,
    date        timestamptz not null default now(),
    issue       text not null
                check (issue in ('pas_de_reponse', 'rappel_demande', 'rdv_pris', 'refuse')),
    decroche    boolean not null,
    notes       text not null default ''
);

create index if not exists appels_prospect_idx on appels (prospect_id);
create index if not exists appels_date_idx on appels (date);

create or replace function set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists prospects_updated_at on prospects;
create trigger prospects_updated_at before update on prospects
    for each row execute function set_updated_at();

alter table prospects enable row level security;
alter table appels enable row level security;

-- Ceinture et bretelles : aucun accès via l'API Data de Supabase.
do $$
begin
    if exists (select 1 from pg_roles where rolname = 'anon') then
        revoke all on prospects, appels from anon;
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
        revoke all on prospects, appels from authenticated;
    end if;
end;
$$;
