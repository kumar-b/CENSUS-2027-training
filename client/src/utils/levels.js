/**
 * Level system — 100 levels total.
 *
 * XP needed to advance from level N to N+1: 100 × N
 * Cumulative XP to reach level N:           50 × (N-1) × N
 *
 * Milestones (at ~1,000 XP/day dedicated play):
 *   L10  →   4,500 XP  (~4 days)
 *   L30  →  43,500 XP  (~6 weeks)
 *   L50  → 122,500 XP  (~4 months)
 *   L100 → 495,000 XP  (aspirational cap)
 *
 * Returns { level, xpIntoLevel, xpForNext }
 *   level       — current level (1–100)
 *   xpIntoLevel — XP earned within the current level
 *   xpForNext   — XP required to complete the current level (reach next)
 *                 (undefined / ignored at level 100)
 */
export function getLevelInfo(totalPoints) {
  const pts = Math.max(0, totalPoints || 0);

  // O(1) solve: 50·L·(L-1) ≤ pts → L ≈ (1 + sqrt(1 + 8·pts/100)) / 2
  let level = Math.min(100, Math.floor((1 + Math.sqrt(1 + 8 * pts / 100)) / 2));
  // Nudge up for float rounding, stay ≤ 100
  while (level < 100 && 50 * level * (level + 1) <= pts) level++;

  const xpAtLevel   = 50 * (level - 1) * level;   // cumXP at start of this level
  const xpForNext   = 100 * level;                 // XP span of this level
  const xpIntoLevel = pts - xpAtLevel;

  return { level, xpIntoLevel, xpForNext };
}
