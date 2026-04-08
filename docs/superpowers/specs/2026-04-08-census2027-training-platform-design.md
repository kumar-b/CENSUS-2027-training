# Census 2027 Training Platform — Design Spec

**Date:** 2026-04-08  
**Project:** Census 2027 Field Functionary Training Web App  
**Scope:** Raipur District, Chhattisgarh  
**Author:** Brainstorming session

---

## 1. Overview

A mobile-friendly web application to train field-level functionaries of Raipur district who will perform Census 2027 (starting 2026). The platform uses gamification to incentivise learning through quizzes, leaderboards, badges, and shareable certificates.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express.js |
| Database | SQLite (via better-sqlite3) |
| Styling | Tailwind CSS |
| State management | Zustand |
| Data fetching | React Query |
| i18n | react-i18next |
| Certificate generation | html2canvas (browser-side PNG) |
| Admin charts | Recharts |
| Deployment | Docker + docker-compose |
| Reverse proxy | Nginx (serves React build, proxies /api to Express) |

### Repository structure

```
/
├── client/          # React + Vite frontend
├── server/          # Express.js backend
├── QA/              # Question bank (topic folders)
│   └── Misc/        # Currently exists
│       └── questions.json
├── docs/
│   └── superpowers/specs/
└── docker-compose.yml
```

---

## 3. Architecture

Single `docker-compose.yml` runs:
- **Nginx** container — serves React build at `/`, proxies `/api/*` to Express
- **Express** container — REST API (auth, quiz, leaderboard, admin)
- **SQLite** — file stored in a named Docker volume for persistence

On server start, a **QA seeder script** reads all `QA/*/questions.json` files and upserts them into the SQLite `questions` table. Adding new chapter folders and restarting the server imports new questions automatically.

---

## 4. Authentication

- **Registration:** Mobile number + password + full profile (name, functionary type, state, district)
- **Login:** Mobile number + password
- **Session:** JWT (access token + refresh token)
- **Password reset:** Admin-only — admin can reset any user's password from the admin portal
- **Roles:** `user` (default) | `admin` — stored in JWT, enforced on all API routes

---

## 5. Bilingual Support

- Languages: English (`en`) and Hindi (`hi`)
- Implementation: `react-i18next` for UI strings; questions stored with both `_en` and `_hi` fields in the database
- Toggle: Language switcher available at all times in the app header/settings; preference saved to user profile and `localStorage`

---

## 6. User Profile

Fields collected at registration:

| Field | Type |
|---|---|
| Name | Text |
| Mobile | Text (unique, used as login) |
| Password | Hashed (bcrypt) |
| Functionary Type | Enum (see §7) |
| State | Text |
| District | Text |
| Language | `en` / `hi` |

---

## 7. Functionary Types

1. Enumerator
2. Supervisor
3. Charge Officer
4. Field Trainer
5. Census Staff (General)

Each type has a corresponding badge variant (e.g., "Star Enumerator", "Expert Supervisor").

---

## 8. Question Bank (QA Folder)

### File format — `QA/<topic>/questions.json`

```json
[
  {
    "chapter": 1,
    "topic": "Introduction",
    "difficulty": "easy",
    "question_en": "What is the Census?",
    "question_hi": "जनगणना क्या है?",
    "options_en": ["Option A", "Option B", "Option C", "Option D"],
    "options_hi": ["विकल्प A", "विकल्प B", "विकल्प C", "विकल्प D"],
    "correct_option": 0,   // 0-indexed (0 = first option, 3 = fourth option)
    "explanation_en": "The Census is...",
    "explanation_hi": "जनगणना है..."
  }
]
```

### Chapters

| # | Title |
|---|---|
| 1 | Introduction |
| 2 | Roles and Responsibilities of Enumerators and Supervisors |
| 3 | Legal Provisions and the Rights of Enumerators and Supervisors |
| 4 | Numbering of Buildings, Census Houses and Preparation of Layout Map |
| 5 | Filling up of the Houselisting and Housing Census Questions |
| 6 | Self-Enumeration (SE) |

### Difficulty levels
- **Easy** — base 10 points
- **Medium** — base 20 points
- **Hard** — base 30 points

---

## 9. Quiz System

### Three modes

| Mode | Questions | Timer | Frequency | Resumable |
|---|---|---|---|---|
| Daily Quiz | 10 random (all chapters) | 60s per question | Once per day | No |
| Timed Quiz | 15 per chapter (user picks) | 15 min total | Unlimited | No |
| Chapter Practice | All questions in a chapter | None | Unlimited | Yes |

### Quiz flow (all modes)
1. Select mode (and chapter for Timed/Practice)
2. Show question + 4 MCQ options + difficulty indicator
3. User selects answer
4. Show correct answer + explanation (in selected language)
5. Next question
6. Results screen — score, points earned, streak stats, badges unlocked

### Scoring formula

```
base_points = difficulty × multiplier (Easy=10, Medium=20, Hard=30)

streak_multiplier:
  < 3 correct in a row  → ×1.0
  3–4 in a row          → ×1.5
  5–9 in a row          → ×2.0
  10+ in a row          → ×3.0

points_earned = base_points × streak_multiplier
```

A wrong answer resets the streak counter to 0. Streak is tracked within a single quiz session only (does not carry across sessions).

Points from all modes accumulate into `users.total_points` and `daily_scores`.

---

## 10. Gamification

### Leaderboard

| Type | Basis | Resets |
|---|---|---|
| Daily | Points earned today | Midnight every day |
| Overall | Cumulative total points | Never |

Both leaderboards show: rank, name initials, functionary type, points. Top 10 visible to all users. User's own rank always shown even if outside top 10.

### Badges

| Badge | Criteria |
|---|---|
| 🌟 First Step | Complete first quiz |
| 🔥 On Fire | 10 correct answers in a row (streak) |
| 📅 Week Warrior | Complete daily quiz 7 days in a row |
| 💯 Perfect Score | 100% on a timed quiz |
| 📚 Chapter Master | Complete all questions in a chapter |
| 🏆 Census Expert | Complete all 6 chapters |
| 🥇 Top of the Day | Rank #1 on daily leaderboard |
| ⭐ Functionary Badge | Role-specific (e.g., "Star Enumerator") — awarded at 500 pts |

Badges auto-awarded on quiz completion when criteria are met. Saved to `user_badges`. Admin can define additional badge types.

### Shareable Certificate

- Generated client-side as PNG using `html2canvas`
- Contains: user name, functionary type, district, badge name, date earned, platform branding
- Share targets: WhatsApp (Web Share API / wa.me), Facebook (Share dialog), Twitter/X (Web Intent), Instagram (download + open), Direct download (PNG)

---

## 11. Database Schema

### `users`
```sql
id, mobile (UNIQUE), password_hash, name, functionary_type, state, district,
language, role, total_points, created_at, last_login
```

### `questions`
```sql
id, chapter, topic, difficulty, question_en, question_hi,
options_en (JSON), options_hi (JSON), correct_option,
explanation_en, explanation_hi
```

### `quiz_sessions`
```sql
id, user_id, mode (daily/timed/practice), chapter (nullable),
score, max_score, streak_max, time_taken, completed, started_at, completed_at
```

### `quiz_answers`
```sql
id, session_id, question_id, chosen_option, is_correct, points_earned, time_taken
```

### `badges`
```sql
id, name_en, name_hi, description_en, description_hi, icon,
criteria_type, criteria_value
```

### `user_badges`
```sql
id, user_id, badge_id, earned_at, shared
```

### `daily_scores`
```sql
id, user_id, date, points
UNIQUE(user_id, date)
```

---

## 12. Frontend Pages

### Public (unauthenticated)
- `/` — Landing / Login
- `/register` — Registration form
- `/forgot-password` — (Admin-reset flow — user contacts admin)

### User (authenticated, role=user)
- `/home` — Dashboard: greeting, points, rank, daily quiz CTA, quick-access tiles
- `/quiz` — Mode selector
- `/quiz/daily` — Daily quiz session
- `/quiz/timed` — Timed quiz (chapter selector)
- `/quiz/practice` — Chapter practice (chapter selector, resumable)
- `/results` — Post-quiz results screen
- `/leaderboard` — Daily + overall leaderboard tabs
- `/profile` — My stats, badges, language toggle, settings
- `/certificate/:badgeId` — Certificate view + share screen

### Admin (authenticated, role=admin)
- `/admin` — Dashboard (stats, user counts, chapter completion rates)
- `/admin/users` — User list (search, filter, sort, bulk actions)
- `/admin/users/:id` — User drill-down (profile, quiz history, points chart, badges)
- `/admin/badges` — Badge definition management

### Mobile UI pattern
- Bottom navigation bar: Home | Quiz | Ranks | Profile
- All screens designed mobile-first (320px+)
- Language toggle in header

---

## 13. Admin Portal Features

- Live stats: total users, active today, quizzes completed today, badges earned today
- Users by functionary type breakdown
- Chapter completion rate per chapter (% of users who completed)
- User list: search by name/mobile/type, filter by functionary type, sort by points/join date/last active
- Export users as CSV
- Per-user drill-down: profile edit, quiz session history, points timeline chart, badges earned, chapter completion, password reset, account deletion
- Badge management: create/edit/delete badge definitions

---

## 14. API Routes (key endpoints)

### Auth
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
```

### Quiz
```
GET  /api/quiz/daily          — get today's daily quiz (or "already completed")
GET  /api/quiz/timed/:chapter — get timed quiz questions for a chapter
GET  /api/quiz/practice/:chapter — get/resume chapter practice session
POST /api/quiz/session        — start a session
POST /api/quiz/answer         — submit an answer
POST /api/quiz/complete       — complete a session, returns score + badges earned
```

### Leaderboard
```
GET /api/leaderboard/daily
GET /api/leaderboard/overall
```

### User
```
GET  /api/user/profile
PUT  /api/user/profile
GET  /api/user/badges
GET  /api/user/stats
```

### Admin
```
GET    /api/admin/dashboard
GET    /api/admin/users
POST   /api/admin/users
GET    /api/admin/users/:id
PUT    /api/admin/users/:id
DELETE /api/admin/users/:id
POST   /api/admin/users/:id/reset-password
GET    /api/admin/users/:id/progress
GET    /api/admin/badges
POST   /api/admin/badges
PUT    /api/admin/badges/:id
DELETE /api/admin/badges/:id
```

---

## 15. Deployment

- Single `docker-compose.yml` with three services: `nginx`, `api`, `db` (volume)
- Environment variables in `.env`: `JWT_SECRET`, `PORT`, `DB_PATH`
- QA seeder runs automatically on `api` container start
- Add `.superpowers/` to `.gitignore`
