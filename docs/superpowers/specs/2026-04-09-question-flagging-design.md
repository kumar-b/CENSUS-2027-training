# Question Flagging & Admin Review System — Design Spec

**Date:** 2026-04-09  
**Project:** Census 2027 Training Platform

---

## Overview

Users can flag questions they believe are incorrect or unclear. Admins review flags, can correct the question in the database, and then resolve the flag — which awards 1000 points to every user who flagged that question. Three tiered reviewer badges are also earnable for accumulated successful flag resolutions.

---

## Data Model

### New table: `question_flags`

```sql
CREATE TABLE question_flags (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id  INTEGER NOT NULL REFERENCES questions(id),
  user_id      INTEGER NOT NULL REFERENCES users(id),
  category     TEXT NOT NULL,   -- 'wrong_answer' | 'unclear' | 'translation' | 'other'
  note         TEXT,            -- optional free text from user
  status       TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'dismissed' | 'resolved'
  admin_note   TEXT,            -- optional note left by admin on approve/dismiss/resolve
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at  DATETIME,        -- set when status becomes 'resolved'
  UNIQUE(question_id, user_id)  -- one flag per user per question
);
```

Multiple users can flag the same question; all approved flaggers receive 1000 pts on resolution.

### New badges (seeded at startup)

| Badge | Icon | Criteria type | Value |
|-------|------|---------------|-------|
| Question Spotter | 🔍 | `flags_resolved` | 1 |
| Question Guardian | 🛡️ | `flags_resolved` | 3 |
| Question Champion | 🏅 | `flags_resolved` | 10 |

`badgeService.js` gains a `flags_resolved` criteria check — counts resolved flags for the user and compares against badge thresholds.

---

## Backend

### New file: `server/routes/flags.js` (mounted at `/api/flags`)

**User routes** (require `authenticate`):

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/flags` | `{ questionId, category, note }` | Submit a flag. Returns 409 if already flagged by this user. |
| GET | `/api/flags/mine` | — | Returns user's own flags with status, question excerpt, admin note, resolved_at |

**Admin routes** (require `authenticate` + `adminOnly`, added to `server/routes/admin.js`):

| Method | Path | Body | Description |
|--------|------|------|-------------|
| GET | `/api/admin/flags` | query: `?status=pending` | List all flags, filterable by status. Includes question excerpt and reporter name. |
| GET | `/api/admin/flags/:id` | — | Full flag detail + complete question data |
| PATCH | `/api/admin/flags/:id/status` | `{ status, adminNote }` | Set status to `approved` or `dismissed` |
| PATCH | `/api/admin/flags/:id/question` | `{ question_en, question_hi, options_en, options_hi, correct_option, explanation_en, explanation_hi }` | Update question fields in `questions` table |
| POST | `/api/admin/flags/:id/resolve` | `{ adminNote? }` | Resolve flag: award 1000 pts to all `approved` flaggers of this question_id, update daily_scores, check flag badges, set resolved_at |

### Points & badge award on resolve (`POST /api/admin/flags/:id/resolve`)

1. Fetch all `question_flags` rows where `question_id` matches the resolved flag AND `status = 'approved'` (includes the flag being resolved, which transitions to `resolved` in the same transaction)
2. For each flagging user: `UPDATE users SET total_points = total_points + 1000`
3. Upsert `daily_scores` for today for each flagging user
4. Call `awardFlagBadges(userId)` for each — counts their total `resolved` flags and awards badge if threshold reached
5. Set `status = 'resolved'`, `resolved_at = CURRENT_TIMESTAMP` on all matching approved flags for this question

Note: "resolve" acts on all approved flaggers of the question, not just the single flag record clicked.

### `server/services/flagService.js` (new)

Encapsulates all flag DB operations: `submitFlag`, `getUserFlags`, `listFlags`, `getFlagDetail`, `updateFlagStatus`, `updateFlagQuestion`, `resolveFlag`.

---

## Admin UI

### `AdminFlagList.jsx` (route: `/admin/flags`)

- Tab bar: **Pending | Approved | Dismissed | Resolved**
- Each flag card: question excerpt (first 80 chars), category chip, reporter name, submission date, optional note
- Pending count shown on the tab label
- Clicking a card navigates to `AdminFlagDetail.jsx`

### `AdminFlagDetail.jsx` (route: `/admin/flags/:id`)

**Top section:** reporter name, submission date, category, user note

**Question section:** full question text EN + HI, all 4 options EN + HI, current correct answer highlighted in green

**Action panel (status-dependent):**

- `pending`: "Approve" (with optional admin note input) | "Dismiss" buttons
- `approved`:
  - Inline edit form for all question fields (pre-populated from DB)
  - "Save Changes to Question" button
  - "Resolve & Award 1000 pts" button — clicking shows confirmation: "This will award 1000 points to N user(s) who flagged this question. Confirm?"
- `resolved` / `dismissed`: read-only view showing admin note and resolution date

### `AdminDashboard.jsx` changes

- Add a "Flags" stat card showing pending flag count
- Add link to `/admin/flags`

### `AdminUserDetail.jsx` changes

- Add "Flags Submitted" section: list of that user's flags with status and question excerpt

### Routing

Add `/admin/flags` and `/admin/flags/:id` to the admin router in `client/src/App.jsx`.

---

## User UI

### `QuizQuestion.jsx` changes

After the explanation box renders (i.e. `answered !== null`), show a small subtle link below:

```
⚑ Report an issue with this question
```

Clicking opens a modal/bottom sheet:
- 4 category chips (single-select): "Wrong answer" | "Question unclear" | "Translation error" | "Other"
- Optional textarea: "Add a note (optional)"
- "Submit Report" | "Cancel"
- Success: toast "Thank you — your report has been submitted"
- If already flagged by this user: button is replaced with "Already reported ✓" (disabled)

The component tracks `flaggedQuestionIds` in local state (set maintained across questions in a session), populated by checking the server response on flag submit.

### `MyFlagsPage.jsx` (new, route: `/flags/mine`)

List of user's submitted flags. Each card shows:
- Question excerpt (first 80 chars EN)
- Category chip
- Status badge: `Pending` (gray) | `Approved` (blue) | `Dismissed` (red) | `Resolved ✓` (green)
- If resolved: "+1000 pts awarded" in green
- Admin note (if any), shown for all non-pending statuses
- Submission date

Empty state: "You haven't reported any issues yet."

### `ProfilePage.jsx` changes

Add a "My Reports" tappable row in the profile menu area. Shows a badge count if the user has any pending flags. Navigates to `/flags/mine`.

### i18n keys to add (en.js + hi.js)

```
flagQuestion, reportIssue, wrongAnswer, questionUnclear, translationError,
otherIssue, addNote, submitReport, alreadyReported, reportSubmitted,
myReports, myFlags, flagPending, flagApproved, flagDismissed, flagResolved,
pointsAwarded, noFlagsYet, adminNote
```

---

## Routing Summary

| Path | Component | Auth |
|------|-----------|------|
| `/flags/mine` | `MyFlagsPage` | user |
| `/admin/flags` | `AdminFlagList` | admin |
| `/admin/flags/:id` | `AdminFlagDetail` | admin |

---

## Error Handling

- Duplicate flag: `409 Conflict` → UI shows "Already reported ✓"
- Flag a question that doesn't exist: `404`
- Non-admin accessing admin flag routes: `403`
- Resolve a flag that is not `approved`: `400 Bad Request`

---

## Verification

1. **Flag submission:** During a quiz, answer a question, click "Report an issue", pick a category, submit → check `/flags/mine` shows the flag as Pending
2. **Duplicate prevention:** Try to flag the same question again → "Already reported ✓" shown
3. **Admin approve:** Go to `/admin/flags`, open the pending flag, approve it → status changes to Approved
4. **Admin dismiss:** Dismiss a flag → status shows Dismissed in user's My Reports with admin note
5. **Question edit:** On an approved flag, edit all fields and save → verify DB updated via a new quiz session showing the corrected question
6. **Resolve & award:** Click Resolve & Award → confirm dialog shows correct user count → confirm → check all flagging users received +1000 pts, daily_scores updated, badges awarded if thresholds met
7. **Badges:** Verify Question Spotter badge awarded after first resolution, Guardian at 3, Champion at 10
8. **My Reports page:** All status transitions visible with correct colours and admin notes
