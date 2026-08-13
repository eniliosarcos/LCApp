---
name: docs-sync
description: "Trigger: actualizar docs, documentación desactualizada, README, ARCHITECTURE, cambiar estructura, nuevo endpoint, nueva ruta, infra. Keep repo docs in sync with code structure."
license: Apache-2.0
metadata:
  author: "enilio"
  version: "1.0"
---

# Skill: docs-sync

## Activation Contract

- Any change that alters structure: new endpoint, new route/module, data boundary change, infra change, new env var, new piece of the system.
- User asks to update documentation, or points out docs are stale.

## Hard Rules

- Only touch a doc when the change actually affects it: README for quickstart/stack/deploy, ARCHITECTURE.md for structure.
- Never edit previous HISTORIAL.md entries; add new ones (see change-history skill).
- Never put real secrets or values in docs — names of env vars only.
- Keep docs in the project's language (Spanish for LCApp).
- The maps must never drift: every endpoint, route, module and env var listed must exist in code.

## Decision Gates

| Change touches | Update |
|---|---|
| Quickstart, stack, or how to run | `README.md` |
| Deploy flow (CI, Render, Pages, Atlas) | `README.md` + `ARCHITECTURE.md` |
| Endpoint added/removed/renamed | `README.md` (table) + `ARCHITECTURE.md` (flow) |
| New module, route, or service in frontend | `ARCHITECTURE.md` (frontier/flow) |
| New env var or secret | `README.md` + `ARCHITECTURE.md` (tables) |
| Data model or order flow changes | `ARCHITECTURE.md` (flow + backend) |
| Nothing structural | No doc update; only HISTORIAL.md |

## Execution Steps

1. Identify which docs are affected using the decision gate.
2. Update the affected sections; delete stale references; add new ones.
3. Verify every path, endpoint, module and env var cited actually exists in code.
4. Add the HISTORIAL.md entry (change-history skill).

## Output Contract

- Report which docs were checked and which were updated.
- Confirm no stale references remain and no secrets were included.
