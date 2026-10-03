# Consignes pour Claude Code

- Git : après chaque modification validée (typecheck + tests OK), committer et pousser directement sur `main`
  (`git push origin HEAD:main`), en plus de la branche de travail éventuelle. Demande explicite de Louis.
- Ne jamais committer `.env.local` ni aucun secret.
- Vérifications avant push : `npm run typecheck && npm test` et `python3 -m unittest discover leads`.
- Stack et organisation : voir README.md (un module par fonction dans `src/modules/<nom>/`, SQL dans `db/migrations/`).
