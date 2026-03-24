# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-03-24] Validate the core before packaging**
   Do instead: run focused unit tests, integration tests, `typecheck`, and a local Electron build before treating the desktop app as ready.

## Architecture Guardrails
1. **[2026-03-24] Provider details stay in adapters**
   Do instead: keep CNPJá URLs, payload mapping, and rate-limit rules isolated under `src/core/simples/adapters`.

## User Directives
1. **[2026-03-24] GSD is local-only in this repo**
   Do instead: keep `.ai/` out of Git and document the manual prepare flow in the README.
