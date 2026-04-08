# Census 2027 Training Platform — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-friendly gamified quiz training platform for Census 2027 field functionaries in Raipur district, with leaderboards, badges, and shareable certificates.

**Architecture:** Nginx reverse proxy serves a React+Vite SPA at `/` and proxies `/api/*` to an Express.js server. SQLite (better-sqlite3) stores all data in a Docker volume. A QA seeder imports question JSON files on server startup. All services run via docker-compose.

**Tech Stack:** Node.js 20, Express 4, better-sqlite3, bcryptjs, jsonwebtoken, Jest, Supertest, React 18, Vite 5, Tailwind CSS 3, react-i18next, Zustand 4, React Query 5, Axios, html2canvas, Recharts, Docker, Nginx

---

## File Map

### Server
```
server/
├── package.json
├── index.js                   # Express app entry
├── db/
│   ├── database.js            # SQLite connection singleton
│   ├── migrations.js          # CREATE TABLE statements
│   └── seeder.js              # QA folder → SQLite importer
├── middleware/
│   ├── auth.js                # JWT verification middleware
│   └── adminOnly.js           # role=admin guard
├── routes/
│   ├── auth.js
│   ├── quiz.js
│   ├── leaderboard.js
│   ├── user.js
│   └── admin.js
├── services/
│   ├── authService.js         # register, login, token issuance
│   ├── quizService.js         # session, scoring, streak logic
│   ├── badgeService.js        # auto-award logic
│   └── leaderboardService.js  # daily + overall queries
└── __tests__/
    ├── auth.test.js
    ├── quiz.test.js
    └── badge.test.js
```

### Client
```
client/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── i18n.js
    ├── locales/
    │   ├── en.json
    │   └── hi.json
    ├── api/
    │   ├── client.js          # Axios instance + JWT interceptors
    │   ├── auth.js
    │   ├── quiz.js
    │   ├── leaderboard.js
    │   ├── user.js
    │   └── admin.js
    ├── store/
    │   ├── authStore.js       # Zustand: auth state + tokens
    │   └── quizStore.js       # Zustand: active quiz session
    ├── components/
    │   ├── ProtectedRoute.jsx
    │   ├── AdminRoute.jsx
    │   ├── BottomNav.jsx
    │   ├── LanguageToggle.jsx
    │   ├── QuizQuestion.jsx
    │   ├── QuizTimer.jsx
    │   ├── BadgeCard.jsx
    │   ├── LeaderboardTable.jsx
    │   └── CertificateCanvas.jsx
    └── pages/
        ├── Landing.jsx
        ├── Register.jsx
        ├── Home.jsx
        ├── QuizSelector.jsx
        ├── DailyQuiz.jsx
        ├── TimedQuiz.jsx
        ├── PracticeQuiz.jsx
        ├── Results.jsx
        ├── Leaderboard.jsx
        ├── Profile.jsx
        ├── Certificate.jsx
        └── admin/
            ├── AdminDashboard.jsx
            ├── UserList.jsx
            ├── UserDetail.jsx
            └── BadgeManager.jsx
```

### Root
```
/
├── QA/Misc/questions.json     # already exists
├── nginx/nginx.conf
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

## Phase 1: Infrastructure

### Task 1: Project scaffold, git, env, docker-compose skeleton

**Files:**
- Create: `.gitignore`
- Create: `.env.example`
- Create: `docker-compose.yml`

- [ ] **Step 1: Initialise git**

```bash
cd "/Users/kb/Workspace/CENSUS 2027"
git init
```

Expected: `Initialized empty Git repository in .../CENSUS 2027/.git/`

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
.env
*.db
*.db-shm
*.db-wal
dist/
.superpowers/
```

- [ ] **Step 3: Create `.env.example`**

```
JWT_SECRET=change_me_to_a_long_random_string
JWT_REFRESH_SECRET=another_long_random_string
PORT=3001
DB_PATH=/data/census.db
NODE_ENV=production
```

- [ ] **Step 4: Create `.env`** (copy and fill in real values)

```bash
cp .env.example .env
# Edit .env: set JWT_SECRET and JWT_REFRESH_SECRET to random strings (32+ chars)
```

- [ ] **Step 5: Create `docker-compose.yml`**

```yaml
version: '3.9'

services:
  api:
    build: ./server
    restart: unless-stopped
    env_file: .env
    volumes:
      - db_data:/data
      - ./QA:/app/QA:ro
    networks:
      - internal

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - client_build:/usr/share/nginx/html:ro
    depends_on:
      - api
    networks:
      - internal

volumes:
  db_data:
  client_build:

networks:
  internal:
```

Note: client build volume will be populated in Task 13.

- [ ] **Step 6: Commit**

```bash
git add .gitignore .env.example docker-compose.yml
git commit -m "chore: project scaffold, gitignore, docker-compose skeleton"
```

---

### Task 2: Nginx config

**Files:**
- Create: `nginx/nginx.conf`

- [ ] **Step 1: Create `nginx/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Serve React SPA — all non-API routes fall back to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Express
    location /api/ {
        proxy_pass http://api:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add nginx/nginx.conf
git commit -m "chore: nginx config — SPA fallback + API proxy"
```

---

### Task 3: Express server + SQLite connection + migrations

**Files:**
- Create: `server/package.json`
- Create: `server/index.js`
- Create: `server/db/database.js`
- Create: `server/db/migrations.js`
- Create: `server/Dockerfile`

- [ ] **Step 1: Create `server/package.json`**

```json
{
  "name": "census2027-api",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "test": "jest --runInBand --forceExit"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3",
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "express": "^4.18.3",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.1.0",
    "supertest": "^6.3.4"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/__tests__/**/*.test.js"]
  }
}
```

- [ ] **Step 2: Install server dependencies**

```bash
cd server && npm install
```

- [ ] **Step 3: Create `server/db/database.js`**

```js
const Database = require('better-sqlite3');
const path = require('path');
const { runMigrations } = require('./migrations');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../census.db');

let _db = null;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    runMigrations(_db);
  }
  return _db;
}

function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

module.exports = { getDb, closeDb };
```

- [ ] **Step 4: Create `server/db/migrations.js`**

```js
function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mobile TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      functionary_type TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      role TEXT NOT NULL DEFAULT 'user',
      total_points INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter INTEGER NOT NULL,
      topic TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      question_en TEXT NOT NULL,
      question_hi TEXT NOT NULL,
      options_en TEXT NOT NULL,
      options_hi TEXT NOT NULL,
      correct_option INTEGER NOT NULL,
      explanation_en TEXT NOT NULL,
      explanation_hi TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      mode TEXT NOT NULL,
      chapter INTEGER,
      score INTEGER NOT NULL DEFAULT 0,
      max_score INTEGER NOT NULL DEFAULT 0,
      streak_max INTEGER NOT NULL DEFAULT 0,
      time_taken INTEGER,
      completed INTEGER NOT NULL DEFAULT 0,
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS quiz_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES quiz_sessions(id),
      question_id INTEGER NOT NULL REFERENCES questions(id),
      chosen_option INTEGER,
      is_correct INTEGER NOT NULL DEFAULT 0,
      points_earned INTEGER NOT NULL DEFAULT 0,
      time_taken INTEGER
    );

    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_hi TEXT NOT NULL,
      description_en TEXT NOT NULL,
      description_hi TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '🏅',
      criteria_type TEXT NOT NULL,
      criteria_value INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      badge_id INTEGER NOT NULL REFERENCES badges(id),
      earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      shared INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, badge_id)
    );

    CREATE TABLE IF NOT EXISTS daily_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, date)
    );
  `);

  // Seed default badges if table is empty
  const count = db.prepare('SELECT COUNT(*) as c FROM badges').get();
  if (count.c === 0) {
    const insert = db.prepare(`
      INSERT INTO badges (name_en, name_hi, description_en, description_hi, icon, criteria_type, criteria_value)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const seedBadges = db.transaction(() => {
      insert.run('First Step', 'पहला कदम', 'Complete your first quiz', 'पहली प्रश्नोत्तरी पूरी करें', '🌟', 'quizzes_completed', 1);
      insert.run('On Fire', 'जोश में', '10 correct answers in a row', 'लगातार 10 सही उत्तर', '🔥', 'streak', 10);
      insert.run('Week Warrior', 'सप्ताह योद्धा', 'Complete daily quiz 7 days in a row', '7 दिन लगातार दैनिक प्रश्नोत्तरी', '📅', 'daily_streak', 7);
      insert.run('Perfect Score', 'पूर्ण अंक', '100% on a timed quiz', 'समयबद्ध प्रश्नोत्तरी में 100%', '💯', 'perfect_timed', 1);
      insert.run('Chapter Master', 'अध्याय विशेषज्ञ', 'Complete all questions in a chapter', 'एक अध्याय के सभी प्रश्न पूरे करें', '📚', 'chapters_completed', 1);
      insert.run('Census Expert', 'जनगणना विशेषज्ञ', 'Complete all 6 chapters', 'सभी 6 अध्याय पूरे करें', '🏆', 'chapters_completed', 6);
      insert.run('Top of the Day', 'दिन के शीर्ष', 'Rank #1 on daily leaderboard', 'दैनिक लीडरबोर्ड पर #1', '🥇', 'daily_rank_1', 1);
      insert.run('Star Enumerator', 'स्टार गणनाकार', 'Earn 500 points as Enumerator', 'गणनाकार के रूप में 500 अंक', '⭐', 'points', 500);
    });
    seedBadges();
  }
}

module.exports = { runMigrations };
```

- [ ] **Step 5: Create `server/index.js`**

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDb } = require('./db/database');
const { seedQuestions } = require('./db/seeder');

const authRoutes = require('./routes/auth');
const quizRoutes = require('./routes/quiz');
const leaderboardRoutes = require('./routes/leaderboard');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json());

// Initialise DB + seed questions
getDb();
seedQuestions();

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
if (require.main === module) {
  app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
}

module.exports = app;
```

- [ ] **Step 6: Create `server/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

- [ ] **Step 7: Commit**

```bash
cd ..
git add server/
git commit -m "feat: express server, sqlite connection, schema migrations, default badges"
```

---

### Task 4: QA seeder

**Files:**
- Create: `server/db/seeder.js`
- Create: `QA/Misc/questions.json` (sample, if not already populated)

- [ ] **Step 1: Create `server/db/seeder.js`**

```js
const fs = require('fs');
const path = require('path');
const { getDb } = require('./database');

const QA_DIR = process.env.QA_DIR || path.join(__dirname, '../../../QA');

function seedQuestions() {
  if (!fs.existsSync(QA_DIR)) {
    console.log(`QA directory not found at ${QA_DIR}, skipping seed.`);
    return;
  }

  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO questions
      (chapter, topic, difficulty, question_en, question_hi,
       options_en, options_hi, correct_option, explanation_en, explanation_hi)
    VALUES
      (@chapter, @topic, @difficulty, @question_en, @question_hi,
       @options_en, @options_hi, @correct_option, @explanation_en, @explanation_hi)
    ON CONFLICT DO NOTHING
  `);

  const topics = fs.readdirSync(QA_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let total = 0;
  for (const topic of topics) {
    const filePath = path.join(QA_DIR, topic, 'questions.json');
    if (!fs.existsSync(filePath)) continue;

    let questions;
    try {
      questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.error(`Failed to parse ${filePath}: ${e.message}`);
      continue;
    }

    const insertMany = db.transaction((qs) => {
      for (const q of qs) {
        upsert.run({
          chapter: q.chapter,
          topic: q.topic || topic,
          difficulty: q.difficulty,
          question_en: q.question_en,
          question_hi: q.question_hi,
          options_en: JSON.stringify(q.options_en),
          options_hi: JSON.stringify(q.options_hi),
          correct_option: q.correct_option,
          explanation_en: q.explanation_en,
          explanation_hi: q.explanation_hi,
        });
      }
    });
    insertMany(questions);
    total += questions.length;
  }
  console.log(`QA seeder: processed ${total} questions from ${topics.length} topic(s).`);
}

module.exports = { seedQuestions };
```

- [ ] **Step 2: Add a sample question to `QA/Misc/questions.json`** (if the file is empty or missing content)

```json
[
  {
    "chapter": 1,
    "topic": "Introduction",
    "difficulty": "easy",
    "question_en": "In which year is Census 2027 scheduled to begin its field operations?",
    "question_hi": "जनगणना 2027 की क्षेत्रीय गतिविधियाँ किस वर्ष से शुरू होने वाली हैं?",
    "options_en": ["2025", "2026", "2027", "2028"],
    "options_hi": ["2025", "2026", "2027", "2028"],
    "correct_option": 1,
    "explanation_en": "Census 2027 field operations (Houselisting) are scheduled to begin in 2026.",
    "explanation_hi": "जनगणना 2027 की क्षेत्रीय गतिविधियाँ (मकान सूचीकरण) 2026 में शुरू होने वाली हैं।"
  }
]
```

- [ ] **Step 3: Write a test for the seeder**

Create `server/__tests__/seeder.test.js`:

```js
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Use an in-memory-like temp DB for tests
process.env.DB_PATH = path.join(os.tmpdir(), `test-${Date.now()}.db`);
process.env.QA_DIR = path.join(__dirname, '../../QA');

const { runMigrations } = require('../db/migrations');
const { seedQuestions } = require('../db/seeder');
const { getDb, closeDb } = require('../db/database');

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

test('seedQuestions imports at least one question from QA/Misc', () => {
  seedQuestions();
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM questions').get();
  expect(count.c).toBeGreaterThan(0);
});
```

- [ ] **Step 4: Run the test**

```bash
cd server && npm test -- --testPathPattern=seeder
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd ..
git add server/db/seeder.js server/__tests__/seeder.test.js QA/
git commit -m "feat: QA seeder — imports topic question files into SQLite on startup"
```

---

## Phase 2: Backend Auth

### Task 5: Auth service

**Files:**
- Create: `server/services/authService.js`
- Create: `server/__tests__/auth.test.js`

- [ ] **Step 1: Create `server/services/authService.js`**

```js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const FUNCTIONARY_TYPES = ['Enumerator', 'Supervisor', 'Charge Officer', 'Field Trainer', 'Census Staff (General)'];

function register({ mobile, password, name, functionary_type, state, district }) {
  if (!FUNCTIONARY_TYPES.includes(functionary_type)) {
    throw Object.assign(new Error('Invalid functionary type'), { status: 400 });
  }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE mobile = ?').get(mobile);
  if (existing) throw Object.assign(new Error('Mobile already registered'), { status: 409 });

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (mobile, password_hash, name, functionary_type, state, district)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(mobile, password_hash, name, functionary_type, state, district);

  return { id: result.lastInsertRowid, mobile, name, functionary_type, state, district };
}

function login({ mobile, password }) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE mobile = ?').get(mobile);
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  return { tokens: issueTokens(user), user: safeUser(user) };
}

function issueTokens(user) {
  const payload = { sub: user.id, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
  if (!user) throw Object.assign(new Error('User not found'), { status: 401 });
  return { tokens: issueTokens(user) };
}

function safeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

module.exports = { register, login, refresh, safeUser };
```

- [ ] **Step 2: Write failing tests**

Create `server/__tests__/auth.test.js`:

```js
const path = require('path');
const os = require('os');
const fs = require('fs');

process.env.DB_PATH = path.join(os.tmpdir(), `auth-test-${Date.now()}.db`);
process.env.JWT_SECRET = 'test-secret-access';
process.env.JWT_REFRESH_SECRET = 'test-secret-refresh';
process.env.QA_DIR = '/tmp/no-qa';

const { register, login, refresh } = require('../services/authService');
const { closeDb } = require('../db/database');

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

const user = {
  mobile: '9876543210',
  password: 'Password123',
  name: 'Test User',
  functionary_type: 'Enumerator',
  state: 'Chhattisgarh',
  district: 'Raipur',
};

test('register creates a new user', () => {
  const result = register(user);
  expect(result.id).toBeDefined();
  expect(result.mobile).toBe(user.mobile);
});

test('register rejects duplicate mobile', () => {
  expect(() => register(user)).toThrow('Mobile already registered');
});

test('register rejects invalid functionary type', () => {
  expect(() => register({ ...user, mobile: '1111111111', functionary_type: 'Hacker' })).toThrow('Invalid functionary type');
});

test('login returns tokens and user for valid credentials', () => {
  const result = login({ mobile: user.mobile, password: user.password });
  expect(result.tokens.accessToken).toBeDefined();
  expect(result.tokens.refreshToken).toBeDefined();
  expect(result.user.password_hash).toBeUndefined();
});

test('login rejects wrong password', () => {
  expect(() => login({ mobile: user.mobile, password: 'wrong' })).toThrow('Invalid credentials');
});

test('refresh issues new tokens from valid refresh token', () => {
  const { tokens } = login({ mobile: user.mobile, password: user.password });
  const result = refresh(tokens.refreshToken);
  expect(result.tokens.accessToken).toBeDefined();
});

test('refresh rejects invalid token', () => {
  expect(() => refresh('bad-token')).toThrow('Invalid refresh token');
});
```

- [ ] **Step 3: Run tests**

```bash
cd server && npm test -- --testPathPattern=auth
```

Expected: all 7 tests PASS

- [ ] **Step 4: Commit**

```bash
cd ..
git add server/services/authService.js server/__tests__/auth.test.js
git commit -m "feat: auth service — register, login, JWT token issuance and refresh"
```

---

### Task 6: Auth middleware + auth routes

**Files:**
- Create: `server/middleware/auth.js`
- Create: `server/middleware/adminOnly.js`
- Create: `server/routes/auth.js`

- [ ] **Step 1: Create `server/middleware/auth.js`**

```js
const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = auth;
```

- [ ] **Step 2: Create `server/middleware/adminOnly.js`**

```js
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = adminOnly;
```

- [ ] **Step 3: Create `server/routes/auth.js`**

```js
const express = require('express');
const router = express.Router();
const { register, login, refresh } = require('../services/authService');

function handle(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  };
}

router.post('/register', handle(({ mobile, password, name, functionary_type, state, district }) =>
  register({ mobile, password, name, functionary_type, state, district })
));

router.post('/login', handle(({ mobile, password }) =>
  login({ mobile, password })
));

router.post('/refresh', handle(({ refreshToken }) =>
  refresh(refreshToken)
));

module.exports = router;
```

- [ ] **Step 4: Wire routes into `server/index.js`** (already done in Task 3 — verify the require statements are present)

- [ ] **Step 5: Start server locally and smoke-test**

```bash
cd server && node -e "
  process.env.JWT_SECRET='test';
  process.env.JWT_REFRESH_SECRET='test2';
  process.env.DB_PATH='/tmp/smoke.db';
  process.env.QA_DIR='../QA';
  require('./index');
" &
sleep 2
curl -s -X POST http://localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"mobile":"9000000001","password":"pass123","name":"Test","functionary_type":"Enumerator","state":"CG","district":"Raipur"}' | jq .
kill %1
```

Expected: `{"id":1,"mobile":"9000000001","name":"Test",...}`

- [ ] **Step 6: Commit**

```bash
cd ..
git add server/middleware/ server/routes/auth.js
git commit -m "feat: auth routes and JWT middleware"
```

---

## Phase 3: Backend Quiz Engine

### Task 7: Quiz service

**Files:**
- Create: `server/services/quizService.js`
- Create: `server/__tests__/quiz.test.js`

- [ ] **Step 1: Create `server/services/quizService.js`**

```js
const { getDb } = require('../db/database');

// Scoring constants
const BASE_POINTS = { easy: 10, medium: 20, hard: 30 };

function streakMultiplier(streak) {
  if (streak >= 10) return 3.0;
  if (streak >= 5) return 2.0;
  if (streak >= 3) return 1.5;
  return 1.0;
}

function calcPoints(difficulty, streak) {
  const base = BASE_POINTS[difficulty] || 10;
  return Math.round(base * streakMultiplier(streak));
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

// Get questions for a quiz mode
function getQuestions({ mode, chapter }) {
  const db = getDb();
  if (mode === 'daily') {
    return db.prepare('SELECT * FROM questions ORDER BY RANDOM() LIMIT 10').all();
  }
  if (mode === 'timed') {
    return db.prepare('SELECT * FROM questions WHERE chapter = ? ORDER BY RANDOM() LIMIT 15').all(chapter);
  }
  if (mode === 'practice') {
    return db.prepare('SELECT * FROM questions WHERE chapter = ? ORDER BY id').all(chapter);
  }
  throw Object.assign(new Error('Invalid quiz mode'), { status: 400 });
}

// Check if user already completed today's daily quiz
function hasCompletedDailyToday(userId) {
  const db = getDb();
  const today = getTodayDate();
  const session = db.prepare(
    "SELECT id FROM quiz_sessions WHERE user_id=? AND mode='daily' AND date(started_at)=? AND completed=1"
  ).get(userId, today);
  return !!session;
}

// Start a new session (or resume practice)
function startSession({ userId, mode, chapter }) {
  const db = getDb();

  if (mode === 'daily' && hasCompletedDailyToday(userId)) {
    throw Object.assign(new Error('Daily quiz already completed today'), { status: 409 });
  }

  // Resume incomplete practice session
  if (mode === 'practice') {
    const existing = db.prepare(
      "SELECT * FROM quiz_sessions WHERE user_id=? AND mode='practice' AND chapter=? AND completed=0 ORDER BY id DESC LIMIT 1"
    ).get(userId, chapter);
    if (existing) {
      const answered = db.prepare('SELECT question_id FROM quiz_answers WHERE session_id=?').all(existing.id);
      const questions = getQuestions({ mode, chapter });
      const answeredIds = new Set(answered.map(a => a.question_id));
      const remaining = questions.filter(q => !answeredIds.has(q.id));
      return { sessionId: existing.id, questions: remaining, resumed: true };
    }
  }

  const questions = getQuestions({ mode, chapter: chapter || null });
  const maxScore = questions.reduce((sum, q) => sum + (BASE_POINTS[q.difficulty] || 10) * 3, 0);

  const result = db.prepare(`
    INSERT INTO quiz_sessions (user_id, mode, chapter, max_score)
    VALUES (?, ?, ?, ?)
  `).run(userId, mode, chapter || null, maxScore);

  return { sessionId: result.lastInsertRowid, questions, resumed: false };
}

// Submit an answer for a question in a session
function submitAnswer({ sessionId, questionId, chosenOption, timeTaken }) {
  const db = getDb();

  const session = db.prepare('SELECT * FROM quiz_sessions WHERE id=?').get(sessionId);
  if (!session || session.completed) {
    throw Object.assign(new Error('Session not found or already completed'), { status: 404 });
  }

  const question = db.prepare('SELECT * FROM questions WHERE id=?').get(questionId);
  if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });

  // Calculate current streak in this session
  const prevAnswers = db.prepare(
    'SELECT is_correct FROM quiz_answers WHERE session_id=? ORDER BY id DESC'
  ).all(sessionId);
  let streak = 0;
  for (const a of prevAnswers) {
    if (a.is_correct) streak++;
    else break;
  }

  const isCorrect = chosenOption === question.correct_option ? 1 : 0;
  const currentStreak = isCorrect ? streak + 1 : 0;
  const pointsEarned = isCorrect ? calcPoints(question.difficulty, currentStreak) : 0;

  db.prepare(`
    INSERT INTO quiz_answers (session_id, question_id, chosen_option, is_correct, points_earned, time_taken)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, questionId, chosenOption, isCorrect, pointsEarned, timeTaken || null);

  return {
    isCorrect: !!isCorrect,
    correctOption: question.correct_option,
    explanation_en: question.explanation_en,
    explanation_hi: question.explanation_hi,
    pointsEarned,
    currentStreak,
  };
}

// Complete a session — compute final score, update user points and daily score
function completeSession(sessionId) {
  const db = getDb();

  const session = db.prepare('SELECT * FROM quiz_sessions WHERE id=?').get(sessionId);
  if (!session) throw Object.assign(new Error('Session not found'), { status: 404 });

  const answers = db.prepare('SELECT * FROM quiz_answers WHERE session_id=?').all(sessionId);
  const totalPoints = answers.reduce((sum, a) => sum + a.points_earned, 0);
  const streakMax = (() => {
    let max = 0, cur = 0;
    for (const a of answers) { cur = a.is_correct ? cur + 1 : 0; max = Math.max(max, cur); }
    return max;
  })();

  const correctCount = answers.filter(a => a.is_correct).length;
  const today = getTodayDate();

  db.prepare(`
    UPDATE quiz_sessions SET completed=1, score=?, streak_max=?, completed_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(totalPoints, streakMax, sessionId);

  // Add to user total_points
  db.prepare('UPDATE users SET total_points = total_points + ? WHERE id=?').run(totalPoints, session.user_id);

  // Upsert daily score
  db.prepare(`
    INSERT INTO daily_scores (user_id, date, points) VALUES (?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET points = points + excluded.points
  `).run(session.user_id, today, totalPoints);

  return { totalPoints, correctCount, totalQuestions: answers.length, streakMax };
}

module.exports = { startSession, submitAnswer, completeSession, hasCompletedDailyToday, calcPoints, streakMultiplier };
```

- [ ] **Step 2: Write failing tests**

Create `server/__tests__/quiz.test.js`:

```js
const path = require('path');
const os = require('os');
const fs = require('fs');

process.env.DB_PATH = path.join(os.tmpdir(), `quiz-test-${Date.now()}.db`);
process.env.JWT_SECRET = 'test';
process.env.JWT_REFRESH_SECRET = 'test2';
process.env.QA_DIR = path.join(__dirname, '../../QA');

const { getDb, closeDb } = require('../db/database');
const { register } = require('../services/authService');
const { startSession, submitAnswer, completeSession, calcPoints, streakMultiplier } = require('../services/quizService');

let userId;

beforeAll(() => {
  getDb(); // triggers migrations + badge seed
  const { seedQuestions } = require('../db/seeder');
  seedQuestions();
  const u = register({ mobile: '9000000001', password: 'pass', name: 'Quiz Tester', functionary_type: 'Enumerator', state: 'CG', district: 'Raipur' });
  userId = u.id;
});

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

test('streakMultiplier returns correct values', () => {
  expect(streakMultiplier(0)).toBe(1.0);
  expect(streakMultiplier(2)).toBe(1.0);
  expect(streakMultiplier(3)).toBe(1.5);
  expect(streakMultiplier(5)).toBe(2.0);
  expect(streakMultiplier(10)).toBe(3.0);
});

test('calcPoints multiplies base by streak multiplier', () => {
  expect(calcPoints('easy', 0)).toBe(10);
  expect(calcPoints('easy', 3)).toBe(15);
  expect(calcPoints('hard', 10)).toBe(90);
});

test('startSession returns questions and sessionId', () => {
  const { sessionId, questions } = startSession({ userId, mode: 'daily' });
  expect(sessionId).toBeDefined();
  expect(questions.length).toBeGreaterThan(0);
});

test('submitAnswer records correct answer and returns points', () => {
  const { sessionId, questions } = startSession({ userId, mode: 'timed', chapter: 1 });
  const q = questions[0];
  const result = submitAnswer({ sessionId, questionId: q.id, chosenOption: q.correct_option });
  expect(result.isCorrect).toBe(true);
  expect(result.pointsEarned).toBeGreaterThan(0);
});

test('completeSession updates user total_points', () => {
  const { sessionId, questions } = startSession({ userId, mode: 'timed', chapter: 1 });
  for (const q of questions) {
    submitAnswer({ sessionId, questionId: q.id, chosenOption: q.correct_option });
  }
  const db = getDb();
  const before = db.prepare('SELECT total_points FROM users WHERE id=?').get(userId).total_points;
  const result = completeSession(sessionId);
  const after = db.prepare('SELECT total_points FROM users WHERE id=?').get(userId).total_points;
  expect(after).toBe(before + result.totalPoints);
});
```

- [ ] **Step 3: Run tests**

```bash
cd server && npm test -- --testPathPattern=quiz
```

Expected: all 5 tests PASS

- [ ] **Step 4: Commit**

```bash
cd ..
git add server/services/quizService.js server/__tests__/quiz.test.js
git commit -m "feat: quiz service — session management, answer scoring, streak logic"
```

---

### Task 8: Quiz routes

**Files:**
- Create: `server/routes/quiz.js`

- [ ] **Step 1: Create `server/routes/quiz.js`**

```js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { startSession, submitAnswer, completeSession, hasCompletedDailyToday } = require('../services/quizService');
const { awardBadges } = require('../services/badgeService');

function handle(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  };
}

// GET /api/quiz/daily/status — check if user already completed today
router.get('/daily/status', auth, handle(req => ({
  completed: hasCompletedDailyToday(req.user.sub)
})));

// POST /api/quiz/start — start or resume a session
router.post('/start', auth, handle(req => {
  const { mode, chapter } = req.body;
  return startSession({ userId: req.user.sub, mode, chapter: chapter || null });
}));

// POST /api/quiz/answer — submit one answer
router.post('/answer', auth, handle(req => {
  const { sessionId, questionId, chosenOption, timeTaken } = req.body;
  return submitAnswer({ sessionId, questionId, chosenOption, timeTaken });
}));

// POST /api/quiz/complete — complete a session
router.post('/complete', auth, handle(async req => {
  const { sessionId } = req.body;
  const result = completeSession(sessionId);
  const newBadges = awardBadges(req.user.sub);
  return { ...result, newBadges };
}));

module.exports = router;
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/quiz.js
git commit -m "feat: quiz API routes — start, answer, complete"
```

---

## Phase 4: Backend Gamification

### Task 9: Badge service

**Files:**
- Create: `server/services/badgeService.js`
- Create: `server/__tests__/badge.test.js`

- [ ] **Step 1: Create `server/services/badgeService.js`**

```js
const { getDb } = require('../db/database');

function awardBadges(userId) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  if (!user) return [];

  const allBadges = db.prepare('SELECT * FROM badges').all();
  const alreadyEarned = new Set(
    db.prepare('SELECT badge_id FROM user_badges WHERE user_id=?').all(userId).map(r => r.badge_id)
  );

  const newBadges = [];

  for (const badge of allBadges) {
    if (alreadyEarned.has(badge.id)) continue;

    let earned = false;

    if (badge.criteria_type === 'quizzes_completed') {
      const count = db.prepare("SELECT COUNT(*) as c FROM quiz_sessions WHERE user_id=? AND completed=1").get(userId).c;
      earned = count >= badge.criteria_value;
    } else if (badge.criteria_type === 'streak') {
      const max = db.prepare("SELECT MAX(streak_max) as m FROM quiz_sessions WHERE user_id=? AND completed=1").get(userId).m || 0;
      earned = max >= badge.criteria_value;
    } else if (badge.criteria_type === 'daily_streak') {
      // Count consecutive days with a completed daily quiz (ending today)
      const days = db.prepare(
        "SELECT date(started_at) as d FROM quiz_sessions WHERE user_id=? AND mode='daily' AND completed=1 ORDER BY started_at DESC"
      ).all(userId).map(r => r.d);
      let streak = 0;
      let expected = new Date();
      for (const d of days) {
        const day = new Date(d);
        if (day.toISOString().slice(0,10) === expected.toISOString().slice(0,10)) {
          streak++;
          expected.setDate(expected.getDate() - 1);
        } else break;
      }
      earned = streak >= badge.criteria_value;
    } else if (badge.criteria_type === 'perfect_timed') {
      const perfect = db.prepare(
        "SELECT id FROM quiz_sessions WHERE user_id=? AND mode='timed' AND completed=1 AND score=max_score AND max_score > 0"
      ).get(userId);
      earned = !!perfect;
    } else if (badge.criteria_type === 'chapters_completed') {
      const completedChapters = db.prepare(
        "SELECT DISTINCT chapter FROM quiz_sessions WHERE user_id=? AND mode='practice' AND completed=1"
      ).all(userId).length;
      earned = completedChapters >= badge.criteria_value;
    } else if (badge.criteria_type === 'points') {
      earned = user.total_points >= badge.criteria_value;
    } else if (badge.criteria_type === 'daily_rank_1') {
      const today = new Date().toISOString().slice(0,10);
      const top = db.prepare("SELECT user_id FROM daily_scores WHERE date=? ORDER BY points DESC LIMIT 1").get(today);
      earned = top?.user_id === userId;
    }

    if (earned) {
      try {
        db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, badge.id);
        newBadges.push(badge);
      } catch {}
    }
  }

  return newBadges;
}

module.exports = { awardBadges };
```

- [ ] **Step 2: Write failing tests**

Create `server/__tests__/badge.test.js`:

```js
const path = require('path');
const os = require('os');
const fs = require('fs');

process.env.DB_PATH = path.join(os.tmpdir(), `badge-test-${Date.now()}.db`);
process.env.JWT_SECRET = 'test';
process.env.JWT_REFRESH_SECRET = 'test2';
process.env.QA_DIR = path.join(__dirname, '../../QA');

const { getDb, closeDb } = require('../db/database');
const { register } = require('../services/authService');
const { startSession, submitAnswer, completeSession } = require('../services/quizService');
const { awardBadges } = require('../services/badgeService');

let userId;

beforeAll(() => {
  getDb();
  require('../db/seeder').seedQuestions();
  const u = register({ mobile: '9000000002', password: 'pass', name: 'Badge Tester', functionary_type: 'Enumerator', state: 'CG', district: 'Raipur' });
  userId = u.id;
});

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

test('awardBadges returns First Step badge after completing first quiz', () => {
  const { sessionId, questions } = startSession({ userId, mode: 'timed', chapter: 1 });
  for (const q of questions) submitAnswer({ sessionId, questionId: q.id, chosenOption: 0 });
  completeSession(sessionId);

  const badges = awardBadges(userId);
  const names = badges.map(b => b.name_en);
  expect(names).toContain('First Step');
});

test('awardBadges does not re-award already-earned badges', () => {
  const { sessionId, questions } = startSession({ userId, mode: 'timed', chapter: 1 });
  for (const q of questions) submitAnswer({ sessionId, questionId: q.id, chosenOption: 0 });
  completeSession(sessionId);

  const badges = awardBadges(userId);
  const names = badges.map(b => b.name_en);
  expect(names).not.toContain('First Step');
});
```

- [ ] **Step 3: Run tests**

```bash
cd server && npm test -- --testPathPattern=badge
```

Expected: both tests PASS

- [ ] **Step 4: Commit**

```bash
cd ..
git add server/services/badgeService.js server/__tests__/badge.test.js
git commit -m "feat: badge service — auto-award badges on quiz completion"
```

---

### Task 10: Leaderboard service + routes

**Files:**
- Create: `server/services/leaderboardService.js`
- Create: `server/routes/leaderboard.js`

- [ ] **Step 1: Create `server/services/leaderboardService.js`**

```js
const { getDb } = require('../db/database');

function getDailyLeaderboard(userId) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const top10 = db.prepare(`
    SELECT u.id, u.name, u.functionary_type, ds.points,
           RANK() OVER (ORDER BY ds.points DESC) as rank
    FROM daily_scores ds
    JOIN users u ON u.id = ds.user_id
    WHERE ds.date = ?
    ORDER BY ds.points DESC
    LIMIT 10
  `).all(today);

  const userRow = db.prepare(`
    SELECT RANK() OVER (ORDER BY ds.points DESC) as rank, ds.points
    FROM daily_scores ds WHERE ds.user_id = ? AND ds.date = ?
  `).get(userId, today);

  return { leaderboard: top10, userRank: userRow || null };
}

function getOverallLeaderboard(userId) {
  const db = getDb();
  const top10 = db.prepare(`
    SELECT id, name, functionary_type, total_points as points,
           RANK() OVER (ORDER BY total_points DESC) as rank
    FROM users
    ORDER BY total_points DESC
    LIMIT 10
  `).all();

  const userRow = db.prepare(`
    SELECT RANK() OVER (ORDER BY total_points DESC) as rank, total_points as points
    FROM users WHERE id = ?
  `).get(userId);

  return { leaderboard: top10, userRank: userRow || null };
}

module.exports = { getDailyLeaderboard, getOverallLeaderboard };
```

- [ ] **Step 2: Create `server/routes/leaderboard.js`**

```js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDailyLeaderboard, getOverallLeaderboard } = require('../services/leaderboardService');

router.get('/daily', auth, (req, res) => {
  try {
    res.json(getDailyLeaderboard(req.user.sub));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/overall', auth, (req, res) => {
  try {
    res.json(getOverallLeaderboard(req.user.sub));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

- [ ] **Step 3: Commit**

```bash
git add server/services/leaderboardService.js server/routes/leaderboard.js
git commit -m "feat: leaderboard service + routes — daily and overall rankings"
```

---

### Task 11: User routes

**Files:**
- Create: `server/routes/user.js`

- [ ] **Step 1: Create `server/routes/user.js`**

```js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getDb } = require('../db/database');

router.get('/profile', auth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id,mobile,name,functionary_type,state,district,language,role,total_points,created_at,last_login FROM users WHERE id=?').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.put('/profile', auth, (req, res) => {
  const { name, district, state, language } = req.body;
  const db = getDb();
  db.prepare('UPDATE users SET name=COALESCE(?,name), district=COALESCE(?,district), state=COALESCE(?,state), language=COALESCE(?,language) WHERE id=?')
    .run(name || null, district || null, state || null, language || null, req.user.sub);
  const user = db.prepare('SELECT id,name,district,state,language FROM users WHERE id=?').get(req.user.sub);
  res.json(user);
});

router.get('/badges', auth, (req, res) => {
  const db = getDb();
  const badges = db.prepare(`
    SELECT b.*, ub.earned_at, ub.shared
    FROM user_badges ub JOIN badges b ON b.id = ub.badge_id
    WHERE ub.user_id = ? ORDER BY ub.earned_at DESC
  `).all(req.user.sub);
  res.json(badges);
});

router.get('/stats', auth, (req, res) => {
  const db = getDb();
  const userId = req.user.sub;
  const totalSessions = db.prepare("SELECT COUNT(*) as c FROM quiz_sessions WHERE user_id=? AND completed=1").get(userId).c;
  const chaptersCompleted = db.prepare("SELECT COUNT(DISTINCT chapter) as c FROM quiz_sessions WHERE user_id=? AND mode='practice' AND completed=1").get(userId).c;
  const totalBadges = db.prepare("SELECT COUNT(*) as c FROM user_badges WHERE user_id=?").get(userId).c;
  const bestStreak = db.prepare("SELECT MAX(streak_max) as m FROM quiz_sessions WHERE user_id=? AND completed=1").get(userId).m || 0;
  res.json({ totalSessions, chaptersCompleted, totalBadges, bestStreak });
});

module.exports = router;
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/user.js
git commit -m "feat: user routes — profile, badges, stats"
```

---

## Phase 5: Backend Admin

### Task 12: Admin routes

**Files:**
- Create: `server/routes/admin.js`

- [ ] **Step 1: Create `server/routes/admin.js`**

```js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');

router.use(auth, adminOnly);

// Dashboard stats
router.get('/dashboard', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='user'").get().c;
  const activeToday = db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM quiz_sessions WHERE date(started_at)=?").get(today).c;
  const quizzesToday = db.prepare("SELECT COUNT(*) as c FROM quiz_sessions WHERE date(started_at)=? AND completed=1").get(today).c;
  const badgesToday = db.prepare("SELECT COUNT(*) as c FROM user_badges WHERE date(earned_at)=?").get(today).c;
  const byType = db.prepare("SELECT functionary_type, COUNT(*) as count FROM users WHERE role='user' GROUP BY functionary_type").all();
  const chapterCompletion = db.prepare(`
    SELECT s.chapter,
      ROUND(100.0 * COUNT(DISTINCT s.user_id) / (SELECT COUNT(*) FROM users WHERE role='user'), 1) as pct
    FROM quiz_sessions s WHERE s.mode='practice' AND s.completed=1
    GROUP BY s.chapter ORDER BY s.chapter
  `).all();
  res.json({ totalUsers, activeToday, quizzesToday, badgesToday, byType, chapterCompletion });
});

// User list
router.get('/users', (req, res) => {
  const db = getDb();
  const { search, type, sort = 'total_points', order = 'DESC', page = 1, limit = 20 } = req.query;
  let query = "SELECT id,mobile,name,functionary_type,state,district,language,role,total_points,created_at,last_login FROM users WHERE 1=1";
  const params = [];
  if (search) { query += " AND (name LIKE ? OR mobile LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }
  if (type) { query += " AND functionary_type=?"; params.push(type); }
  const safeSort = ['total_points','created_at','last_login','name'].includes(sort) ? sort : 'total_points';
  const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';
  query += ` ORDER BY ${safeSort} ${safeOrder} LIMIT ? OFFSET ?`;
  params.push(Number(limit), (Number(page) - 1) * Number(limit));
  res.json(db.prepare(query).all(...params));
});

// Single user
router.get('/users/:id', (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT id,mobile,name,functionary_type,state,district,language,role,total_points,created_at,last_login FROM users WHERE id=?").get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const sessions = db.prepare("SELECT id,mode,chapter,score,max_score,streak_max,completed,started_at,completed_at FROM quiz_sessions WHERE user_id=? ORDER BY started_at DESC LIMIT 50").all(req.params.id);
  const badges = db.prepare("SELECT b.name_en,b.icon,ub.earned_at FROM user_badges ub JOIN badges b ON b.id=ub.badge_id WHERE ub.user_id=?").all(req.params.id);
  res.json({ user, sessions, badges });
});

// Create user
router.post('/users', (req, res) => {
  try {
    const { mobile, password, name, functionary_type, state, district, role } = req.body;
    const db = getDb();
    const hash = bcrypt.hashSync(password, 10);
    const result = db.prepare("INSERT INTO users (mobile,password_hash,name,functionary_type,state,district,role) VALUES (?,?,?,?,?,?,?)").run(mobile, hash, name, functionary_type, state, district, role || 'user');
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Update user
router.put('/users/:id', (req, res) => {
  const { name, functionary_type, state, district, language, role } = req.body;
  const db = getDb();
  db.prepare("UPDATE users SET name=COALESCE(?,name),functionary_type=COALESCE(?,functionary_type),state=COALESCE(?,state),district=COALESCE(?,district),language=COALESCE(?,language),role=COALESCE(?,role) WHERE id=?")
    .run(name||null, functionary_type||null, state||null, district||null, language||null, role||null, req.params.id);
  res.json({ ok: true });
});

// Delete user
router.delete('/users/:id', (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM users WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// Reset password
router.post('/users/:id/reset-password', (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password too short' });
  const db = getDb();
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(hash, req.params.id);
  res.json({ ok: true });
});

// User progress
router.get('/users/:id/progress', (req, res) => {
  const db = getDb();
  const pointsTimeline = db.prepare("SELECT date,points FROM daily_scores WHERE user_id=? ORDER BY date ASC").all(req.params.id);
  const chapterStatus = db.prepare("SELECT chapter, MAX(completed) as done FROM quiz_sessions WHERE user_id=? AND mode='practice' GROUP BY chapter").all(req.params.id);
  res.json({ pointsTimeline, chapterStatus });
});

// Badge management
router.get('/badges', (req, res) => {
  res.json(getDb().prepare("SELECT * FROM badges").all());
});

router.post('/badges', (req, res) => {
  const { name_en, name_hi, description_en, description_hi, icon, criteria_type, criteria_value } = req.body;
  const result = getDb().prepare("INSERT INTO badges (name_en,name_hi,description_en,description_hi,icon,criteria_type,criteria_value) VALUES (?,?,?,?,?,?,?)")
    .run(name_en, name_hi, description_en, description_hi, icon||'🏅', criteria_type, criteria_value);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/badges/:id', (req, res) => {
  const { name_en, name_hi, description_en, description_hi, icon, criteria_type, criteria_value } = req.body;
  getDb().prepare("UPDATE badges SET name_en=COALESCE(?,name_en),name_hi=COALESCE(?,name_hi),description_en=COALESCE(?,description_en),description_hi=COALESCE(?,description_hi),icon=COALESCE(?,icon),criteria_type=COALESCE(?,criteria_type),criteria_value=COALESCE(?,criteria_value) WHERE id=?")
    .run(name_en||null,name_hi||null,description_en||null,description_hi||null,icon||null,criteria_type||null,criteria_value||null,req.params.id);
  res.json({ ok: true });
});

router.delete('/badges/:id', (req, res) => {
  getDb().prepare("DELETE FROM badges WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/admin.js
git commit -m "feat: admin routes — dashboard, user CRUD, password reset, badge management"
```

---

## Phase 6: Frontend Foundation

### Task 13: React + Vite scaffold + Tailwind

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/index.html`
- Create: `client/src/main.jsx`
- Create: `client/Dockerfile`

- [ ] **Step 1: Create `client/package.json`**

```json
{
  "name": "census2027-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.28.0",
    "axios": "^1.6.8",
    "html2canvas": "^1.4.1",
    "i18next": "^23.10.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-i18next": "^14.1.0",
    "react-router-dom": "^6.22.2",
    "recharts": "^2.12.2",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.1",
    "vite": "^5.2.0"
  }
}
```

- [ ] **Step 2: Install client dependencies**

```bash
cd client && npm install
```

- [ ] **Step 3: Create `client/vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
```

- [ ] **Step 4: Create `client/tailwind.config.js`**

```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 5: Create `client/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create `client/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Census 2027 Training</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `client/src/main.jsx`**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './i18n';
import './index.css';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
```

- [ ] **Step 8: Create `client/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9: Create `client/Dockerfile`** (multi-stage: build then serve via nginx static volume)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# The dist folder is used by the nginx service via a named volume.
# We copy it to a shared location that docker-compose mounts.
FROM alpine:3
COPY --from=builder /app/dist /dist
```

Update `docker-compose.yml` to build client and copy dist into the nginx volume:

```yaml
version: '3.9'

services:
  client-builder:
    build: ./client
    volumes:
      - client_build:/dist
    command: cp -r /dist/. /dist-out
    # This service runs once to populate the volume

  api:
    build: ./server
    restart: unless-stopped
    env_file: .env
    volumes:
      - db_data:/data
      - ./QA:/app/QA:ro
    networks:
      - internal

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - client_build:/usr/share/nginx/html:ro
    depends_on:
      - api
    networks:
      - internal

volumes:
  db_data:
  client_build:

networks:
  internal:
```

Note: For development, run `cd client && npm run dev` which proxies `/api` to Express via vite.config.js.

- [ ] **Step 10: Verify dev server starts**

```bash
cd client && npm run dev
```

Expected: Vite dev server running at http://localhost:5173 (blank page, no errors in console)

- [ ] **Step 11: Commit**

```bash
cd ..
git add client/
git commit -m "feat: react+vite+tailwind client scaffold"
```

---

### Task 14: i18n setup + language files

**Files:**
- Create: `client/src/i18n.js`
- Create: `client/src/locales/en.json`
- Create: `client/src/locales/hi.json`

- [ ] **Step 1: Create `client/src/i18n.js`**

```js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: localStorage.getItem('language') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

- [ ] **Step 2: Create `client/src/locales/en.json`**

```json
{
  "app_title": "Census 2027 Training",
  "login": "Login",
  "register": "Register",
  "mobile": "Mobile Number",
  "password": "Password",
  "name": "Full Name",
  "state": "State",
  "district": "District",
  "functionary_type": "Functionary Type",
  "home": "Home",
  "quiz": "Quiz",
  "leaderboard": "Leaderboard",
  "profile": "Profile",
  "daily_quiz": "Daily Quiz",
  "timed_quiz": "Timed Quiz",
  "practice": "Chapter Practice",
  "start_quiz": "Start Quiz",
  "next": "Next",
  "submit": "Submit",
  "correct": "Correct!",
  "wrong": "Wrong!",
  "explanation": "Explanation",
  "points_earned": "Points Earned",
  "streak": "Streak",
  "your_rank": "Your Rank",
  "overall": "Overall",
  "daily": "Daily",
  "badges": "Badges",
  "share": "Share",
  "download": "Download",
  "total_points": "Total Points",
  "chapter": "Chapter",
  "difficulty": "Difficulty",
  "easy": "Easy",
  "medium": "Medium",
  "hard": "Hard",
  "quiz_complete": "Quiz Complete!",
  "daily_already_done": "Daily quiz already completed today. Come back tomorrow!",
  "select_chapter": "Select Chapter",
  "resume": "Resume",
  "save_badge": "Save Badge",
  "language": "Language",
  "logout": "Logout",
  "functionary_types": {
    "Enumerator": "Enumerator",
    "Supervisor": "Supervisor",
    "Charge Officer": "Charge Officer",
    "Field Trainer": "Field Trainer",
    "Census Staff (General)": "Census Staff (General)"
  },
  "chapters": {
    "1": "Chapter 1: Introduction",
    "2": "Chapter 2: Roles and Responsibilities",
    "3": "Chapter 3: Legal Provisions",
    "4": "Chapter 4: Numbering of Buildings",
    "5": "Chapter 5: Houselisting Questions",
    "6": "Chapter 6: Self-Enumeration"
  }
}
```

- [ ] **Step 3: Create `client/src/locales/hi.json`**

```json
{
  "app_title": "जनगणना 2027 प्रशिक्षण",
  "login": "लॉगिन",
  "register": "रजिस्टर करें",
  "mobile": "मोबाइल नंबर",
  "password": "पासवर्ड",
  "name": "पूरा नाम",
  "state": "राज्य",
  "district": "जिला",
  "functionary_type": "पदाधिकारी प्रकार",
  "home": "होम",
  "quiz": "प्रश्नोत्तरी",
  "leaderboard": "लीडरबोर्ड",
  "profile": "प्रोफ़ाइल",
  "daily_quiz": "दैनिक प्रश्नोत्तरी",
  "timed_quiz": "समयबद्ध प्रश्नोत्तरी",
  "practice": "अध्याय अभ्यास",
  "start_quiz": "प्रश्नोत्तरी शुरू करें",
  "next": "आगे",
  "submit": "जमा करें",
  "correct": "सही!",
  "wrong": "गलत!",
  "explanation": "व्याख्या",
  "points_earned": "अर्जित अंक",
  "streak": "स्ट्रीक",
  "your_rank": "आपकी रैंक",
  "overall": "समग्र",
  "daily": "दैनिक",
  "badges": "बैज",
  "share": "साझा करें",
  "download": "डाउनलोड",
  "total_points": "कुल अंक",
  "chapter": "अध्याय",
  "difficulty": "कठिनाई",
  "easy": "आसान",
  "medium": "मध्यम",
  "hard": "कठिन",
  "quiz_complete": "प्रश्नोत्तरी पूर्ण!",
  "daily_already_done": "आज की दैनिक प्रश्नोत्तरी पूरी हो गई। कल वापस आएं!",
  "select_chapter": "अध्याय चुनें",
  "resume": "जारी रखें",
  "save_badge": "बैज सेव करें",
  "language": "भाषा",
  "logout": "लॉगआउट",
  "functionary_types": {
    "Enumerator": "गणनाकार",
    "Supervisor": "पर्यवेक्षक",
    "Charge Officer": "प्रभारी अधिकारी",
    "Field Trainer": "क्षेत्र प्रशिक्षक",
    "Census Staff (General)": "जनगणना कर्मचारी (सामान्य)"
  },
  "chapters": {
    "1": "अध्याय 1: परिचय",
    "2": "अध्याय 2: भूमिकाएं और जिम्मेदारियां",
    "3": "अध्याय 3: कानूनी प्रावधान",
    "4": "अध्याय 4: भवन क्रमांकन",
    "5": "अध्याय 5: मकान सूचीकरण प्रश्न",
    "6": "अध्याय 6: स्व-गणना"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/i18n.js client/src/locales/
git commit -m "feat: i18n setup with English and Hindi translations"
```

---

### Task 15: API client + Zustand stores

**Files:**
- Create: `client/src/api/client.js`
- Create: `client/src/api/auth.js`
- Create: `client/src/api/quiz.js`
- Create: `client/src/api/leaderboard.js`
- Create: `client/src/api/user.js`
- Create: `client/src/api/admin.js`
- Create: `client/src/store/authStore.js`
- Create: `client/src/store/quizStore.js`

- [ ] **Step 1: Create `client/src/api/client.js`**

```js
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', data.tokens.accessToken);
          localStorage.setItem('refreshToken', data.tokens.refreshToken);
          original.headers.Authorization = `Bearer ${data.tokens.accessToken}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
```

- [ ] **Step 2: Create `client/src/api/auth.js`**

```js
import api from './client';
export const register = data => api.post('/auth/register', data).then(r => r.data);
export const login = data => api.post('/auth/login', data).then(r => r.data);
export const refreshTokens = data => api.post('/auth/refresh', data).then(r => r.data);
```

- [ ] **Step 3: Create `client/src/api/quiz.js`**

```js
import api from './client';
export const getDailyStatus = () => api.get('/quiz/daily/status').then(r => r.data);
export const startQuiz = data => api.post('/quiz/start', data).then(r => r.data);
export const submitAnswer = data => api.post('/quiz/answer', data).then(r => r.data);
export const completeQuiz = data => api.post('/quiz/complete', data).then(r => r.data);
```

- [ ] **Step 4: Create `client/src/api/leaderboard.js`**

```js
import api from './client';
export const getDailyLeaderboard = () => api.get('/leaderboard/daily').then(r => r.data);
export const getOverallLeaderboard = () => api.get('/leaderboard/overall').then(r => r.data);
```

- [ ] **Step 5: Create `client/src/api/user.js`**

```js
import api from './client';
export const getProfile = () => api.get('/user/profile').then(r => r.data);
export const updateProfile = data => api.put('/user/profile', data).then(r => r.data);
export const getBadges = () => api.get('/user/badges').then(r => r.data);
export const getStats = () => api.get('/user/stats').then(r => r.data);
```

- [ ] **Step 6: Create `client/src/api/admin.js`**

```js
import api from './client';
export const getDashboard = () => api.get('/admin/dashboard').then(r => r.data);
export const getUsers = params => api.get('/admin/users', { params }).then(r => r.data);
export const getUser = id => api.get(`/admin/users/${id}`).then(r => r.data);
export const createUser = data => api.post('/admin/users', data).then(r => r.data);
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data).then(r => r.data);
export const deleteUser = id => api.delete(`/admin/users/${id}`).then(r => r.data);
export const resetPassword = (id, newPassword) => api.post(`/admin/users/${id}/reset-password`, { newPassword }).then(r => r.data);
export const getUserProgress = id => api.get(`/admin/users/${id}/progress`).then(r => r.data);
export const getBadges = () => api.get('/admin/badges').then(r => r.data);
export const createBadge = data => api.post('/admin/badges', data).then(r => r.data);
export const updateBadge = (id, data) => api.put(`/admin/badges/${id}`, data).then(r => r.data);
export const deleteBadge = id => api.delete(`/admin/badges/${id}`).then(r => r.data);
```

- [ ] **Step 7: Create `client/src/store/authStore.js`**

```js
import { create } from 'zustand';

const useAuthStore = create(set => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: !!localStorage.getItem('accessToken'),

  setAuth: ({ tokens, user }) => {
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.clear();
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (updates) => {
    const user = { ...JSON.parse(localStorage.getItem('user') || '{}'), ...updates };
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));

export default useAuthStore;
```

- [ ] **Step 8: Create `client/src/store/quizStore.js`**

```js
import { create } from 'zustand';

const useQuizStore = create(set => ({
  sessionId: null,
  questions: [],
  currentIndex: 0,
  answers: [],        // { questionId, chosenOption, isCorrect, pointsEarned, currentStreak }
  mode: null,
  chapter: null,
  totalPoints: 0,
  newBadges: [],

  startQuiz: ({ sessionId, questions, mode, chapter }) =>
    set({ sessionId, questions, currentIndex: 0, answers: [], mode, chapter, totalPoints: 0, newBadges: [] }),

  recordAnswer: (answer) =>
    set(state => ({
      answers: [...state.answers, answer],
      currentIndex: state.currentIndex + 1,
      totalPoints: state.totalPoints + (answer.pointsEarned || 0),
    })),

  setNewBadges: (newBadges) => set({ newBadges }),

  reset: () => set({ sessionId: null, questions: [], currentIndex: 0, answers: [], mode: null, chapter: null, totalPoints: 0, newBadges: [] }),
}));

export default useQuizStore;
```

- [ ] **Step 9: Commit**

```bash
git add client/src/api/ client/src/store/
git commit -m "feat: API client with JWT interceptors and Zustand auth+quiz stores"
```

---

### Task 16: Router + ProtectedRoute + BottomNav + LanguageToggle + App.jsx

**Files:**
- Create: `client/src/App.jsx`
- Create: `client/src/components/ProtectedRoute.jsx`
- Create: `client/src/components/AdminRoute.jsx`
- Create: `client/src/components/BottomNav.jsx`
- Create: `client/src/components/LanguageToggle.jsx`

- [ ] **Step 1: Create `client/src/components/ProtectedRoute.jsx`**

```jsx
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/" replace />;
}
```

- [ ] **Step 2: Create `client/src/components/AdminRoute.jsx`**

```jsx
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function AdminRoute({ children }) {
  const user = useAuthStore(s => s.user);
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'admin') return <Navigate to="/home" replace />;
  return children;
}
```

- [ ] **Step 3: Create `client/src/components/BottomNav.jsx`**

```jsx
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function BottomNav() {
  const { t } = useTranslation();
  const links = [
    { to: '/home', label: t('home'), icon: '🏠' },
    { to: '/quiz', label: t('quiz'), icon: '🎯' },
    { to: '/leaderboard', label: t('leaderboard'), icon: '📊' },
    { to: '/profile', label: t('profile'), icon: '👤' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-50 max-w-lg mx-auto">
      {links.map(({ to, label, icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) =>
          `flex flex-col items-center text-xs ${isActive ? 'text-blue-600' : 'text-gray-500'}`
        }>
          <span className="text-xl">{icon}</span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Create `client/src/components/LanguageToggle.jsx`**

```jsx
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { updateProfile } from '../api/user';
import useAuthStore from '../store/authStore';

export default function LanguageToggle() {
  const { i18n: i18nInstance } = useTranslation();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  const toggle = async () => {
    const newLang = i18nInstance.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
    if (isAuthenticated) {
      try { await updateProfile({ language: newLang }); } catch {}
    }
  };

  return (
    <button onClick={toggle} className="px-3 py-1 text-sm rounded-full border border-gray-300 bg-white">
      {i18nInstance.language === 'en' ? 'हिंदी' : 'English'}
    </button>
  );
}
```

- [ ] **Step 5: Create `client/src/App.jsx`**

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import BottomNav from './components/BottomNav';
import useAuthStore from './store/authStore';

import Landing from './pages/Landing';
import Register from './pages/Register';
import Home from './pages/Home';
import QuizSelector from './pages/QuizSelector';
import DailyQuiz from './pages/DailyQuiz';
import TimedQuiz from './pages/TimedQuiz';
import PracticeQuiz from './pages/PracticeQuiz';
import Results from './pages/Results';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Certificate from './pages/Certificate';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserList from './pages/admin/UserList';
import UserDetail from './pages/admin/UserDetail';
import BadgeManager from './pages/admin/BadgeManager';

function UserLayout({ children }) {
  return (
    <div className="max-w-lg mx-auto min-h-screen bg-gray-50 pb-20">
      {children}
      <BottomNav />
    </div>
  );
}

export default function App() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const user = useAuthStore(s => s.user);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Navigate to={user?.role === 'admin' ? '/admin' : '/home'} replace /> : <Landing />} />
        <Route path="/register" element={<Register />} />

        <Route path="/home" element={<ProtectedRoute><UserLayout><Home /></UserLayout></ProtectedRoute>} />
        <Route path="/quiz" element={<ProtectedRoute><UserLayout><QuizSelector /></UserLayout></ProtectedRoute>} />
        <Route path="/quiz/daily" element={<ProtectedRoute><DailyQuiz /></ProtectedRoute>} />
        <Route path="/quiz/timed" element={<ProtectedRoute><TimedQuiz /></ProtectedRoute>} />
        <Route path="/quiz/practice" element={<ProtectedRoute><PracticeQuiz /></ProtectedRoute>} />
        <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><UserLayout><Leaderboard /></UserLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><UserLayout><Profile /></UserLayout></ProtectedRoute>} />
        <Route path="/certificate/:badgeId" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />

        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><UserList /></AdminRoute>} />
        <Route path="/admin/users/:id" element={<AdminRoute><UserDetail /></AdminRoute>} />
        <Route path="/admin/badges" element={<AdminRoute><BadgeManager /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 6: Verify app compiles without errors**

```bash
cd client && npm run build 2>&1 | tail -5
```

Expected: `✓ built in ...` (no errors, only warnings acceptable)

- [ ] **Step 7: Commit**

```bash
cd ..
git add client/src/App.jsx client/src/components/
git commit -m "feat: router, protected routes, bottom nav, language toggle"
```

---

## Phase 7: Frontend Auth Pages

### Task 17: Landing (Login) + Register pages

**Files:**
- Create: `client/src/pages/Landing.jsx`
- Create: `client/src/pages/Register.jsx`

- [ ] **Step 1: Create `client/src/pages/Landing.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../api/auth';
import useAuthStore from '../store/authStore';
import LanguageToggle from '../components/LanguageToggle';

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const [form, setForm] = useState({ mobile: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(form);
      setAuth(data);
      navigate(data.user.role === 'admin' ? '/admin' : '/home');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-green-500 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-4"><LanguageToggle /></div>
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-1">{t('app_title')}</h1>
          <p className="text-center text-gray-500 text-sm mb-6">Raipur District Training Portal</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('mobile')}</label>
              <input type="tel" required maxLength={10} value={form.mobile}
                onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
              <input type="password" required value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
              {loading ? '...' : t('login')}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            New user? <Link to="/register" className="text-blue-600 font-medium">{t('register')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `client/src/pages/Register.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { register } from '../api/auth';
import { login } from '../api/auth';
import useAuthStore from '../store/authStore';
import LanguageToggle from '../components/LanguageToggle';

const FUNCTIONARY_TYPES = ['Enumerator', 'Supervisor', 'Charge Officer', 'Field Trainer', 'Census Staff (General)'];

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore(s => s.setAuth);
  const [form, setForm] = useState({ mobile: '', password: '', name: '', functionary_type: '', state: 'Chhattisgarh', district: 'Raipur' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await register(form);
      const data = await login({ mobile: form.mobile, password: form.password });
      setAuth(data);
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const field = (label, key, type = 'text', extra = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} required value={form[key]} onChange={set(key)} {...extra}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-green-500 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-4"><LanguageToggle /></div>
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h1 className="text-xl font-bold text-center text-gray-800 mb-4">{t('register')}</h1>
          <form onSubmit={handleSubmit} className="space-y-3">
            {field(t('name'), 'name')}
            {field(t('mobile'), 'mobile', 'tel', { maxLength: 10 })}
            {field(t('password'), 'password', 'password', { minLength: 6 })}
            {field(t('state'), 'state')}
            {field(t('district'), 'district')}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('functionary_type')}</label>
              <select required value={form.functionary_type} onChange={set('functionary_type')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">-- Select --</option>
                {FUNCTIONARY_TYPES.map(ft => (
                  <option key={ft} value={ft}>{t(`functionary_types.${ft}`)}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50">
              {loading ? '...' : t('register')}
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already registered? <Link to="/" className="text-blue-600 font-medium">{t('login')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Landing.jsx client/src/pages/Register.jsx
git commit -m "feat: login and registration pages"
```

---

## Phase 8: Frontend Quiz Pages

### Task 18: Home dashboard

**Files:**
- Create: `client/src/pages/Home.jsx`

- [ ] **Step 1: Create `client/src/pages/Home.jsx`**

```jsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getDailyStatus } from '../api/quiz';
import { getStats } from '../api/user';
import { getOverallLeaderboard } from '../api/leaderboard';
import useAuthStore from '../store/authStore';
import LanguageToggle from '../components/LanguageToggle';

export default function Home() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const { data: dailyStatus } = useQuery({ queryKey: ['dailyStatus'], queryFn: getDailyStatus });
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats });
  const { data: overall } = useQuery({ queryKey: ['overallLeaderboard'], queryFn: getOverallLeaderboard });

  const userRank = overall?.userRank?.rank;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <LanguageToggle />
        <button onClick={logout} className="text-sm text-gray-500">{t('logout')}</button>
      </div>

      {/* Greeting card */}
      <div className="bg-gradient-to-r from-blue-600 to-green-500 rounded-2xl p-4 text-white mb-4">
        <p className="text-sm opacity-80">Good day,</p>
        <p className="text-xl font-bold">{user?.name} 👋</p>
        <p className="text-xs opacity-80">{user?.functionary_type} • {user?.district}</p>
        <div className="mt-3">
          <p className="text-3xl font-bold">{user?.total_points ?? 0} pts</p>
          {userRank && <p className="text-xs opacity-80">Rank #{userRank} overall</p>}
        </div>
      </div>

      {/* Daily quiz CTA */}
      {!dailyStatus?.completed ? (
        <Link to="/quiz/daily" className="block bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 text-center mb-4">
          <p className="text-lg font-bold text-yellow-700">☀️ {t('daily_quiz')} available!</p>
          <p className="text-sm text-yellow-600">Tap to play now</p>
        </Link>
      ) : (
        <div className="bg-green-50 border border-green-300 rounded-xl p-4 text-center mb-4">
          <p className="text-green-700 font-medium">✅ {t('daily_already_done')}</p>
        </div>
      )}

      {/* Quick access */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link to="/quiz/timed" className="bg-white rounded-xl p-4 text-center border border-gray-200 shadow-sm">
          <p className="text-2xl">⏱️</p>
          <p className="font-semibold text-sm mt-1">{t('timed_quiz')}</p>
        </Link>
        <Link to="/quiz/practice" className="bg-white rounded-xl p-4 text-center border border-gray-200 shadow-sm">
          <p className="text-2xl">📖</p>
          <p className="font-semibold text-sm mt-1">{t('practice')}</p>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Quizzes', value: stats.totalSessions },
            { label: t('badges'), value: stats.totalBadges },
            { label: 'Best Streak', value: stats.bestStreak },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl p-3 text-center border border-gray-200">
              <p className="text-xl font-bold text-blue-600">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/Home.jsx
git commit -m "feat: home dashboard with greeting, daily quiz CTA, stats"
```

---

### Task 19: Quiz selector + shared QuizQuestion component

**Files:**
- Create: `client/src/pages/QuizSelector.jsx`
- Create: `client/src/components/QuizQuestion.jsx`
- Create: `client/src/components/QuizTimer.jsx`

- [ ] **Step 1: Create `client/src/pages/QuizSelector.jsx`**

```jsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CHAPTERS = [1, 2, 3, 4, 5, 6];

export default function QuizSelector() {
  const { t } = useTranslation();
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">{t('quiz')}</h2>
      <div className="space-y-3">
        <Link to="/quiz/daily" className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <span className="text-2xl">☀️</span>
          <div>
            <p className="font-semibold">{t('daily_quiz')}</p>
            <p className="text-xs text-gray-500">10 random questions • 60s each • Once daily</p>
          </div>
        </Link>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">⏱️</span>
            <div>
              <p className="font-semibold">{t('timed_quiz')}</p>
              <p className="text-xs text-gray-500">15 questions • 15 min • Pick a chapter</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CHAPTERS.map(ch => (
              <Link key={ch} to={`/quiz/timed?chapter=${ch}`}
                className="text-center bg-blue-50 border border-blue-200 rounded-lg py-2 text-sm font-medium text-blue-700">
                Ch. {ch}
              </Link>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">📖</span>
            <div>
              <p className="font-semibold">{t('practice')}</p>
              <p className="text-xs text-gray-500">All chapter questions • No timer • Resumable</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CHAPTERS.map(ch => (
              <Link key={ch} to={`/quiz/practice?chapter=${ch}`}
                className="text-center bg-green-50 border border-green-200 rounded-lg py-2 text-sm font-medium text-green-700">
                Ch. {ch}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `client/src/components/QuizQuestion.jsx`**

```jsx
import { useTranslation } from 'react-i18next';

export default function QuizQuestion({ question, onAnswer, answered, result }) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language;

  const questionText = lang === 'hi' ? question.question_hi : question.question_en;
  const options = lang === 'hi'
    ? JSON.parse(question.options_hi)
    : JSON.parse(question.options_en);
  const explanation = lang === 'hi' ? question.explanation_hi : question.explanation_en;

  const difficultyColors = { easy: 'text-green-600', medium: 'text-yellow-600', hard: 'text-red-600' };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-3">
        <span className={`text-xs font-semibold uppercase ${difficultyColors[question.difficulty] || 'text-gray-500'}`}>
          {t(question.difficulty)}
        </span>
        <span className="text-xs text-gray-400">Ch. {question.chapter}</span>
      </div>

      <p className="text-base font-medium text-gray-800 mb-5 leading-snug">{questionText}</p>

      <div className="space-y-2">
        {options.map((opt, i) => {
          let cls = 'w-full text-left p-3 rounded-xl border text-sm font-medium ';
          if (!answered) {
            cls += 'border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50';
          } else if (i === question.correct_option) {
            cls += 'border-green-500 bg-green-50 text-green-800';
          } else if (i === result?.chosenOption && !result?.isCorrect) {
            cls += 'border-red-400 bg-red-50 text-red-800';
          } else {
            cls += 'border-gray-200 bg-gray-50 text-gray-400';
          }
          return (
            <button key={i} onClick={() => !answered && onAnswer(i)} className={cls}>
              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className={`mt-4 p-3 rounded-xl text-sm ${result?.isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <p className="font-semibold mb-1">{result?.isCorrect ? `✅ ${t('correct')}` : `❌ ${t('wrong')}`}</p>
          {result?.isCorrect && <p className="text-xs">+{result.pointsEarned} pts {result.currentStreak >= 3 ? `🔥 ${result.currentStreak}-streak!` : ''}</p>}
          <p className="mt-1 text-xs text-gray-700"><strong>{t('explanation')}:</strong> {explanation}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create `client/src/components/QuizTimer.jsx`**

```jsx
import { useState, useEffect } from 'react';

export default function QuizTimer({ totalSeconds, onExpire }) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) { clearInterval(interval); onExpire(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(remaining / 60).toString().padStart(2, '0');
  const secs = (remaining % 60).toString().padStart(2, '0');
  const pct = (remaining / totalSeconds) * 100;
  const color = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="px-4 py-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Time remaining</span>
        <span className="font-mono font-bold">{mins}:{secs}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/QuizSelector.jsx client/src/components/QuizQuestion.jsx client/src/components/QuizTimer.jsx
git commit -m "feat: quiz selector page, QuizQuestion component, QuizTimer component"
```

---

### Task 20: Daily Quiz page

**Files:**
- Create: `client/src/pages/DailyQuiz.jsx`

- [ ] **Step 1: Create `client/src/pages/DailyQuiz.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startQuiz as startQuizApi, submitAnswer as submitAnswerApi, completeQuiz } from '../api/quiz';
import useQuizStore from '../store/quizStore';
import QuizQuestion from '../components/QuizQuestion';
import QuizTimer from '../components/QuizTimer';

export default function DailyQuiz() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startQuiz, recordAnswer, setNewBadges, sessionId, questions, currentIndex, reset } = useQuizStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState(null);
  const [timerExpired, setTimerExpired] = useState(false);

  useEffect(() => {
    reset();
    startQuizApi({ mode: 'daily' })
      .then(data => { startQuiz({ ...data, mode: 'daily', chapter: null }); setLoading(false); })
      .catch(err => { setError(err.response?.data?.error || 'Failed to start'); setLoading(false); });
  }, []);

  const handleAnswer = async (chosenOption) => {
    if (answered) return;
    setAnswered(true);
    const q = questions[currentIndex];
    try {
      const res = await submitAnswerApi({ sessionId, questionId: q.id, chosenOption });
      setResult({ ...res, chosenOption });
      recordAnswer({ questionId: q.id, chosenOption, ...res });
    } catch {}
  };

  const handleTimerExpire = () => { setTimerExpired(true); if (!answered) handleAnswer(-1); };

  const handleNext = async () => {
    setAnswered(false);
    setResult(null);
    setTimerExpired(false);
    if (currentIndex + 1 >= questions.length) {
      try {
        const finalResult = await completeQuiz({ sessionId });
        setNewBadges(finalResult.newBadges || []);
        navigate('/results');
      } catch { navigate('/results'); }
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><p>Loading...</p></div>;
  if (error) return <div className="p-4"><p className="text-red-500">{error}</p><button onClick={() => navigate('/quiz')} className="mt-2 text-blue-600">Back</button></div>;

  const q = questions[currentIndex];
  const progress = Math.round(((currentIndex) / questions.length) * 100);

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-white">
      <div className="bg-blue-600 text-white px-4 pt-6 pb-2">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">☀️ {t('daily_quiz')}</span>
          <span className="text-sm">{currentIndex + 1} / {questions.length}</span>
        </div>
        <div className="h-1.5 bg-blue-400 rounded-full">
          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <QuizTimer key={currentIndex} totalSeconds={60} onExpire={handleTimerExpire} />
      <QuizQuestion question={q} onAnswer={handleAnswer} answered={answered || timerExpired} result={result} />

      {(answered || timerExpired) && (
        <div className="p-4">
          <button onClick={handleNext}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold">
            {currentIndex + 1 >= questions.length ? t('quiz_complete') : t('next')} →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/DailyQuiz.jsx
git commit -m "feat: daily quiz page with 60s per-question timer"
```

---

### Task 21: Timed Quiz page

**Files:**
- Create: `client/src/pages/TimedQuiz.jsx`

- [ ] **Step 1: Create `client/src/pages/TimedQuiz.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startQuiz as startQuizApi, submitAnswer as submitAnswerApi, completeQuiz } from '../api/quiz';
import useQuizStore from '../store/quizStore';
import QuizQuestion from '../components/QuizQuestion';
import QuizTimer from '../components/QuizTimer';

export default function TimedQuiz() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const chapter = Number(params.get('chapter')) || 1;

  const { startQuiz, recordAnswer, setNewBadges, sessionId, questions, currentIndex, reset } = useQuizStore();
  const [loading, setLoading] = useState(true);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    reset();
    startQuizApi({ mode: 'timed', chapter })
      .then(data => { startQuiz({ ...data, mode: 'timed', chapter }); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleAnswer = async (chosenOption) => {
    if (answered) return;
    setAnswered(true);
    const q = questions[currentIndex];
    try {
      const res = await submitAnswerApi({ sessionId, questionId: q.id, chosenOption });
      setResult({ ...res, chosenOption });
      recordAnswer({ questionId: q.id, chosenOption, ...res });
    } catch {}
  };

  const handleExpire = async () => {
    setExpired(true);
    // Auto-submit remaining unanswered questions as skipped then complete
    if (!answered) await handleAnswer(-1);
    const finalResult = await completeQuiz({ sessionId });
    setNewBadges(finalResult.newBadges || []);
    navigate('/results');
  };

  const handleNext = async () => {
    setAnswered(false); setResult(null);
    if (currentIndex + 1 >= questions.length) {
      const finalResult = await completeQuiz({ sessionId });
      setNewBadges(finalResult.newBadges || []);
      navigate('/results');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><p>Loading...</p></div>;

  const q = questions[currentIndex];

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-white">
      <div className="bg-yellow-500 text-white px-4 pt-6 pb-2">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">⏱️ {t('timed_quiz')} — {t('chapters.' + chapter)}</span>
          <span className="text-sm">{currentIndex + 1}/{questions.length}</span>
        </div>
        <div className="h-1.5 bg-yellow-300 rounded-full">
          <div className="h-full bg-white rounded-full" style={{ width: `${((currentIndex) / questions.length) * 100}%` }} />
        </div>
      </div>

      {/* 15-minute global timer — rendered once, does not reset between questions */}
      {questions.length > 0 && currentIndex === 0 && !loading && (
        <QuizTimer totalSeconds={900} onExpire={handleExpire} />
      )}

      <QuizQuestion question={q} onAnswer={handleAnswer} answered={answered || expired} result={result} />

      {(answered || expired) && (
        <div className="p-4">
          <button onClick={handleNext} className="w-full bg-yellow-500 text-white py-3 rounded-xl font-semibold">
            {currentIndex + 1 >= questions.length ? t('quiz_complete') : t('next')} →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/TimedQuiz.jsx
git commit -m "feat: timed quiz page with 15-minute global countdown"
```

---

### Task 22: Chapter Practice page

**Files:**
- Create: `client/src/pages/PracticeQuiz.jsx`

- [ ] **Step 1: Create `client/src/pages/PracticeQuiz.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startQuiz as startQuizApi, submitAnswer as submitAnswerApi, completeQuiz } from '../api/quiz';
import useQuizStore from '../store/quizStore';
import QuizQuestion from '../components/QuizQuestion';

export default function PracticeQuiz() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const chapter = Number(params.get('chapter')) || 1;

  const { startQuiz, recordAnswer, setNewBadges, sessionId, questions, currentIndex, reset } = useQuizStore();
  const [loading, setLoading] = useState(true);
  const [resumed, setResumed] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    reset();
    startQuizApi({ mode: 'practice', chapter })
      .then(data => {
        startQuiz({ ...data, mode: 'practice', chapter });
        setResumed(data.resumed || false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAnswer = async (chosenOption) => {
    if (answered) return;
    setAnswered(true);
    const q = questions[currentIndex];
    try {
      const res = await submitAnswerApi({ sessionId, questionId: q.id, chosenOption });
      setResult({ ...res, chosenOption });
      recordAnswer({ questionId: q.id, chosenOption, ...res });
    } catch {}
  };

  const handleNext = async () => {
    setAnswered(false); setResult(null);
    if (currentIndex + 1 >= questions.length) {
      const finalResult = await completeQuiz({ sessionId });
      setNewBadges(finalResult.newBadges || []);
      navigate('/results');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><p>Loading...</p></div>;

  if (questions.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-green-600 text-xl font-semibold mb-2">✅ Chapter complete!</p>
        <p className="text-gray-500 mb-4">You've answered all questions in this chapter.</p>
        <button onClick={() => navigate('/quiz')} className="bg-blue-600 text-white px-6 py-2 rounded-xl">Back to Quizzes</button>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-white">
      <div className="bg-green-600 text-white px-4 pt-6 pb-2">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">📖 {t('chapters.' + chapter)}</span>
          <span className="text-sm">{currentIndex + 1}/{questions.length}</span>
        </div>
        {resumed && <p className="text-xs text-green-200 mb-1">▶ {t('resume')}</p>}
        <div className="h-1.5 bg-green-400 rounded-full">
          <div className="h-full bg-white rounded-full" style={{ width: `${((currentIndex) / questions.length) * 100}%` }} />
        </div>
      </div>

      <QuizQuestion question={q} onAnswer={handleAnswer} answered={answered} result={result} />

      {answered && (
        <div className="p-4">
          <button onClick={handleNext} className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold">
            {currentIndex + 1 >= questions.length ? '✅ Complete Chapter' : t('next')} →
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/PracticeQuiz.jsx
git commit -m "feat: chapter practice quiz — no timer, resumable sessions"
```

---

### Task 23: Results page

**Files:**
- Create: `client/src/pages/Results.jsx`
- Create: `client/src/components/BadgeCard.jsx`

- [ ] **Step 1: Create `client/src/components/BadgeCard.jsx`**

```jsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function BadgeCard({ badge, showShare = false }) {
  const { i18n, t } = useTranslation();
  const lang = i18n.language;
  const name = lang === 'hi' ? badge.name_hi : badge.name_en;
  const desc = lang === 'hi' ? badge.description_hi : badge.description_en;

  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 text-center">
      <p className="text-4xl mb-2">{badge.icon}</p>
      <p className="font-bold text-gray-800">{name}</p>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
      {showShare && (
        <Link to={`/certificate/${badge.id}`}
          className="mt-3 inline-block text-xs bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full font-semibold">
          {t('share')} 🎖️
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `client/src/pages/Results.jsx`**

```jsx
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useQuizStore from '../store/quizStore';
import BadgeCard from '../components/BadgeCard';
import { useEffect } from 'react';
import useAuthStore from '../store/authStore';
import { getProfile } from '../api/user';
import { useQueryClient } from '@tanstack/react-query';

export default function Results() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { answers, totalPoints, mode, chapter, newBadges, reset } = useQuizStore();
  const updateUser = useAuthStore(s => s.updateUser);

  const correctCount = answers.filter(a => a.isCorrect).length;
  const pct = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;

  useEffect(() => {
    // Refresh user profile to get updated total_points
    getProfile().then(profile => {
      updateUser({ total_points: profile.total_points });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['overallLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['dailyStatus'] });
    }).catch(() => {});
  }, []);

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow p-6 mb-4 text-center">
        <p className="text-5xl mb-3">{pct === 100 ? '🏆' : pct >= 70 ? '🌟' : '📝'}</p>
        <h2 className="text-2xl font-bold">{t('quiz_complete')}</h2>
        <p className="text-4xl font-bold text-blue-600 mt-2">+{totalPoints} pts</p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-2xl font-bold text-green-600">{correctCount}</p>
            <p className="text-xs text-gray-500">Correct</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-2xl font-bold text-red-500">{answers.length - correctCount}</p>
            <p className="text-xs text-gray-500">Wrong</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-2xl font-bold text-blue-600">{pct}%</p>
            <p className="text-xs text-gray-500">Score</p>
          </div>
        </div>
      </div>

      {newBadges.length > 0 && (
        <div className="mb-4">
          <h3 className="font-bold text-gray-700 mb-2">🎉 New {t('badges')} Earned!</h3>
          <div className="space-y-3">
            {newBadges.map(b => <BadgeCard key={b.id} badge={b} showShare />)}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <button onClick={() => { reset(); navigate('/home'); }}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold">
          Back to Home
        </button>
        <button onClick={() => { reset(); navigate('/leaderboard'); }}
          className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-xl font-semibold">
          📊 View Leaderboard
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Results.jsx client/src/components/BadgeCard.jsx
git commit -m "feat: results page with score summary and new badges display"
```

---

## Phase 9: Frontend Gamification Pages

### Task 24: Leaderboard page

**Files:**
- Create: `client/src/pages/Leaderboard.jsx`
- Create: `client/src/components/LeaderboardTable.jsx`

- [ ] **Step 1: Create `client/src/components/LeaderboardTable.jsx`**

```jsx
import useAuthStore from '../store/authStore';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardTable({ entries, userRank }) {
  const user = useAuthStore(s => s.user);

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => {
        const isMe = entry.id === user?.id;
        return (
          <div key={entry.id}
            className={`flex items-center gap-3 p-3 rounded-xl ${isMe ? 'bg-blue-50 border-2 border-blue-400' : 'bg-white border border-gray-200'}`}>
            <div className="w-8 text-center">
              {i < 3 ? <span className="text-xl">{MEDALS[i]}</span> : <span className="text-sm font-bold text-gray-500">#{entry.rank}</span>}
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {entry.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{entry.name} {isMe && '(You)'}</p>
              <p className="text-xs text-gray-400">{entry.functionary_type}</p>
            </div>
            <p className="font-bold text-blue-600 text-sm">{entry.points} pts</p>
          </div>
        );
      })}
      {userRank && userRank.rank > 10 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border-2 border-blue-400 mt-2">
          <div className="w-8 text-center"><span className="text-sm font-bold text-gray-500">#{userRank.rank}</span></div>
          <div className="flex-1"><p className="font-semibold text-sm">You</p></div>
          <p className="font-bold text-blue-600 text-sm">{userRank.points} pts</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `client/src/pages/Leaderboard.jsx`**

```jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getDailyLeaderboard, getOverallLeaderboard } from '../api/leaderboard';
import LeaderboardTable from '../components/LeaderboardTable';

export default function Leaderboard() {
  const { t } = useTranslation();
  const [tab, setTab] = useState('daily');

  const { data: daily } = useQuery({ queryKey: ['dailyLeaderboard'], queryFn: getDailyLeaderboard });
  const { data: overall } = useQuery({ queryKey: ['overallLeaderboard'], queryFn: getOverallLeaderboard });

  const data = tab === 'daily' ? daily : overall;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">📊 {t('leaderboard')}</h2>
      <div className="flex gap-2 mb-4">
        {['daily', 'overall'].map(t2 => (
          <button key={t2} onClick={() => setTab(t2)}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm ${tab === t2 ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>
            {t2 === 'daily' ? `☀️ ${t('daily')}` : `🏆 ${t('overall')}`}
          </button>
        ))}
      </div>
      {data ? (
        <LeaderboardTable entries={data.leaderboard} userRank={data.userRank} />
      ) : (
        <p className="text-center text-gray-400">Loading...</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/Leaderboard.jsx client/src/components/LeaderboardTable.jsx
git commit -m "feat: leaderboard page with daily and overall tabs"
```

---

### Task 25: Profile page

**Files:**
- Create: `client/src/pages/Profile.jsx`

- [ ] **Step 1: Create `client/src/pages/Profile.jsx`**

```jsx
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getBadges, getStats } from '../api/user';
import useAuthStore from '../store/authStore';
import LanguageToggle from '../components/LanguageToggle';
import BadgeCard from '../components/BadgeCard';

export default function Profile() {
  const { t, i18n } = useTranslation();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);

  const { data: badges } = useQuery({ queryKey: ['userBadges'], queryFn: getBadges });
  const { data: stats } = useQuery({ queryKey: ['stats'], queryFn: getStats });

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{t('profile')}</h2>
        <LanguageToggle />
      </div>

      {/* Profile card */}
      <div className="bg-gradient-to-r from-blue-600 to-green-500 rounded-2xl p-4 text-white mb-4">
        <div className="w-14 h-14 rounded-full bg-white text-blue-600 flex items-center justify-center text-xl font-bold mb-2">
          {user?.name?.slice(0, 2).toUpperCase()}
        </div>
        <p className="text-lg font-bold">{user?.name}</p>
        <p className="text-sm opacity-80">{user?.functionary_type}</p>
        <p className="text-xs opacity-70">{user?.district}, {user?.state}</p>
        <p className="text-xs opacity-70">{user?.mobile}</p>
        <p className="text-2xl font-bold mt-2">{user?.total_points ?? 0} pts</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Quizzes Completed', value: stats.totalSessions },
            { label: 'Chapters Done', value: `${stats.chaptersCompleted}/6` },
            { label: t('badges') + ' Earned', value: stats.totalBadges },
            { label: 'Best Streak', value: `${stats.bestStreak} 🔥` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl p-3 border border-gray-200">
              <p className="text-xl font-bold text-blue-600">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Badges */}
      <h3 className="font-bold text-gray-700 mb-2">🏅 {t('badges')}</h3>
      {badges?.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 mb-4">
          {badges.map(b => <BadgeCard key={b.id} badge={b} showShare />)}
        </div>
      ) : (
        <p className="text-gray-400 text-sm mb-4">No badges yet. Complete quizzes to earn them!</p>
      )}

      <button onClick={logout} className="w-full border border-red-300 text-red-500 py-2 rounded-xl font-semibold">
        {t('logout')}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/Profile.jsx
git commit -m "feat: profile page with stats and badge gallery"
```

---

### Task 26: Certificate generation + sharing

**Files:**
- Create: `client/src/components/CertificateCanvas.jsx`
- Create: `client/src/pages/Certificate.jsx`

- [ ] **Step 1: Create `client/src/components/CertificateCanvas.jsx`**

```jsx
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/authStore';
import html2canvas from 'html2canvas';

export default function CertificateCanvas({ badge, onImageReady }) {
  const { i18n } = useTranslation();
  const user = useAuthStore(s => s.user);
  const lang = i18n.language;
  const certRef = useRef(null);

  const badgeName = lang === 'hi' ? badge.name_hi : badge.name_en;
  const badgeDesc = lang === 'hi' ? badge.description_hi : badge.description_en;
  const today = new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleDownload = async () => {
    if (!certRef.current) return;
    const canvas = await html2canvas(certRef.current, { scale: 2, useCORS: true });
    const url = canvas.toDataURL('image/png');
    if (onImageReady) onImageReady(url);
    const a = document.createElement('a');
    a.href = url;
    a.download = `census2027-badge-${badge.id}.png`;
    a.click();
  };

  return (
    <div>
      {/* Certificate preview */}
      <div ref={certRef}
        style={{ width: 480, background: 'linear-gradient(135deg, #1e40af, #059669)', padding: 32, borderRadius: 16, color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: 11, letterSpacing: 2, opacity: 0.7, textTransform: 'uppercase' }}>Census 2027 — Training Platform</p>
          <p style={{ fontSize: 11, opacity: 0.7 }}>Raipur District, Chhattisgarh</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 8 }}>This is to certify that</p>
          <p style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>{user?.name}</p>
          <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>{user?.functionary_type} • {user?.district}</p>
          <p style={{ fontSize: 40, marginBottom: 8 }}>{badge.icon}</p>
          <p style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>{badgeName}</p>
          <p style={{ fontSize: 12, opacity: 0.7 }}>{badgeDesc}</p>
        </div>
        <p style={{ textAlign: 'center', fontSize: 11, opacity: 0.6, marginTop: 16 }}>{today}</p>
      </div>

      <button onClick={handleDownload}
        className="mt-4 w-full bg-gray-800 text-white py-3 rounded-xl font-semibold">
        ⬇️ Download PNG
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Create `client/src/pages/Certificate.jsx`**

```jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { getBadges } from '../api/user';
import CertificateCanvas from '../components/CertificateCanvas';
import useAuthStore from '../store/authStore';

export default function Certificate() {
  const { t } = useTranslation();
  const { badgeId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const [imageUrl, setImageUrl] = useState(null);

  const { data: badges } = useQuery({ queryKey: ['userBadges'], queryFn: getBadges });
  const badge = badges?.find(b => String(b.id) === badgeId);

  if (!badge) return <div className="p-4 text-center"><p>Loading...</p></div>;

  const shareText = `I earned the "${badge.name_en}" badge on Census 2027 Training Platform! 🏆`;

  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  const shareFacebook = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(shareText)}`, '_blank');
  const shareTwitter = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  const shareInstagram = () => {
    alert('Download the image and share it on Instagram manually.');
  };

  return (
    <div className="max-w-lg mx-auto p-4 min-h-screen bg-gray-50">
      <button onClick={() => navigate(-1)} className="text-blue-600 text-sm mb-4">← Back</button>
      <h2 className="text-xl font-bold mb-4">🎖️ Share Your Badge</h2>

      <div className="overflow-x-auto mb-4">
        <CertificateCanvas badge={badge} onImageReady={setImageUrl} />
      </div>

      <div className="space-y-2">
        <button onClick={shareWhatsApp}
          className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
          <span>💬</span> Share on WhatsApp
        </button>
        <button onClick={shareFacebook}
          className="w-full bg-blue-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
          <span>📘</span> Share on Facebook
        </button>
        <button onClick={shareTwitter}
          className="w-full bg-sky-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
          <span>🐦</span> Share on Twitter/X
        </button>
        <button onClick={shareInstagram}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
          <span>📸</span> Share on Instagram
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/CertificateCanvas.jsx client/src/pages/Certificate.jsx
git commit -m "feat: certificate generation with html2canvas + social sharing"
```

---

## Phase 10: Admin Frontend

### Task 27: Admin Dashboard

**Files:**
- Create: `client/src/pages/admin/AdminDashboard.jsx`

- [ ] **Step 1: Create `client/src/pages/admin/AdminDashboard.jsx`**

```jsx
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getDashboard } from '../../api/admin';
import useAuthStore from '../../store/authStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const logout = useAuthStore(s => s.logout);
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ['adminDashboard'], queryFn: getDashboard });

  if (isLoading) return <div className="p-6">Loading...</div>;

  const chapterData = data?.chapterCompletion?.map(c => ({ name: `Ch.${c.chapter}`, pct: c.pct })) || [];

  return (
    <div className="max-w-3xl mx-auto p-4 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-3">
          <Link to="/admin/users" className="text-sm text-blue-600">Users</Link>
          <Link to="/admin/badges" className="text-sm text-blue-600">Badges</Link>
          <button onClick={() => { logout(); navigate('/'); }} className="text-sm text-red-500">Logout</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Users', value: data?.totalUsers, color: 'blue' },
          { label: 'Active Today', value: data?.activeToday, color: 'green' },
          { label: 'Quizzes Today', value: data?.quizzesToday, color: 'yellow' },
          { label: 'Badges Today', value: data?.badgesToday, color: 'purple' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl p-4 border border-gray-200 text-center">
            <p className={`text-3xl font-bold text-${color}-600`}>{value ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Users by type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="font-bold mb-3">Users by Functionary Type</h3>
          {data?.byType?.map(r => (
            <div key={r.functionary_type} className="flex justify-between py-1 text-sm border-b border-gray-100 last:border-0">
              <span>{r.functionary_type}</span>
              <span className="font-bold">{r.count}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="font-bold mb-3">Chapter Completion (%)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chapterData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="pct" fill="#3b82f6" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <Link to="/admin/users" className="block text-center bg-blue-600 text-white py-3 rounded-xl font-semibold">
        Manage Users →
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/admin/AdminDashboard.jsx
git commit -m "feat: admin dashboard with live stats and chapter completion chart"
```

---

### Task 28: Admin User List + User Detail

**Files:**
- Create: `client/src/pages/admin/UserList.jsx`
- Create: `client/src/pages/admin/UserDetail.jsx`

- [ ] **Step 1: Create `client/src/pages/admin/UserList.jsx`**

```jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getUsers } from '../../api/admin';

export default function UserList() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const { data: users, isLoading } = useQuery({
    queryKey: ['adminUsers', search, type],
    queryFn: () => getUsers({ search, type }),
    keepPreviousData: true,
  });

  return (
    <div className="max-w-3xl mx-auto p-4 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Users</h2>
        <Link to="/admin" className="text-sm text-blue-600">← Dashboard</Link>
      </div>
      <div className="flex gap-2 mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or mobile..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <select value={type} onChange={e => setType(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-2 text-sm">
          <option value="">All types</option>
          {['Enumerator', 'Supervisor', 'Charge Officer', 'Field Trainer', 'Census Staff (General)'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
      {isLoading ? <p>Loading...</p> : (
        <div className="space-y-2">
          {users?.map(u => (
            <Link key={u.id} to={`/admin/users/${u.id}`}
              className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-200 hover:border-blue-400">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {u.name?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{u.name}</p>
                <p className="text-xs text-gray-500">{u.mobile} • {u.functionary_type}</p>
              </div>
              <p className="text-sm font-bold text-blue-600">{u.total_points} pts</p>
            </Link>
          ))}
          {users?.length === 0 && <p className="text-gray-400 text-center py-6">No users found</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `client/src/pages/admin/UserDetail.jsx`**

```jsx
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getUser, resetPassword, deleteUser, getUserProgress } from '../../api/admin';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['adminUser', id], queryFn: () => getUser(id) });
  const { data: progress } = useQuery({ queryKey: ['adminUserProgress', id], queryFn: () => getUserProgress(id) });

  if (isLoading) return <div className="p-4">Loading...</div>;
  const { user, sessions, badges } = data || {};

  const handleResetPw = async () => {
    if (!newPw || newPw.length < 6) return setMsg('Password must be at least 6 characters');
    await resetPassword(id, newPw);
    setMsg('Password reset successfully'); setNewPw('');
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete user ${user.name}? This cannot be undone.`)) return;
    await deleteUser(id);
    queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    navigate('/admin/users');
  };

  return (
    <div className="max-w-3xl mx-auto p-4 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <Link to="/admin/users" className="text-sm text-blue-600">← Users</Link>
        <button onClick={handleDelete} className="text-sm text-red-500">Delete User</button>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
        <h2 className="text-lg font-bold">{user?.name}</h2>
        <p className="text-sm text-gray-500">{user?.mobile} • {user?.functionary_type}</p>
        <p className="text-sm text-gray-500">{user?.district}, {user?.state}</p>
        <p className="text-xl font-bold text-blue-600 mt-2">{user?.total_points} pts</p>
      </div>

      {/* Points timeline */}
      {progress?.pointsTimeline?.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
          <h3 className="font-bold mb-3 text-sm">Points Timeline</h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={progress.pointsTimeline}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="points" stroke="#3b82f6" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Badges */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
        <h3 className="font-bold mb-2 text-sm">Badges ({badges?.length || 0})</h3>
        {badges?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map((b, i) => <span key={i} className="text-lg" title={b.name_en}>{b.icon}</span>)}
          </div>
        ) : <p className="text-gray-400 text-sm">No badges yet</p>}
      </div>

      {/* Quiz sessions */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
        <h3 className="font-bold mb-2 text-sm">Recent Sessions ({sessions?.length || 0})</h3>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {sessions?.map(s => (
            <div key={s.id} className="flex justify-between text-xs py-1 border-b border-gray-100">
              <span>{s.mode} {s.chapter ? `Ch.${s.chapter}` : ''}</span>
              <span>{s.score}/{s.max_score} pts</span>
              <span className="text-gray-400">{new Date(s.started_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reset password */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="font-bold mb-2 text-sm">Reset Password</h3>
        <div className="flex gap-2">
          <input value={newPw} onChange={e => setNewPw(e.target.value)} type="password" placeholder="New password (min 6 chars)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <button onClick={handleResetPw} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Reset</button>
        </div>
        {msg && <p className="text-sm mt-2 text-green-600">{msg}</p>}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/admin/UserList.jsx client/src/pages/admin/UserDetail.jsx
git commit -m "feat: admin user list and user detail with progress, badges, password reset"
```

---

### Task 29: Admin Badge Manager

**Files:**
- Create: `client/src/pages/admin/BadgeManager.jsx`

- [ ] **Step 1: Create `client/src/pages/admin/BadgeManager.jsx`**

```jsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getBadges, createBadge, deleteBadge } from '../../api/admin';

const CRITERIA_TYPES = ['quizzes_completed', 'streak', 'daily_streak', 'perfect_timed', 'chapters_completed', 'points', 'daily_rank_1'];

export default function BadgeManager() {
  const queryClient = useQueryClient();
  const { data: badges } = useQuery({ queryKey: ['adminBadges'], queryFn: getBadges });
  const [form, setForm] = useState({ name_en: '', name_hi: '', description_en: '', description_hi: '', icon: '🏅', criteria_type: 'points', criteria_value: 100 });
  const [msg, setMsg] = useState('');

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleCreate = async e => {
    e.preventDefault();
    await createBadge({ ...form, criteria_value: Number(form.criteria_value) });
    queryClient.invalidateQueries({ queryKey: ['adminBadges'] });
    setMsg('Badge created!');
    setForm({ name_en: '', name_hi: '', description_en: '', description_hi: '', icon: '🏅', criteria_type: 'points', criteria_value: 100 });
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this badge?')) return;
    await deleteBadge(id);
    queryClient.invalidateQueries({ queryKey: ['adminBadges'] });
  };

  return (
    <div className="max-w-3xl mx-auto p-4 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Badge Manager</h2>
        <Link to="/admin" className="text-sm text-blue-600">← Dashboard</Link>
      </div>

      {/* Existing badges */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4">
        <h3 className="font-bold mb-3 text-sm">Existing Badges</h3>
        <div className="space-y-2">
          {badges?.map(b => (
            <div key={b.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
              <span className="text-xl">{b.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{b.name_en}</p>
                <p className="text-xs text-gray-500">{b.criteria_type} ≥ {b.criteria_value}</p>
              </div>
              <button onClick={() => handleDelete(b.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
            </div>
          ))}
        </div>
      </div>

      {/* Create badge form */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <h3 className="font-bold mb-3 text-sm">Create New Badge</h3>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input required placeholder="Name (English)" value={form.name_en} onChange={set('name_en')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input required placeholder="Name (Hindi)" value={form.name_hi} onChange={set('name_hi')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input required placeholder="Description (EN)" value={form.description_en} onChange={set('description_en')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input required placeholder="Description (HI)" value={form.description_hi} onChange={set('description_hi')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input required placeholder="Icon emoji" value={form.icon} onChange={set('icon')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input required type="number" placeholder="Criteria value" value={form.criteria_value} onChange={set('criteria_value')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <select required value={form.criteria_type} onChange={set('criteria_type')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {CRITERIA_TYPES.map(ct => <option key={ct} value={ct}>{ct}</option>)}
          </select>
          {msg && <p className="text-green-600 text-sm">{msg}</p>}
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm">Create Badge</button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/admin/BadgeManager.jsx
git commit -m "feat: admin badge manager — view, create, delete badge definitions"
```

---

## Phase 11: Final Integration + Docker Build

### Task 30: Docker Compose full build + first admin user + smoke test

**Files:**
- Modify: `docker-compose.yml` (finalize)

- [ ] **Step 1: Update `docker-compose.yml` to handle client build properly**

```yaml
version: '3.9'

services:
  api:
    build:
      context: ./server
    restart: unless-stopped
    env_file: .env
    environment:
      - QA_DIR=/app/QA
    volumes:
      - db_data:/data
      - ./QA:/app/QA:ro
    networks:
      - internal
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3001/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./client/dist:/usr/share/nginx/html:ro
    depends_on:
      api:
        condition: service_healthy
    networks:
      - internal

volumes:
  db_data:

networks:
  internal:
```

Note: Build the client locally and mount the `dist` folder. This is simpler than a volume-copy approach.

- [ ] **Step 2: Build the client**

```bash
cd client && npm run build
```

Expected: `dist/` folder created with `index.html` and assets.

- [ ] **Step 3: Build and start all services**

```bash
cd ..
docker-compose up --build -d
```

Expected: Three containers running — `api`, `nginx`.

- [ ] **Step 4: Check API health**

```bash
curl http://localhost/api/health
```

Expected: `{"ok":true}`

- [ ] **Step 5: Create the first admin user**

```bash
# Register via API then promote to admin in SQLite
curl -s -X POST http://localhost/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"mobile":"9000000000","password":"Admin@1234","name":"District Admin","functionary_type":"Census Staff (General)","state":"Chhattisgarh","district":"Raipur"}'

# Promote to admin (run once on the server)
docker-compose exec api node -e "
  const db = require('better-sqlite3')(process.env.DB_PATH || '/data/census.db');
  db.prepare(\"UPDATE users SET role='admin' WHERE mobile=?\").run('9000000000');
  console.log('Admin promoted:', db.prepare(\"SELECT id, mobile, role FROM users WHERE mobile=?\").get('9000000000'));
"
```

Expected: `Admin promoted: { id: 1, mobile: '9000000000', role: 'admin' }`

- [ ] **Step 6: Smoke test login and quiz**

```bash
# Login as admin
TOKEN=$(curl -s -X POST http://localhost/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"mobile":"9000000000","password":"Admin@1234"}' | jq -r '.tokens.accessToken')

# Check dashboard
curl -s http://localhost/api/admin/dashboard -H "Authorization: Bearer $TOKEN" | jq .totalUsers
```

Expected: `1`

- [ ] **Step 7: Open the app in browser**

Navigate to `http://localhost` — should see the login page.

- [ ] **Step 8: Final commit**

```bash
git add docker-compose.yml
git commit -m "chore: final docker-compose + smoke test instructions"
```

---

## Self-Review Checklist

After this plan was written, a spec coverage check was performed:

| Spec Section | Covered By |
|---|---|
| Registration + profile | Task 17 (Register page), Task 6 (auth routes) |
| Mobile number + password login | Task 5+6 |
| Gamification / leaderboard | Tasks 9–11, 24 |
| Daily + overall leaderboard | Task 10, 24 |
| Badges + milestones | Tasks 9, 23, 25 |
| Shareable certificate (4 platforms) | Task 26 |
| QA folder, topic-wise | Task 4 |
| EN/HI bilingual | Tasks 14, quizQuestion component |
| 3 difficulty levels, MCQ, explanation | Tasks 7, 19 (QuizQuestion) |
| 5 functionary types | Task 5 (validation), Task 17 (register form) |
| Admin dashboard | Tasks 12, 27 |
| Admin user CRUD + drill-down | Tasks 12, 28 |
| 6 chapters | Defined in locales (Task 14), QuizSelector (Task 19) |
| Daily Quiz mode | Tasks 7, 8, 20 |
| Timed Quiz mode | Tasks 7, 8, 21 |
| Chapter Practice mode (resumable) | Tasks 7, 8, 22 |
| Docker deployment | Tasks 1–3, 30 |
| SQLite | Tasks 3–4 |
| Admin badge management | Tasks 12, 29 |
