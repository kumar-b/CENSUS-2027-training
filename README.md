# Census 2027 Training Platform

A mobile-first, gamified quiz app for training field-level Census functionaries of **Raipur District, Chhattisgarh** ahead of Census 2027. Built for Enumerators, Supervisors, Charge Officers, Field Trainers, and Census Staff.

---

## Features

- **Bilingual** — full English and Hindi (हिंदी) UI and question bank
- **Four quiz modes**
  - **Daily Quiz** — 10 random questions, 60 s each, once per day
  - **Timed Quiz** — 10 chapter questions, 10-minute timer
  - **Practice** — all chapter questions, no timer, auto-resumes incomplete sessions
  - **Challenge** — async head-to-head via 6-character code; both players answer the same frozen question set and see a side-by-side score comparison
- **Gamification** — XP points, streak multipliers (×1.5 / ×2.0 / ×3.0), level progression, and auto-awarded badges
- **Leaderboard** — daily and all-time rankings
- **Question flagging** — users flag suspect questions; admins review and resolve; resolvers earn bonus points
- **Certificate sharing** — generated client-side as a PNG; shareable via WhatsApp, Facebook, Twitter
- **Admin panel** — user management (approve/suspend), question flag review, per-user detail view
- **Progressive Web App** — optimised for low-end Android phones

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, Zustand, React Query, react-i18next |
| Backend | Node.js, Express.js, better-sqlite3 (SQLite) |
| Auth | JWT access tokens (1 h) + refresh tokens (7 d), bcrypt passwords |
| Infrastructure | Docker Compose, Nginx reverse proxy |
| Testing | Vitest (client), Jest + Supertest (server) |

---

## Project Structure

```
/
├── client/          # React + Vite SPA
│   └── src/
│       ├── pages/   # Route-level page components
│       ├── components/
│       ├── store/   # Zustand stores (auth, quiz)
│       ├── i18n/    # en.js / hi.js translation files
│       └── utils/   # levels, helpers
├── server/          # Express REST API (port 3001)
│   ├── routes/      # auth, quiz, challenges, flags, admin, leaderboard
│   ├── services/    # quizService, badgeService
│   └── db/          # migrations.js (schema), seeder.js (QA import)
├── QA/              # Question bank — one subfolder per chapter
│   └── Chapter-N/questions.json
├── nginx/           # nginx.conf + Dockerfile
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker + Docker Compose (for production)

### Local Development

**1. Server**

```bash
cd server
cp .env.example .env   # fill in JWT_SECRET, JWT_REFRESH_SECRET
npm install
npm run dev            # http://localhost:3001
```

Required environment variables:

| Variable | Description |
|---|---|
| `JWT_SECRET` | Any long random string |
| `JWT_REFRESH_SECRET` | A different long random string |
| `DB_PATH` | SQLite file path (default: `./census-dev.db`) |
| `QA_DIR` | Path to the QA folder (default: `../QA`) |
| `PORT` | API port (default: `3001`) |

**2. Client**

```bash
cd client
npm install
npm run dev            # http://localhost:5173 (proxies /api → localhost:3001)
```

### Docker (Production)

```bash
cd client && npm run build && cd ..
docker-compose up --build -d
# App is available at http://localhost
```

**Create the first admin user** (run after the containers are up):

```bash
docker-compose exec api node -e "
  const db = require('better-sqlite3')(process.env.DB_PATH);
  db.prepare(\"UPDATE users SET role='admin' WHERE mobile=?\").run('YOUR_MOBILE_NUMBER');
"
```

---

## Question Bank

Questions live in `QA/<ChapterFolder>/questions.json`. The server auto-imports them on startup via `server/db/seeder.js` — add a new chapter folder and restart to load it.

**Format:**

```json
[{
  "chapter": 1,
  "topic": "Introduction",
  "difficulty": "easy",
  "question_en": "...",
  "question_hi": "...",
  "options_en": ["A", "B", "C", "D"],
  "options_hi": ["A", "B", "C", "D"],
  "correct_option": 0,
  "explanation_en": "...",
  "explanation_hi": "..."
}]
```

`correct_option` is 0-indexed. `difficulty` must be `easy`, `medium`, or `hard`.

### Chapters

| # | Title |
|---|---|
| 1 | Introduction |
| 2 | Roles and Responsibilities of Enumerators and Supervisors |
| 3 | Legal Provisions and the Rights of Enumerators and Supervisors |
| 4 | Numbering of Buildings, Census Houses and Preparation of Layout Map |
| 5 | Filling up of the Houselisting and Housing Census Questions |
| 6 | Self-Enumeration (SE) |

---

## Scoring

```
points = BASE_POINTS[difficulty] × streakMultiplier(streak)
```

| Difficulty | Base Points |
|---|---|
| Easy | 10 |
| Medium | 20 |
| Hard | 30 |

| Streak | Multiplier |
|---|---|
| ≥ 3 | ×1.5 |
| ≥ 5 | ×2.0 |
| ≥ 10 | ×3.0 |

Streak resets to 0 on a wrong answer and is scoped to the current session.

---

## Running Tests

```bash
# Client
cd client && npm test

# Server
cd server && npm test
```

---

## License

Internal use — Raipur District Administration, Chhattisgarh.
