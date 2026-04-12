import { describe, it, expect } from 'vitest';
import { getLevelInfo } from './levels';

// Cumulative XP to reach level N: 50 * (N-1) * N
const cumXP = (n) => 50 * (n - 1) * n;

describe('getLevelInfo', () => {
  // ── Boundary: Level 1 ────────────────────────────────────────────────────
  it('returns level 1 at 0 XP', () => {
    const { level, xpIntoLevel, xpForNext } = getLevelInfo(0);
    expect(level).toBe(1);
    expect(xpIntoLevel).toBe(0);
    expect(xpForNext).toBe(100);
  });

  it('handles null / undefined gracefully (treats as 0)', () => {
    expect(getLevelInfo(null).level).toBe(1);
    expect(getLevelInfo(undefined).level).toBe(1);
  });

  it('handles negative values gracefully (clamps to 0)', () => {
    const { level, xpIntoLevel } = getLevelInfo(-500);
    expect(level).toBe(1);
    expect(xpIntoLevel).toBe(0);
  });

  // ── Progress within Level 1 ──────────────────────────────────────────────
  it('stays at level 1 with 99 XP', () => {
    const { level, xpIntoLevel, xpForNext } = getLevelInfo(99);
    expect(level).toBe(1);
    expect(xpIntoLevel).toBe(99);
    expect(xpForNext).toBe(100);
  });

  // ── Level-up transitions ─────────────────────────────────────────────────
  it('advances to level 2 at exactly 100 XP', () => {
    // cumXP(2) = 50 * 1 * 2 = 100
    const { level, xpIntoLevel, xpForNext } = getLevelInfo(100);
    expect(level).toBe(2);
    expect(xpIntoLevel).toBe(0);
    expect(xpForNext).toBe(200);
  });

  it('stays at level 2 one XP below threshold', () => {
    // cumXP(3) = 50 * 2 * 3 = 300  →  L2 ends at 299
    const { level, xpIntoLevel } = getLevelInfo(299);
    expect(level).toBe(2);
    expect(xpIntoLevel).toBe(199);
  });

  it('advances to level 3 at exactly 300 XP', () => {
    // cumXP(3) = 50 * 2 * 3 = 300
    const { level, xpIntoLevel, xpForNext } = getLevelInfo(300);
    expect(level).toBe(3);
    expect(xpIntoLevel).toBe(0);
    expect(xpForNext).toBe(300);
  });

  // ── Mid-game milestone: Level 10 ─────────────────────────────────────────
  it('reaches level 10 at 4,500 XP', () => {
    // cumXP(10) = 50 * 9 * 10 = 4500
    const { level, xpIntoLevel, xpForNext } = getLevelInfo(4500);
    expect(level).toBe(10);
    expect(xpIntoLevel).toBe(0);
    expect(xpForNext).toBe(1000);
  });

  it('is still level 9 at 4,499 XP', () => {
    // cumXP(9) = 50 * 8 * 9 = 3600  →  L9 spans 3600–4499
    const { level, xpIntoLevel, xpForNext } = getLevelInfo(4499);
    expect(level).toBe(9);
    expect(xpIntoLevel).toBe(4499 - cumXP(9));
    expect(xpForNext).toBe(900);
  });

  // ── Spot-check level formula for several known thresholds ────────────────
  it.each([
    [2,  100],
    [5,  1000],
    [10, 4500],
    [20, 19000],
    [30, 43500],
    [50, 122500],
    [70, 241500],
    [100, 495000],
  ])('reaches level %i at cumXP %i', (expectedLevel, xp) => {
    expect(getLevelInfo(xp).level).toBe(expectedLevel);
    expect(getLevelInfo(xp).xpIntoLevel).toBe(0);
  });

  it.each([
    [1,  99],
    [4,  999],
    [9,  4499],
    [19, 18999],
    [29, 43499],
    [49, 122499],
  ])('stays at level %i one XP before the threshold', (expectedLevel, xp) => {
    expect(getLevelInfo(xp).level).toBe(expectedLevel);
  });

  // ── xpForNext matches 100 × level ───────────────────────────────────────
  it.each([1, 5, 10, 50, 99])('xpForNext equals 100 × level for level %i', (lvl) => {
    const xp = cumXP(lvl);       // put user exactly at this level
    const { xpForNext } = getLevelInfo(xp);
    expect(xpForNext).toBe(100 * lvl);
  });

  // ── xpIntoLevel is consistent ────────────────────────────────────────────
  it('xpIntoLevel reflects points earned within the current level', () => {
    // Level 5 starts at cumXP(5) = 1000; adding 250 XP into level 5
    const pts = cumXP(5) + 250;
    const { level, xpIntoLevel } = getLevelInfo(pts);
    expect(level).toBe(5);
    expect(xpIntoLevel).toBe(250);
  });

  // ── Max level (100) ──────────────────────────────────────────────────────
  it('reaches level 100 at exactly 495,000 XP', () => {
    // cumXP(100) = 50 * 99 * 100 = 495000
    const { level, xpIntoLevel } = getLevelInfo(495000);
    expect(level).toBe(100);
    expect(xpIntoLevel).toBe(0);
  });

  it('caps at level 100 for XP well beyond the max', () => {
    const { level } = getLevelInfo(1_000_000);
    expect(level).toBe(100);
  });

  it('xpForNext at max level equals 10,000 (100 × 100)', () => {
    // xpForNext is still returned but the bar should treat level 100 as max
    const { level, xpForNext } = getLevelInfo(495000);
    expect(level).toBe(100);
    expect(xpForNext).toBe(10000);
  });

  // ── Float-safety: just-below each threshold ──────────────────────────────
  it('does not prematurely advance level due to float rounding', () => {
    // 1 XP below L5 threshold (1000)
    const { level } = getLevelInfo(999);
    expect(level).toBe(4);
  });
});
