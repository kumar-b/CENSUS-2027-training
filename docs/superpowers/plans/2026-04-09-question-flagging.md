# Question Flagging & Admin Review System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to flag quiz questions with a category + optional note; admins review, optionally edit the question, then resolve — awarding 1000 pts and tiered badges to all approved flaggers.

**Architecture:** New `question_flags` DB table + `flagService.js` service; two new Express route files (`/api/flags`, admin flag routes added to `/api/admin`); three new client pages (`MyFlagsPage`, `AdminFlagList`, `AdminFlagDetail`) plus targeted edits to `QuizQuestion`, `ProfilePage`, `AdminDashboard`, `AdminUserDetail`, `App.jsx`, and i18n files.

**Tech Stack:** Node.js/Express, better-sqlite3, React 18, react-router-dom, react-i18next, Tailwind CSS, Jest (server tests).

---

## File Map

**Create:**
- `server/services/flagService.js` — all flag DB operations
- `server/routes/flags.js` — user flag routes (`/api/flags`)
- `server/__tests__/flags.test.js` — server-side tests
- `client/src/pages/MyFlagsPage.jsx` — user's submitted flags list
- `client/src/pages/admin/AdminFlagList.jsx` — admin flag management list
- `client/src/pages/admin/AdminFlagDetail.jsx` — admin flag detail + edit + resolve

**Modify:**
- `server/db/migrations.js` — add `question_flags` table + 3 reviewer badges
- `server/services/badgeService.js` — add `flags_resolved` criteria type
- `server/index.js` — mount `/api/flags` route
- `server/routes/admin.js` — add admin flag routes
- `client/src/App.jsx` — add `/flags/mine`, `/admin/flags`, `/admin/flags/:id` routes
- `client/src/components/QuizQuestion.jsx` — add report button + modal
- `client/src/pages/ProfilePage.jsx` — add "My Reports" row
- `client/src/pages/admin/AdminDashboard.jsx` — add pending flags stat + link
- `client/src/pages/admin/AdminUserDetail.jsx` — add user's flags section
- `client/src/i18n/en.js` + `hi.js` — add flag-related translation keys

---

## Task 1: DB migration — `question_flags` table + reviewer badges

**Files:**
- Modify: `server/db/migrations.js`

- [ ] **Step 1: Add `question_flags` table and 3 new badges to `runMigrations`**

In `server/db/migrations.js`, inside the `db.exec(...)` block (after the `daily_scores` table, before the closing backtick), add:

```sql
    CREATE TABLE IF NOT EXISTS question_flags (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id  INTEGER NOT NULL REFERENCES questions(id),
      user_id      INTEGER NOT NULL REFERENCES users(id),
      category     TEXT NOT NULL,
      note         TEXT,
      status       TEXT NOT NULL DEFAULT 'pending',
      admin_note   TEXT,
      created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at  DATETIME,
      UNIQUE(question_id, user_id)
    );
```

Then after the existing `upsertBadge` calls (after the last `upsertBadge(...)` line), add:

```js
  // Reviewer badges (flag resolution rewards)
  upsertBadge('Question Spotter', 'प्रश्न खोजकर्ता', 'Successfully flag 1 incorrect question', '1 गलत प्रश्न की सफलतापूर्वक रिपोर्ट करें', '🔍', 'flags_resolved', 1);
  upsertBadge('Question Guardian', 'प्रश्न संरक्षक', 'Successfully flag 3 incorrect questions', '3 गलत प्रश्नों की सफलतापूर्वक रिपोर्ट करें', '🛡️', 'flags_resolved', 3);
  upsertBadge('Question Champion', 'प्रश्न चैम्पियन', 'Successfully flag 10 incorrect questions', '10 गलत प्रश्नों की सफलतापूर्वक रिपोर्ट करें', '🏅', 'flags_resolved', 10);
```

- [ ] **Step 2: Add `flags_resolved` criteria type to `badgeService.js`**

In `server/services/badgeService.js`, add this branch inside the `for (const badge of allBadges)` loop, after the `all_modes` block and before the closing `if (earned) {`:

```js
    } else if (badge.criteria_type === 'flags_resolved') {
      const count = db.prepare(
        "SELECT COUNT(*) as c FROM question_flags WHERE user_id=? AND status='resolved'"
      ).get(userId).c;
      earned = count >= badge.criteria_value;
    }
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/kb/Workspace/CENSUS 2027"
git add server/db/migrations.js server/services/badgeService.js
git commit -m "feat(flags): add question_flags table migration and reviewer badge criteria"
```

---

## Task 2: `flagService.js` — all DB operations

**Files:**
- Create: `server/services/flagService.js`
- Create: `server/__tests__/flags.test.js`

- [ ] **Step 1: Write the failing tests**

Create `server/__tests__/flags.test.js`:

```js
const path = require('path');
const os = require('os');
const fs = require('fs');

process.env.DB_PATH = path.join(os.tmpdir(), `flags-test-${Date.now()}.db`);
process.env.JWT_SECRET = 'test';
process.env.JWT_REFRESH_SECRET = 'test2';
process.env.QA_DIR = path.join(__dirname, '../../QA');

const { getDb, closeDb } = require('../db/database');
const { register } = require('../services/authService');
const { seedQuestions } = require('../db/seeder');
const {
  submitFlag, getUserFlags, listFlags, getFlagDetail,
  updateFlagStatus, updateFlagQuestion, resolveFlag,
} = require('../services/flagService');

let userId, userId2, questionId;

beforeAll(() => {
  getDb();
  seedQuestions();
  const u1 = register({ mobile: '9100000001', password: 'pass', name: 'Flagger One', functionary_type: 'Enumerator', state: 'CG', district: 'Raipur' });
  const u2 = register({ mobile: '9100000002', password: 'pass', name: 'Flagger Two', functionary_type: 'Enumerator', state: 'CG', district: 'Raipur' });
  userId = u1.id;
  userId2 = u2.id;
  questionId = getDb().prepare('SELECT id FROM questions LIMIT 1').get().id;
});

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

test('submitFlag creates a pending flag', () => {
  const flag = submitFlag({ userId, questionId, category: 'wrong_answer', note: 'Option B is correct not A' });
  expect(flag.id).toBeDefined();
  expect(flag.status).toBe('pending');
});

test('submitFlag throws 409 on duplicate', () => {
  expect(() => submitFlag({ userId, questionId, category: 'unclear', note: '' }))
    .toThrow(expect.objectContaining({ status: 409 }));
});

test('getUserFlags returns user flags with question excerpt', () => {
  const flags = getUserFlags(userId);
  expect(flags.length).toBe(1);
  expect(flags[0].question_excerpt).toBeDefined();
});

test('listFlags returns all flags filterable by status', () => {
  const all = listFlags({});
  expect(all.length).toBeGreaterThan(0);
  const pending = listFlags({ status: 'pending' });
  expect(pending.every(f => f.status === 'pending')).toBe(true);
});

test('getFlagDetail returns flag + full question data', () => {
  const flagId = listFlags({})[0].id;
  const detail = getFlagDetail(flagId);
  expect(detail.flag).toBeDefined();
  expect(detail.question.question_en).toBeDefined();
  expect(detail.question.options_en).toBeDefined();
});

test('updateFlagStatus sets approved with admin_note', () => {
  const flagId = listFlags({})[0].id;
  updateFlagStatus({ flagId, status: 'approved', adminNote: 'Confirmed wrong answer' });
  const detail = getFlagDetail(flagId);
  expect(detail.flag.status).toBe('approved');
  expect(detail.flag.admin_note).toBe('Confirmed wrong answer');
});

test('updateFlagQuestion updates question fields', () => {
  const flagId = listFlags({})[0].id;
  const detail = getFlagDetail(flagId);
  const qId = detail.question.id;
  updateFlagQuestion({ flagId, fields: { correct_option: 2, explanation_en: 'Fixed explanation' } });
  const updated = getDb().prepare('SELECT * FROM questions WHERE id=?').get(qId);
  expect(updated.correct_option).toBe(2);
  expect(updated.explanation_en).toBe('Fixed explanation');
});

test('resolveFlag awards 1000 pts to all approved flaggers', () => {
  // Second user also flags same question (insert directly since submitFlag would 409 after schema)
  const db = getDb();
  const flagId = listFlags({ status: 'approved' })[0].id;
  db.prepare("INSERT INTO question_flags (question_id, user_id, category, status) VALUES (?, ?, 'wrong_answer', 'approved')")
    .run(questionId, userId2);

  const beforePts1 = db.prepare('SELECT total_points FROM users WHERE id=?').get(userId).total_points;
  const beforePts2 = db.prepare('SELECT total_points FROM users WHERE id=?').get(userId2).total_points;

  resolveFlag({ flagId });

  const afterPts1 = db.prepare('SELECT total_points FROM users WHERE id=?').get(userId).total_points;
  const afterPts2 = db.prepare('SELECT total_points FROM users WHERE id=?').get(userId2).total_points;
  expect(afterPts1 - beforePts1).toBe(1000);
  expect(afterPts2 - beforePts2).toBe(1000);

  const flag = db.prepare('SELECT * FROM question_flags WHERE id=?').get(flagId);
  expect(flag.status).toBe('resolved');
  expect(flag.resolved_at).toBeDefined();
});

test('resolveFlag throws 400 if flag is not approved', () => {
  const newFlagId = submitFlag({ userId, questionId: getDb().prepare('SELECT id FROM questions LIMIT 1 OFFSET 1').get()?.id || questionId + 1, category: 'unclear', note: '' })?.id;
  if (!newFlagId) return; // skip if only 1 question
  expect(() => resolveFlag({ flagId: newFlagId }))
    .toThrow(expect.objectContaining({ status: 400 }));
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "/Users/kb/Workspace/CENSUS 2027/server"
npm test -- --testPathPattern=flags --forceExit 2>&1 | tail -20
```

Expected: FAIL with `Cannot find module '../services/flagService'`

- [ ] **Step 3: Create `server/services/flagService.js`**

```js
const { getDb } = require('../db/database');
const { awardBadges } = require('./badgeService');

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

// POST /api/flags
function submitFlag({ userId, questionId, category, note }) {
  const db = getDb();

  const question = db.prepare('SELECT id FROM questions WHERE id=?').get(questionId);
  if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });

  try {
    const result = db.prepare(
      'INSERT INTO question_flags (question_id, user_id, category, note) VALUES (?, ?, ?, ?)'
    ).run(questionId, userId, category, note || null);
    return db.prepare('SELECT * FROM question_flags WHERE id=?').get(result.lastInsertRowid);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      throw Object.assign(new Error('Already flagged'), { status: 409 });
    }
    throw err;
  }
}

// GET /api/flags/mine
function getUserFlags(userId) {
  const db = getDb();
  return db.prepare(`
    SELECT f.*, substr(q.question_en, 1, 80) as question_excerpt
    FROM question_flags f
    JOIN questions q ON q.id = f.question_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(userId);
}

// GET /api/admin/flags?status=
function listFlags({ status } = {}) {
  const db = getDb();
  if (status) {
    return db.prepare(`
      SELECT f.*, substr(q.question_en, 1, 80) as question_excerpt, u.name as reporter_name
      FROM question_flags f
      JOIN questions q ON q.id = f.question_id
      JOIN users u ON u.id = f.user_id
      WHERE f.status = ?
      ORDER BY f.created_at DESC
    `).all(status);
  }
  return db.prepare(`
    SELECT f.*, substr(q.question_en, 1, 80) as question_excerpt, u.name as reporter_name
    FROM question_flags f
    JOIN questions q ON q.id = f.question_id
    JOIN users u ON u.id = f.user_id
    ORDER BY f.created_at DESC
  `).all();
}

// GET /api/admin/flags/:id
function getFlagDetail(flagId) {
  const db = getDb();
  const flag = db.prepare(`
    SELECT f.*, u.name as reporter_name
    FROM question_flags f
    JOIN users u ON u.id = f.user_id
    WHERE f.id = ?
  `).get(flagId);
  if (!flag) throw Object.assign(new Error('Flag not found'), { status: 404 });

  const question = db.prepare('SELECT * FROM questions WHERE id=?').get(flag.question_id);

  // Count how many approved flaggers this question has
  const approvedCount = db.prepare(
    "SELECT COUNT(*) as c FROM question_flags WHERE question_id=? AND status='approved'"
  ).get(flag.question_id).c;

  return { flag, question, approvedCount };
}

// PATCH /api/admin/flags/:id/status — 'approved' or 'dismissed'
function updateFlagStatus({ flagId, status, adminNote }) {
  const db = getDb();
  const flag = db.prepare('SELECT id FROM question_flags WHERE id=?').get(flagId);
  if (!flag) throw Object.assign(new Error('Flag not found'), { status: 404 });
  if (!['approved', 'dismissed'].includes(status)) {
    throw Object.assign(new Error('Status must be approved or dismissed'), { status: 400 });
  }
  db.prepare('UPDATE question_flags SET status=?, admin_note=? WHERE id=?')
    .run(status, adminNote || null, flagId);
}

// PATCH /api/admin/flags/:id/question — edit question fields
function updateFlagQuestion({ flagId, fields }) {
  const db = getDb();
  const flag = db.prepare('SELECT question_id FROM question_flags WHERE id=?').get(flagId);
  if (!flag) throw Object.assign(new Error('Flag not found'), { status: 404 });

  const allowed = ['question_en', 'question_hi', 'options_en', 'options_hi', 'correct_option', 'explanation_en', 'explanation_hi'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) throw Object.assign(new Error('No valid fields to update'), { status: 400 });

  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  const values = updates.map(([, v]) => v);
  db.prepare(`UPDATE questions SET ${setClauses} WHERE id=?`).run(...values, flag.question_id);
}

// POST /api/admin/flags/:id/resolve
// Awards 1000 pts to all 'approved' flaggers of the same question_id, then marks them all resolved
function resolveFlag({ flagId, adminNote }) {
  const db = getDb();
  const flag = db.prepare('SELECT * FROM question_flags WHERE id=?').get(flagId);
  if (!flag) throw Object.assign(new Error('Flag not found'), { status: 404 });
  if (flag.status !== 'approved') {
    throw Object.assign(new Error('Flag must be approved before resolving'), { status: 400 });
  }

  const today = getTodayDate();

  // Find all approved flaggers for this question (includes this flag)
  const approvedFlaggers = db.prepare(
    "SELECT * FROM question_flags WHERE question_id=? AND status='approved'"
  ).all(flag.question_id);

  db.transaction(() => {
    for (const f of approvedFlaggers) {
      // Award 1000 points
      db.prepare('UPDATE users SET total_points = total_points + 1000 WHERE id=?').run(f.user_id);
      // Upsert daily score
      db.prepare(`
        INSERT INTO daily_scores (user_id, date, points) VALUES (?, ?, 1000)
        ON CONFLICT(user_id, date) DO UPDATE SET points = points + 1000
      `).run(f.user_id, today);
      // Mark flag resolved
      db.prepare(
        "UPDATE question_flags SET status='resolved', admin_note=?, resolved_at=CURRENT_TIMESTAMP WHERE id=?"
      ).run(adminNote || null, f.id);
    }
  })();

  // Award flag badges (outside transaction — badge errors are non-fatal)
  for (const f of approvedFlaggers) {
    try { awardBadges(f.user_id); } catch {}
  }

  return { resolvedCount: approvedFlaggers.length };
}

module.exports = { submitFlag, getUserFlags, listFlags, getFlagDetail, updateFlagStatus, updateFlagQuestion, resolveFlag };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "/Users/kb/Workspace/CENSUS 2027/server"
npm test -- --testPathPattern=flags --forceExit 2>&1 | tail -30
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd "/Users/kb/Workspace/CENSUS 2027"
git add server/services/flagService.js server/__tests__/flags.test.js
git commit -m "feat(flags): add flagService with full CRUD and resolve logic"
```

---

## Task 3: User flag routes (`/api/flags`)

**Files:**
- Create: `server/routes/flags.js`
- Modify: `server/index.js`

- [ ] **Step 1: Create `server/routes/flags.js`**

```js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { submitFlag, getUserFlags } = require('../services/flagService');

function handle(fn) {
  return (req, res) => {
    try {
      const result = fn(req, res);
      if (result !== undefined) res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  };
}

// POST /api/flags
// Body: { questionId, category, note }
router.post('/', authenticate, handle((req) => {
  const { questionId, category, note } = req.body;
  const allowed = ['wrong_answer', 'unclear', 'translation', 'other'];
  if (!questionId || !allowed.includes(category)) {
    throw Object.assign(new Error('Invalid flag data'), { status: 400 });
  }
  return submitFlag({ userId: req.user.sub, questionId, category, note });
}));

// GET /api/flags/mine
router.get('/mine', authenticate, handle((req) => {
  return getUserFlags(req.user.sub);
}));

module.exports = router;
```

- [ ] **Step 2: Mount the route in `server/index.js`**

Add after the existing `require` lines:
```js
const flagRoutes = require('./routes/flags');
```

Add after `app.use('/api/admin', adminRoutes);`:
```js
app.use('/api/flags', flagRoutes);
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/kb/Workspace/CENSUS 2027"
git add server/routes/flags.js server/index.js
git commit -m "feat(flags): add user flag routes POST /api/flags and GET /api/flags/mine"
```

---

## Task 4: Admin flag routes (in `admin.js`)

**Files:**
- Modify: `server/routes/admin.js`

- [ ] **Step 1: Add admin flag routes to the bottom of `server/routes/admin.js`** (before `module.exports`):

```js
const { listFlags, getFlagDetail, updateFlagStatus, updateFlagQuestion, resolveFlag } = require('../services/flagService');

// GET /api/admin/flags?status=pending
router.get('/flags', handle((req) => {
  return listFlags({ status: req.query.status });
}));

// GET /api/admin/flags/:id
router.get('/flags/:id', handle((req) => {
  return getFlagDetail(Number(req.params.id));
}));

// PATCH /api/admin/flags/:id/status
// Body: { status: 'approved'|'dismissed', adminNote? }
router.patch('/flags/:id/status', handle((req) => {
  const { status, adminNote } = req.body;
  updateFlagStatus({ flagId: Number(req.params.id), status, adminNote });
  return { success: true };
}));

// PATCH /api/admin/flags/:id/question
// Body: { question_en?, question_hi?, options_en?, options_hi?, correct_option?, explanation_en?, explanation_hi? }
router.patch('/flags/:id/question', handle((req) => {
  updateFlagQuestion({ flagId: Number(req.params.id), fields: req.body });
  return { success: true };
}));

// POST /api/admin/flags/:id/resolve
// Body: { adminNote? }
router.post('/flags/:id/resolve', handle((req) => {
  return resolveFlag({ flagId: Number(req.params.id), adminNote: req.body.adminNote });
}));

// GET /api/admin/stats — update to include pending flags count
```

- [ ] **Step 2: Add `pendingFlags` to the stats endpoint**

Find the existing `router.get('/stats', ...)` handler and update the return value:

```js
router.get('/stats', handle(() => {
  const db = getDb();
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalSessions = db.prepare('SELECT COUNT(*) as c FROM quiz_sessions WHERE completed=1').get().c;
  const todayDate = new Date().toISOString().slice(0, 10);
  const todayActive = db.prepare(
    "SELECT COUNT(DISTINCT user_id) as c FROM quiz_sessions WHERE date(started_at)=?"
  ).get(todayDate).c;
  const badgesAwarded = db.prepare('SELECT COUNT(*) as c FROM user_badges').get().c;
  const pendingFlags = db.prepare("SELECT COUNT(*) as c FROM question_flags WHERE status='pending'").get().c;

  return { totalUsers, totalSessions, todayActive, badgesAwarded, pendingFlags };
}));
```

Also add the import for `flagService` functions at the top of the file (below `const { getDb } = require('../db/database');`):

```js
const { listFlags, getFlagDetail, updateFlagStatus, updateFlagQuestion, resolveFlag } = require('../services/flagService');
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/kb/Workspace/CENSUS 2027"
git add server/routes/admin.js
git commit -m "feat(flags): add admin flag routes and pending flags count to stats"
```

---

## Task 5: i18n keys

**Files:**
- Modify: `client/src/i18n/en.js`
- Modify: `client/src/i18n/hi.js`

- [ ] **Step 1: Add keys to `client/src/i18n/en.js`**

Add a new section after `// Profile` section:

```js
    // Flags
    flagQuestion: 'Report an issue',
    reportIssue: '⚑ Report an issue with this question',
    wrongAnswer: 'Wrong answer',
    questionUnclear: 'Question unclear',
    translationError: 'Translation error',
    otherIssue: 'Other',
    addNote: 'Add a note (optional)',
    submitReport: 'Submit Report',
    alreadyReported: 'Already reported ✓',
    reportSubmitted: 'Thank you — your report has been submitted',
    myReports: 'My Reports',
    myFlags: 'My Reported Issues',
    flagPending: 'Pending',
    flagApproved: 'Approved',
    flagDismissed: 'Dismissed',
    flagResolved: 'Resolved ✓',
    pointsAwarded: '+1000 pts awarded',
    noFlagsYet: "You haven't reported any issues yet",
    adminNote: 'Admin note',
    pendingFlags: 'Pending Flags',
    flagManager: 'Flag Manager',
    resolveAndAward: 'Resolve & Award 1000 pts',
    confirmResolve: 'This will award 1000 points to {{count}} user(s) who flagged this question. Confirm?',
    saveQuestionChanges: 'Save Changes to Question',
    flagsSubmitted: 'Flags Submitted',
    approveFlag: 'Approve',
    dismissFlag: 'Dismiss',
    flagCategory: 'Category',
```

- [ ] **Step 2: Add keys to `client/src/i18n/hi.js`**

Add the same section in Hindi:

```js
    // Flags
    flagQuestion: 'समस्या रिपोर्ट करें',
    reportIssue: '⚑ इस प्रश्न में कोई समस्या रिपोर्ट करें',
    wrongAnswer: 'गलत उत्तर',
    questionUnclear: 'प्रश्न अस्पष्ट है',
    translationError: 'अनुवाद त्रुटि',
    otherIssue: 'अन्य',
    addNote: 'नोट जोड़ें (वैकल्पिक)',
    submitReport: 'रिपोर्ट जमा करें',
    alreadyReported: 'पहले ही रिपोर्ट किया ✓',
    reportSubmitted: 'धन्यवाद — आपकी रिपोर्ट जमा हो गई है',
    myReports: 'मेरी रिपोर्ट',
    myFlags: 'मेरी रिपोर्ट की गई समस्याएं',
    flagPending: 'लंबित',
    flagApproved: 'स्वीकृत',
    flagDismissed: 'अस्वीकृत',
    flagResolved: 'हल हो गई ✓',
    pointsAwarded: '+1000 अंक प्रदान किए गए',
    noFlagsYet: 'आपने अभी तक कोई समस्या रिपोर्ट नहीं की है',
    adminNote: 'व्यवस्थापक नोट',
    pendingFlags: 'लंबित रिपोर्ट',
    flagManager: 'रिपोर्ट प्रबंधक',
    resolveAndAward: 'हल करें और 1000 अंक दें',
    confirmResolve: 'इससे {{count}} उपयोगकर्ता(ओं) को 1000 अंक मिलेंगे जिन्होंने यह प्रश्न रिपोर्ट किया। पुष्टि करें?',
    saveQuestionChanges: 'प्रश्न में बदलाव सहेजें',
    flagsSubmitted: 'जमा की गई रिपोर्टें',
    approveFlag: 'स्वीकृत करें',
    dismissFlag: 'अस्वीकृत करें',
    flagCategory: 'श्रेणी',
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/kb/Workspace/CENSUS 2027"
git add client/src/i18n/en.js client/src/i18n/hi.js
git commit -m "feat(flags): add i18n translation keys for flagging feature"
```

---

## Task 6: `QuizQuestion.jsx` — report button + modal

**Files:**
- Modify: `client/src/components/QuizQuestion.jsx`

- [ ] **Step 1: Add report button and modal to `QuizQuestion.jsx`**

Replace the entire file content:

```jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function seededShuffle(arr, seed) {
  const items = arr.map((v, i) => ({ v, i }));
  let s = seed | 0;
  for (let i = items.length - 1; i > 0; i--) {
    s = Math.imul(s, 1664525) + 1013904223 | 0;
    const j = Math.abs(s) % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

const CATEGORIES = [
  { key: 'wrong_answer', labelKey: 'wrongAnswer' },
  { key: 'unclear', labelKey: 'questionUnclear' },
  { key: 'translation', labelKey: 'translationError' },
  { key: 'other', labelKey: 'otherIssue' },
];

function FlagModal({ question, onClose, onSuccess, alreadyFlagged }) {
  const { t } = useTranslation();
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!category) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/flags', { questionId: question.id, category, note });
      onSuccess();
    } catch (err) {
      if (err.response?.status === 409) {
        onSuccess(); // treat duplicate as success (already reported)
      } else {
        setError(err.response?.data?.error || t('error'));
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white rounded-t-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-gray-800">{t('flagQuestion')}</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${category === key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
        <textarea
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
          rows={3}
          placeholder={t('addNote')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={submit}
            disabled={!category || submitting}
            className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {submitting ? t('loading') : t('submitReport')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function QuizQuestion({ question, onAnswer, answered, result, currentIndex, total, flaggedQuestionIds, onFlagged }) {
  const { t, i18n } = useTranslation();
  const isHi = i18n.language === 'hi';
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');

  const text = isHi && question.question_hi ? question.question_hi : question.question_en;
  const options = isHi && question.options_hi
    ? JSON.parse(question.options_hi)
    : JSON.parse(question.options_en);
  const explanation = isHi && question.explanation_hi ? question.explanation_hi : question.explanation_en;

  const shuffled = seededShuffle(options, question.id);
  const answeredDisplayIdx = answered !== null
    ? shuffled.findIndex((item) => item.i === answered)
    : null;

  const alreadyFlagged = flaggedQuestionIds?.has(question.id);

  const handleFlagSuccess = () => {
    setShowModal(false);
    setToast(t('reportSubmitted'));
    onFlagged?.(question.id);
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Q {currentIndex + 1} / {total}</span>
        <span className="capitalize text-xs bg-gray-100 px-2 py-0.5 rounded-full">{question.difficulty}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((currentIndex) / total) * 100}%` }}
        />
      </div>

      <p className="text-gray-800 font-medium text-base leading-relaxed">{text}</p>

      <div className="space-y-2">
        {shuffled.map(({ v: opt, i: origIdx }, displayIdx) => {
          let style = 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer';
          if (answered !== null) {
            if (origIdx === result?.correctOption) style = 'border-green-400 bg-green-50';
            else if (displayIdx === answeredDisplayIdx && origIdx !== result?.correctOption) style = 'border-red-400 bg-red-50';
            else style = 'border-gray-200 bg-gray-50 opacity-60';
          }
          return (
            <button
              key={origIdx}
              disabled={answered !== null}
              onClick={() => onAnswer(origIdx)}
              className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${style}`}
            >
              <span className="font-semibold text-indigo-600 mr-2">{OPTION_LABELS[displayIdx]}.</span>
              {opt}
            </button>
          );
        })}
      </div>

      {answered !== null && explanation && (
        <div className={`rounded-xl p-3 text-sm ${result?.isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <span className="font-semibold">{result?.isCorrect ? '✓ Correct! ' : '✗ Incorrect. '}</span>
          {explanation}
          {result?.pointsEarned > 0 && (
            <span className="ml-2 font-bold text-indigo-600">+{result.pointsEarned} pts</span>
          )}
        </div>
      )}

      {/* Report button — only visible after answering */}
      {answered !== null && (
        <div className="text-center">
          {alreadyFlagged ? (
            <span className="text-xs text-gray-400">{t('alreadyReported')}</span>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="text-xs text-gray-400 hover:text-indigo-500 transition-colors underline underline-offset-2"
            >
              {t('reportIssue')}
            </button>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-4 py-2 rounded-full z-50 shadow-lg">
          {toast}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <FlagModal
          question={question}
          onClose={() => setShowModal(false)}
          onSuccess={handleFlagSuccess}
          alreadyFlagged={alreadyFlagged}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `QuizRunner.jsx` to track flagged question IDs and pass them down**

In `client/src/components/QuizRunner.jsx`, add state and pass props to `QuizQuestion`:

```jsx
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuizStore } from '../store/quizStore';
import QuizQuestion from './QuizQuestion';
import QuizTimer from './QuizTimer';

export default function QuizRunner({ mode, timerSeconds }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { questions, currentIndex, answers, submitAnswer, completeSession, nextQuestion } = useQuizStore();

  const [answered, setAnswered] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [streak, setStreak] = useState(0);
  const [timeExpired, setTimeExpired] = useState(false);
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState(new Set());

  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  const handleAnswer = async (optionIdx) => {
    if (answered !== null || submitting) return;
    setSubmitting(true);
    const res = await submitAnswer(question.id, optionIdx, null);
    setAnswered(optionIdx);
    setAnswerResult(res);
    setStreak(res.currentStreak);
    setSubmitting(false);
  };

  const handleNext = async () => {
    const wasLast = isLast;
    setAnswered(null);
    setAnswerResult(null);
    if (wasLast) {
      const res = await completeSession();
      navigate('/results', { state: { result: res, questions, answers } });
    } else {
      nextQuestion();
    }
  };

  const handleTimerExpire = useCallback(async () => {
    if (timeExpired) return;
    setTimeExpired(true);
    const res = await completeSession();
    navigate('/results', { state: { result: res, questions, answers } });
  }, [timeExpired, completeSession, navigate]);

  const handleFlagged = (questionId) => {
    setFlaggedQuestionIds((prev) => new Set([...prev, questionId]));
  };

  if (!question) {
    return <div className="flex items-center justify-center py-20 text-gray-400">{t('loading')}</div>;
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {streak >= 3 && (
            <span className="text-sm font-semibold text-orange-500">🔥 ×{streak}</span>
          )}
        </div>
        {timerSeconds && (
          <QuizTimer totalSeconds={timerSeconds} onExpire={handleTimerExpire} />
        )}
      </div>

      <QuizQuestion
        question={question}
        onAnswer={handleAnswer}
        answered={answered}
        result={answerResult}
        currentIndex={currentIndex}
        total={questions.length}
        flaggedQuestionIds={flaggedQuestionIds}
        onFlagged={handleFlagged}
      />

      {answered !== null && (
        <button
          onClick={handleNext}
          className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 transition-colors"
        >
          {isLast ? t('finish') : t('next')}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/kb/Workspace/CENSUS 2027"
git add client/src/components/QuizQuestion.jsx client/src/components/QuizRunner.jsx
git commit -m "feat(flags): add report button and modal to QuizQuestion, track flagged IDs in QuizRunner"
```

---

## Task 7: `MyFlagsPage.jsx`

**Files:**
- Create: `client/src/pages/MyFlagsPage.jsx`

- [ ] **Step 1: Create `client/src/pages/MyFlagsPage.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-100 text-blue-700',
  dismissed: 'bg-red-100 text-red-600',
  resolved: 'bg-green-100 text-green-700',
};

const CATEGORY_LABELS = {
  wrong_answer: 'wrongAnswer',
  unclear: 'questionUnclear',
  translation: 'translationError',
  other: 'otherIssue',
};

export default function MyFlagsPage() {
  const { t } = useTranslation();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/flags/mine')
      .then(({ data }) => setFlags(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">{t('loading')}</div>;

  return (
    <div className="px-4 py-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">{t('myFlags')}</h2>

      {flags.length === 0 ? (
        <p className="text-gray-400 text-sm">{t('noFlagsYet')}</p>
      ) : (
        <div className="space-y-3">
          {flags.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-700 flex-1 leading-snug">{f.question_excerpt}…</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLES[f.status] || STATUS_STYLES.pending}`}>
                  {t(`flag${f.status.charAt(0).toUpperCase() + f.status.slice(1)}`)}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                  {t(CATEGORY_LABELS[f.category] || 'otherIssue')}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(f.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>

              {f.status === 'resolved' && (
                <p className="text-xs font-semibold text-green-600">{t('pointsAwarded')}</p>
              )}

              {f.admin_note && f.status !== 'pending' && (
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500"><span className="font-medium">{t('adminNote')}:</span> {f.admin_note}</p>
                </div>
              )}
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
cd "/Users/kb/Workspace/CENSUS 2027"
git add client/src/pages/MyFlagsPage.jsx
git commit -m "feat(flags): add MyFlagsPage showing user's submitted flag statuses"
```

---

## Task 8: `ProfilePage.jsx` — "My Reports" row

**Files:**
- Modify: `client/src/pages/ProfilePage.jsx`

- [ ] **Step 1: Add My Reports link to ProfilePage**

In `client/src/pages/ProfilePage.jsx`, add `useNavigate` to the import and a pending flags count fetch. Find the import line and update:

```jsx
import { useEffect, useState, useRef, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import html2canvas from 'html2canvas';
```

Add state and effect in the component (after the existing `useState` declarations):

```jsx
const navigate = useNavigate();
const [pendingFlagsCount, setPendingFlagsCount] = useState(0);
```

Add to the `useEffect` (after the existing `api.get('/user/me')` call):

```jsx
    api.get('/flags/mine').then(({ data }) => {
      setPendingFlagsCount(data.filter(f => f.status === 'pending').length);
    }).catch(() => {});
```

Add the "My Reports" row in the JSX, right before the `{/* Certificate */}` section:

```jsx
      {/* My Reports */}
      <button
        onClick={() => navigate('/flags/mine')}
        className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 flex items-center justify-between hover:border-indigo-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">⚑</span>
          <span className="font-medium text-gray-800 text-sm">{t('myReports')}</span>
        </div>
        <div className="flex items-center gap-2">
          {pendingFlagsCount > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingFlagsCount} pending
            </span>
          )}
          <span className="text-gray-300 text-sm">›</span>
        </div>
      </button>
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/kb/Workspace/CENSUS 2027"
git add client/src/pages/ProfilePage.jsx
git commit -m "feat(flags): add My Reports link to ProfilePage with pending count badge"
```

---

## Task 9: `AdminFlagList.jsx`

**Files:**
- Create: `client/src/pages/admin/AdminFlagList.jsx`

- [ ] **Step 1: Create `client/src/pages/admin/AdminFlagList.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

const TABS = ['pending', 'approved', 'dismissed', 'resolved'];

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-100 text-blue-700',
  dismissed: 'bg-red-100 text-red-600',
  resolved: 'bg-green-100 text-green-700',
};

const CATEGORY_LABELS = {
  wrong_answer: 'Wrong answer',
  unclear: 'Unclear',
  translation: 'Translation error',
  other: 'Other',
};

export default function AdminFlagList() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('pending');
  const [flags, setFlags] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchFlags = async (status) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/flags?status=${status}`);
      setFlags(data);
    } catch {}
    setLoading(false);
  };

  const fetchCounts = async () => {
    try {
      const results = await Promise.all(
        TABS.map(s => api.get(`/admin/flags?status=${s}`).then(r => [s, r.data.length]))
      );
      setCounts(Object.fromEntries(results));
    } catch {}
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    fetchFlags(activeTab);
  }, [activeTab]);

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="text-indigo-600 text-sm">← Admin</Link>
        <h2 className="text-xl font-bold text-gray-800">{t('flagManager')}</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${activeTab === tab ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
            {counts[tab] > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${tab === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'}`}>
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">{t('loading')}</div>
      ) : flags.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-10">No {activeTab} flags</p>
      ) : (
        <div className="space-y-2">
          {flags.map((f) => (
            <Link
              key={f.id}
              to={`/admin/flags/${f.id}`}
              className="block bg-white rounded-2xl border border-gray-200 p-4 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-700 flex-1 leading-snug">{f.question_excerpt}…</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLES[f.status]}`}>
                  {f.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                  {CATEGORY_LABELS[f.category] || f.category}
                </span>
                <span className="text-xs text-gray-500">{f.reporter_name}</span>
                <span className="text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString('en-IN')}</span>
              </div>
              {f.note && (
                <p className="text-xs text-gray-400 mt-1 italic">"{f.note}"</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/kb/Workspace/CENSUS 2027"
git add client/src/pages/admin/AdminFlagList.jsx
git commit -m "feat(flags): add AdminFlagList page with status tabs"
```

---

## Task 10: `AdminFlagDetail.jsx`

**Files:**
- Create: `client/src/pages/admin/AdminFlagDetail.jsx`

- [ ] **Step 1: Create `client/src/pages/admin/AdminFlagDetail.jsx`**

```jsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

const CATEGORY_LABELS = {
  wrong_answer: 'Wrong answer',
  unclear: 'Question unclear',
  translation: 'Translation error',
  other: 'Other',
};

export default function AdminFlagDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [editFields, setEditFields] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get(`/admin/flags/${id}`).then(({ data: d }) => {
      setData(d);
      setAdminNote(d.flag.admin_note || '');
      // Pre-populate edit form
      const q = d.question;
      setEditFields({
        question_en: q.question_en,
        question_hi: q.question_hi,
        options_en: q.options_en,
        options_hi: q.options_hi,
        correct_option: q.correct_option,
        explanation_en: q.explanation_en,
        explanation_hi: q.explanation_hi,
      });
    }).catch(() => {});
  };

  useEffect(() => { load(); }, [id]);

  const handleStatus = async (status) => {
    setMsg(''); setError('');
    try {
      await api.patch(`/admin/flags/${id}/status`, { status, adminNote });
      load();
      setMsg(`Flag ${status}`);
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    }
  };

  const handleSaveQuestion = async () => {
    setSaving(true); setMsg(''); setError('');
    try {
      await api.patch(`/admin/flags/${id}/question`, editFields);
      setMsg('Question updated successfully');
      load();
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    }
    setSaving(false);
  };

  const handleResolve = async () => {
    const count = data.approvedCount;
    if (!window.confirm(`This will award 1000 points to ${count} user(s) who flagged this question. Confirm?`)) return;
    setMsg(''); setError('');
    try {
      await api.post(`/admin/flags/${id}/resolve`, { adminNote });
      setMsg(`Resolved! ${count} user(s) awarded 1000 pts each.`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    }
  };

  if (!data) return <div className="p-6 text-center text-gray-400">{t('loading')}</div>;

  const { flag, question, approvedCount } = data;
  const options = JSON.parse(question.options_en);
  const optionsHi = question.options_hi ? JSON.parse(question.options_hi) : null;

  return (
    <div className="px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/admin/flags" className="text-indigo-600 text-sm">← Flags</Link>
        <h2 className="text-xl font-bold text-gray-800">Flag #{flag.id}</h2>
      </div>

      {msg && <p className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-2 text-sm">{msg}</p>}
      {error && <p className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-2 text-sm">{error}</p>}

      {/* Flag info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-800">{flag.reporter_name}</p>
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
            {CATEGORY_LABELS[flag.category] || flag.category}
          </span>
        </div>
        <p className="text-xs text-gray-400">{new Date(flag.created_at).toLocaleDateString('en-IN')}</p>
        {flag.note && <p className="text-sm text-gray-600 italic">"{flag.note}"</p>}
        {flag.admin_note && (
          <p className="text-xs text-gray-500"><span className="font-medium">{t('adminNote')}:</span> {flag.admin_note}</p>
        )}
        {flag.resolved_at && (
          <p className="text-xs text-gray-400">Resolved: {new Date(flag.resolved_at).toLocaleDateString('en-IN')}</p>
        )}
      </div>

      {/* Current question display */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Question</p>
        <p className="text-sm font-medium text-gray-800">{question.question_en}</p>
        {question.question_hi && <p className="text-sm text-gray-500">{question.question_hi}</p>}
        <div className="space-y-1.5">
          {options.map((opt, idx) => (
            <div
              key={idx}
              className={`rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${idx === question.correct_option ? 'border-green-300 bg-green-50 text-green-800 font-semibold' : 'border-gray-100 bg-gray-50 text-gray-600'}`}
            >
              <span className="w-4 flex-shrink-0">{OPTION_LABELS[idx]}.</span>
              <span className="flex-1">{opt}</span>
              {optionsHi && <span className="text-gray-400 text-xs">{optionsHi[idx]}</span>}
              {idx === question.correct_option && <span>✓</span>}
            </div>
          ))}
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600">
          <span className="font-medium">Explanation:</span> {question.explanation_en}
        </div>
      </div>

      {/* Action panel */}
      {flag.status === 'pending' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Admin Note (optional)</p>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            rows={2}
            placeholder="Leave a note for the reporter..."
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleStatus('dismissed')}
              className="flex-1 border border-red-200 text-red-600 rounded-xl py-2.5 text-sm font-medium hover:bg-red-50 transition-colors"
            >
              {t('dismissFlag')}
            </button>
            <button
              onClick={() => handleStatus('approved')}
              className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {t('approveFlag')}
            </button>
          </div>
        </div>
      )}

      {flag.status === 'approved' && editFields && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Edit Question</p>

          {[
            { label: 'Question (EN)', field: 'question_en', rows: 2 },
            { label: 'Question (HI)', field: 'question_hi', rows: 2 },
            { label: 'Explanation (EN)', field: 'explanation_en', rows: 2 },
            { label: 'Explanation (HI)', field: 'explanation_hi', rows: 2 },
          ].map(({ label, field, rows }) => (
            <div key={field}>
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                rows={rows}
                value={editFields[field] || ''}
                onChange={(e) => setEditFields(f => ({ ...f, [field]: e.target.value }))}
              />
            </div>
          ))}

          <div>
            <p className="text-xs text-gray-500 mb-1">Options (EN) — comma-separated JSON array</p>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={editFields.options_en || ''}
              onChange={(e) => setEditFields(f => ({ ...f, options_en: e.target.value }))}
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Options (HI) — comma-separated JSON array</p>
            <input
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={editFields.options_hi || ''}
              onChange={(e) => setEditFields(f => ({ ...f, options_hi: e.target.value }))}
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Correct Option Index (0–3)</p>
            <input
              type="number" min={0} max={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={editFields.correct_option}
              onChange={(e) => setEditFields(f => ({ ...f, correct_option: Number(e.target.value) }))}
            />
          </div>

          <button
            onClick={handleSaveQuestion}
            disabled={saving}
            className="w-full bg-gray-800 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            {saving ? t('loading') : t('saveQuestionChanges')}
          </button>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500 mb-2">Admin Note (optional)</p>
            <textarea
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
              rows={2}
              placeholder="Note for reporters..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
            <button
              onClick={handleResolve}
              className="w-full mt-2 bg-green-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 transition-colors"
            >
              {t('resolveAndAward')} ({approvedCount} user{approvedCount !== 1 ? 's' : ''})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/kb/Workspace/CENSUS 2027"
git add client/src/pages/admin/AdminFlagDetail.jsx
git commit -m "feat(flags): add AdminFlagDetail page with approve/dismiss/edit/resolve workflow"
```

---

## Task 11: Wire up routes + update `AdminDashboard` + `AdminUserDetail`

**Files:**
- Modify: `client/src/App.jsx`
- Modify: `client/src/pages/admin/AdminDashboard.jsx`
- Modify: `client/src/pages/admin/AdminUserDetail.jsx`

- [ ] **Step 1: Add routes to `client/src/App.jsx`**

Add imports (after the existing admin imports):

```jsx
import MyFlagsPage from './pages/MyFlagsPage';
import AdminFlagList from './pages/admin/AdminFlagList';
import AdminFlagDetail from './pages/admin/AdminFlagDetail';
```

Add routes (after the `/profile` route and before `/admin`):

```jsx
          <Route path="/flags/mine" element={<ProtectedRoute><MyFlagsPage /></ProtectedRoute>} />
```

Add admin routes (after `/admin/badges`):

```jsx
          <Route path="/admin/flags" element={<ProtectedRoute adminOnly><AdminFlagList /></ProtectedRoute>} />
          <Route path="/admin/flags/:id" element={<ProtectedRoute adminOnly><AdminFlagDetail /></ProtectedRoute>} />
```

- [ ] **Step 2: Update `AdminDashboard.jsx`** — add pending flags stat card and link

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-2xl p-5 text-center ${color}`}>
      <p className="text-3xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div className="px-4 py-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-800">{t('adminDashboard')}</h2>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={t('totalUsers')} value={stats?.totalUsers} color="bg-indigo-50" />
        <StatCard label={t('totalSessions')} value={stats?.totalSessions} color="bg-green-50" />
        <StatCard label={t('todayActive')} value={stats?.todayActive} color="bg-amber-50" />
        <StatCard label={t('badgesAwarded')} value={stats?.badgesAwarded} color="bg-purple-50" />
        <StatCard label={t('pendingFlags')} value={stats?.pendingFlags} color="bg-red-50" />
      </div>

      <div className="space-y-2">
        <Link
          to="/admin/users"
          className="block w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-left shadow-sm hover:border-indigo-300 transition-colors"
        >
          <p className="font-semibold text-gray-800">👥 {t('users')}</p>
          <p className="text-sm text-gray-400">View all users, drill down, reset passwords</p>
        </Link>
        <Link
          to="/admin/badges"
          className="block w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-left shadow-sm hover:border-indigo-300 transition-colors"
        >
          <p className="font-semibold text-gray-800">🏅 {t('badgeManager')}</p>
          <p className="text-sm text-gray-400">View all badges and award counts</p>
        </Link>
        <Link
          to="/admin/flags"
          className="block w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-left shadow-sm hover:border-indigo-300 transition-colors"
        >
          <p className="font-semibold text-gray-800">⚑ {t('flagManager')}</p>
          <p className="text-sm text-gray-400">Review user-reported question issues</p>
          {stats?.pendingFlags > 0 && (
            <span className="inline-block mt-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {stats.pendingFlags} pending
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add "Flags Submitted" section to `AdminUserDetail.jsx`**

In `server/routes/admin.js`, update the `GET /api/admin/users/:id` route to include the user's flags:

```js
router.get('/users/:id', handle((req) => {
  const db = getDb();
  const userId = Number(req.params.id);

  const user = db.prepare(
    'SELECT id, name, mobile, functionary_type, state, district, total_points, role, created_at, last_login FROM users WHERE id=?'
  ).get(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const badges = db.prepare(`
    SELECT b.*, ub.earned_at FROM badges b
    JOIN user_badges ub ON ub.badge_id = b.id
    WHERE ub.user_id = ? ORDER BY ub.earned_at DESC
  `).all(userId);

  const sessions = db.prepare(`
    SELECT id, mode, chapter, score, max_score, streak_max, completed, started_at, completed_at
    FROM quiz_sessions WHERE user_id=? ORDER BY started_at DESC LIMIT 50
  `).all(userId);

  const flags = db.prepare(`
    SELECT f.id, f.category, f.status, f.created_at, substr(q.question_en, 1, 80) as question_excerpt
    FROM question_flags f
    JOIN questions q ON q.id = f.question_id
    WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT 20
  `).all(userId);

  return { user, badges, sessions, flags };
}));
```

Then in `client/src/pages/admin/AdminUserDetail.jsx`, add a "Flags Submitted" section at the bottom (before the closing `</div>`):

```jsx
      {/* Flags submitted */}
      {data?.flags?.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-2">{t('flagsSubmitted')}</p>
          <div className="space-y-1.5">
            {data.flags.map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-2.5">
                <p className="text-xs text-gray-600 flex-1 truncate">{f.question_excerpt}…</p>
                <span className={`text-xs font-semibold ml-2 px-2 py-0.5 rounded-full flex-shrink-0 ${
                  f.status === 'resolved' ? 'bg-green-100 text-green-700' :
                  f.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                  f.status === 'dismissed' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-600'
                }`}>{f.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
```

Note: update the `data` destructuring from `const { user, badges, sessions } = data;` to `const { user, badges, sessions, flags: userFlags } = data;` and use `userFlags` in the map.

- [ ] **Step 4: Commit**

```bash
cd "/Users/kb/Workspace/CENSUS 2027"
git add client/src/App.jsx client/src/pages/admin/AdminDashboard.jsx client/src/pages/admin/AdminUserDetail.jsx server/routes/admin.js
git commit -m "feat(flags): wire routes, update AdminDashboard with flags link/stat, add flags to AdminUserDetail"
```

---

## Task 12: End-to-end verification

- [ ] **Step 1: Run all server tests**

```bash
cd "/Users/kb/Workspace/CENSUS 2027/server"
npm test -- --forceExit 2>&1 | tail -30
```

Expected: All test suites pass

- [ ] **Step 2: Start the dev server and verify flag submission**

```bash
cd "/Users/kb/Workspace/CENSUS 2027/server" && npm run dev &
cd "/Users/kb/Workspace/CENSUS 2027/client" && npm run dev
```

1. Log in as a regular user
2. Start any quiz, answer a question
3. Click "⚑ Report an issue with this question"
4. Select "Wrong answer" chip, add note "Testing flag"
5. Click "Submit Report" → toast appears
6. Navigate to Profile → "My Reports" → verify flag shows as **Pending**

- [ ] **Step 3: Verify admin flow**

1. Log in as admin
2. Go to `/admin` → verify "Pending Flags" stat card shows 1
3. Click "⚑ Flag Manager" link
4. Open the pending flag → click "Approve"
5. Edit correct_option to a different value → "Save Changes to Question"
6. Click "Resolve & Award 1000 pts (1 user)" → confirm
7. Verify success message, flag status shows Resolved

- [ ] **Step 4: Verify user sees resolution**

1. Switch back to user account
2. Go to Profile → "My Reports" → flag shows **Resolved ✓** with "+1000 pts awarded"
3. Check that total_points on home screen increased by 1000

- [ ] **Step 5: Verify reviewer badges**

```bash
cd "/Users/kb/Workspace/CENSUS 2027/server"
node -e "
  require('dotenv').config();
  const db = require('better-sqlite3')(process.env.DB_PATH);
  const userId = 1; // adjust to your user id
  const badges = db.prepare('SELECT b.name_en FROM user_badges ub JOIN badges b ON b.id=ub.badge_id WHERE ub.user_id=?').all(userId);
  console.log(badges.map(b=>b.name_en));
"
```

Expected: `'Question Spotter'` in the list after first resolved flag
