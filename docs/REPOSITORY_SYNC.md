# IGNITRON 2K26 — Permanent Dual-Repository Synchronization Policy

This document establishes the mandatory permanent workflow for keeping both official GitHub repositories synchronized on every development task.

## 1. Official GitHub Repositories

- **Primary Repository (`origin`)** — Canonical development source:
  - URL: `https://github.com/preetamvr1595/ignitron-coding-collab.git`
  - Target branch: `main`

- **Secondary Repository (`secondary`)** — Synchronized mirror:
  - URL: `https://github.com/Karunpoojari7/IGNITRON---CODING-COLLAB.git`
  - Target branch: `main`

## 2. Remote Setup

Ensure both remotes are configured in your local clone:

```bash
git remote add origin https://github.com/preetamvr1595/ignitron-coding-collab.git
git remote add secondary https://github.com/Karunpoojari7/IGNITRON---CODING-COLLAB.git
```

## 3. Mandatory Synchronization Workflow

Every development task MUST follow these steps before completion:

1. **Fetch & Reconcile First**:
   ```bash
   git fetch origin
   git fetch secondary
   ```
   Inspect `git log --oneline origin/main..secondary/main` and `git log --oneline secondary/main..origin/main`.
   If histories have diverged, merge safely and reconcile all unique functionality without overwriting unrelated work.

2. **Never Force-Push or Rewrite History**:
   - NEVER use `git push --force`, `git push -f`, or `git reset --hard` on shared `main` branches.
   - NEVER expose `.env` files, secrets, tokens, or credentials.

3. **Build & Verify Before Pushing**:
   - Build `@ignitron/shared`, `@ignitron/backend`, and `@ignitron/frontend`.
   - Run relevant TypeScript type-checks and integration/API tests.

4. **Dual-Push & Verify Source Trees**:
   Push verified commits to both `main` branches:
   ```bash
   git push origin main
   git push secondary main
   ```
   Verify both remote branches point to the identical commit SHA:
   ```bash
   git rev-parse origin/main secondary/main HEAD
   ```
   Both remotes MUST match `HEAD` before reporting completion.
