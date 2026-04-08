# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Census 2027 Training Platform — a mobile-first gamified quiz app for training field-level functionaries (Enumerators, Supervisors, Charge Officers, Field Trainers, Census Staff) of Raipur District, Chhattisgarh for Census 2027.

Design spec: `docs/superpowers/specs/2026-04-08-census2027-training-platform-design.md`  
Implementation plan: `docs/superpowers/plans/2026-04-08-census2027-training-platform.md`

## Architecture

**Monorepo:** `/server` (Express.js REST API) + `/client` (React + Vite SPA), deployed via Docker Compose with Nginx as reverse proxy.

```
/server      → Express.js + better-sqlite3 API (port 3001)
/client      → React 18 + Vite + Tailwind CSS SPA
/QA/         → Question bank: topic subfolders, each with questions.json
/nginx/      → nginx.conf: serves client build, proxies /api/* to Express
docker-compose.yml
```

**Request flow:** Browser → Nginx (port 80) → static files for `/`, Express for `/api/*`

**Database:** SQLite via `better-sqlite3`. File at `DB_PATH` env var (default `/data/census.db` in Docker). Schema is auto-created on first run via `server/db/migrations.js`. Tables: `users`, `questions`, `quiz_sessions`, `quiz_answers`, `badges`, `user_badges`, `daily_scores`.

**QA Seeder:** On server startup, `server/db/seeder.js` reads all `QA/*/questions.json` files and upserts into `questions` table. Add a new chapter folder + `questions.json`, restart server → questions imported automatically.

**Auth:** Mobile number + bcrypt password. JWT access tokens (1h) + refresh tokens (7d). Role field on user: `user` or `admin`. JWT payload: `{ sub: userId, role }`.

**Gamification scoring:** `points = BASE_POINTS[difficulty] × streakMultiplier(streak)`. Base: easy=10, medium=20, hard=30. Streak multipliers: ≥3→×1.5, ≥5→×2.0, ≥10→×3.0. Streak resets to 0 on a wrong answer and is session-scoped only.

**Quiz modes:** `daily` (10 random questions, 60s each, once per day), `timed` (15 questions per chapter, 15min total), `practice` (all chapter questions, no timer, resumable — incomplete sessions are resumed on restart).

**Badges** are auto-awarded in `server/services/badgeService.js` after every `POST /api/quiz/complete`. Criteria types: `quizzes_completed`, `streak`, `daily_streak`, `perfect_timed`, `chapters_completed`, `points`, `daily_rank_1`.

## Development Commands

### Server (from `/server`)
```bash
npm install          # install dependencies
npm run dev          # nodemon dev server on port 3001
npm test             # Jest tests (--runInBand --forceExit)
npm test -- --testPathPattern=auth   # run single test file
```

Required env vars for local dev — create `server/.env` or set in shell:
```
JWT_SECRET=any-long-string
JWT_REFRESH_SECRET=another-long-string
DB_PATH=/tmp/census-dev.db
QA_DIR=../QA
PORT=3001
```

### Client (from `/client`)
```bash
npm install          # install dependencies
npm run dev          # Vite dev server on port 5173 (proxies /api → localhost:3001)
npm run build        # production build → client/dist/
```

### Docker (from repo root)
```bash
cd client && npm run build && cd ..   # build client first
docker-compose up --build -d          # start all services
docker-compose logs -f api            # tail API logs
docker-compose exec api node -e "..." # run one-off node commands (e.g. promote admin)
```

### Create first admin user
After `docker-compose up`, register normally via the UI or API, then promote:
```bash
docker-compose exec api node -e "
  const db = require('better-sqlite3')(process.env.DB_PATH);
  db.prepare(\"UPDATE users SET role='admin' WHERE mobile=?\").run('MOBILE_NUMBER');
"
```

## Key Conventions

**QA question file format** (`QA/<TopicFolder>/questions.json`):
```json
[{
  "chapter": 1,
  "topic": "Introduction",
  "difficulty": "easy",
  "question_en": "...", "question_hi": "...",
  "options_en": ["A","B","C","D"], "options_hi": ["A","B","C","D"],
  "correct_option": 0,
  "explanation_en": "...", "explanation_hi": "..."
}]
```
`correct_option` is 0-indexed (0 = first option). `difficulty` must be `easy`, `medium`, or `hard`.

**Bilingual pattern:** All user-facing strings use `react-i18next` (`useTranslation` hook). Question/badge text is stored as `_en`/`_hi` pairs in the DB. The client reads `i18n.language` (`en` or `hi`) to pick the right field.

**API error shape:** `{ error: "message" }` with HTTP status. Service functions throw `Object.assign(new Error(msg), { status: 400 })` to propagate HTTP status through route handlers.

**Admin access:** Same login URL (`/`). JWT role determines redirect — `admin` → `/admin`, `user` → `/home`. All `/api/admin/*` routes require `auth` + `adminOnly` middleware.

**Frontend state:** Zustand stores in `client/src/store/` — `authStore` (user, tokens, localStorage sync) and `quizStore` (active session questions/answers/index). Server state via React Query (`@tanstack/react-query`).

**Certificate sharing:** Generated client-side as PNG using `html2canvas` on a styled `<div>`. WhatsApp via `wa.me` link, Facebook/Twitter via share dialog URLs, Instagram requires manual download.

## Chapter Reference

| # | Title |
|---|---|
| 1 | Introduction |
| 2 | Roles and Responsibilities of Enumerators and Supervisors |
| 3 | Legal Provisions and the Rights of Enumerators and Supervisors |
| 4 | Numbering of Buildings, Census Houses and Preparation of Layout Map |
| 5 | Filling up of the Houselisting and Housing Census Questions |
| 6 | Self-Enumeration (SE) |
