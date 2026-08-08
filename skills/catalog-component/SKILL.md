---
name: catalog-component
description: "Trigger: crear componente, nueva feature, agregar componente, new component. Create a full catalog feature component following project conventions."
license: Apache-2.0
metadata:
  author: "enilio"
  version: "1.0"
---

# Skill: catalog-component

## Activation Contract

- Trigger: crear componente, nueva feature, agregar componente, new component.
- Building a new feature component in the catalog app. Covers the full workflow: model, mock data, service, component, module, route, verified build.

## Hard Rules

- Never commit without explicit user approval — always ask "¿Commiteamos?"
- Run `ng build` after every change; it must succeed.
- Use classic NgModules (no standalone components). Declare every component in a feature module.
- Constructor injection; reactive state via Observables and the async pipe in templates.
- SCSS files start with `@use 'styles/variables' as v;` and use design tokens, never hardcoded colors.
- Models live in `src/app/core/models/`. Mock data lives inside the service, not in separate JSON files.
- Services live in `src/app/core/services/` and are the only data boundary; return Promises or Observables.
- Every change requires a new entry in `HISTORIAL.md` (see the change-history skill).

## Decision Gates

| Situation | Action |
|---|---|
| Public page for a route | Component in `{feature}/pages/{page}/` + feature routing module |
| Reusable across features | Component in `shared/components/` + export from `SharedModule` |
| Needs new data | Extend an existing core service before creating a new one |

## Execution Steps

1. Model: add interface in `src/app/core/models/{name}.model.ts`.
2. Service: add the data method to a service in `src/app/core/services/` (mock today, HttpClient later).
3. Component: create `{feature}/pages/{page}/{page}.component.{ts,html,scss}` with `styleUrls: ['./{page}.component.scss']`.
4. Module: add the component to the feature module `declarations`.
5. Route: add the lazy `loadChildren` entry in `app-routing.module.ts`.
6. Verify: `ng build` succeeds, then add the HISTORIAL.md entry.

## Output Contract

- Return the list of created files.
- Confirm `ng build` passed and that `HISTORIAL.md` has the new entry.
