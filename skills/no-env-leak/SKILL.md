---
name: no-env-leak
description: "Trigger: environment, variables de entorno, commit, push, credenciales, secrets. Never commit environment files with real data."
license: Apache-2.0
metadata:
  author: "enilio"
  version: "1.0"
---

# Skill: no-env-leak

## Activation Contract

- Before any `git commit` or `git push`.
- When editing `src/environments/environment.ts` or `environment.prod.ts`.
- When adding new environment variables or credentials.

## Hard Rules

- NEVER commit `src/environments/environment.ts` or `environment.prod.ts` with real data.
- Keep both files in `.gitignore`; never remove them from it.
- Committed environment files use placeholder values only.
- Real secrets (API keys, phone numbers, social handles) live in Cloudflare Pages env vars (front, injected by `scripts/cloudflare-build.sh`) and Render env vars (backend).

## Execution Steps

1. Verify `.gitignore` contains `src/environments/environment.ts` and `environment.prod.ts`.
2. Verify committed environment files contain placeholders only.
3. Before every commit, confirm no staged file holds real credentials, phone numbers, or secret values.

## Output Contract

- Confirm which environment files were checked and that no real data is staged.
