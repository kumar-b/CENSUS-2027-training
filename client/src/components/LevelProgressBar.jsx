import { useTranslation } from 'react-i18next';
import { getLevelInfo } from '../utils/levels';

/**
 * LevelProgressBar
 *
 * compact=false (default) — full card for Profile page (white background):
 *   "Level 12 Progress"              "9,490 / 9,750 XP"
 *   [████████████░░░░░░░░]
 *   "260 XP to Level 13! Keep going 🚀"
 *   XP values are absolute (totalPoints / cumulative XP needed to reach next level)
 *
 * compact=true — slim strip for Home greeting banner (white-on-transparent):
 *   Lv.12  [████████░░░░]  9,490 / 9,750 XP
 */
export default function LevelProgressBar({ totalPoints, compact = false }) {
  const { t } = useTranslation();
  const pts = Math.max(0, totalPoints || 0);
  const { level, xpIntoLevel, xpForNext } = getLevelInfo(pts);
  const isMax = level >= 100;
  const pct = isMax ? 100 : Math.min(100, (xpIntoLevel / xpForNext) * 100);

  // Absolute XP values: current total pts → cumulative XP needed to reach next level
  const xpAtLevel      = 50 * (level - 1) * level;   // cumXP at start of this level
  const xpNeededForNext = xpAtLevel + xpForNext;       // cumXP to reach level+1
  const xpLeft         = xpNeededForNext - pts;

  if (compact) {
    return (
      <div className="flex items-center gap-2 w-full">
        {/* Level badge */}
        <span
          className="text-xs font-black flex-shrink-0 px-1.5 py-0.5 rounded-md"
          style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', minWidth: '40px', textAlign: 'center' }}
        >
          Lv.{level}
        </span>

        {/* Bar */}
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.25)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: isMax
                ? 'linear-gradient(90deg, #FFD700, #FFA500)'
                : 'linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
            }}
          />
        </div>

        {/* Absolute XP label */}
        <span className="font-bold flex-shrink-0" style={{ color: 'rgba(255,255,255,0.85)', fontSize: '10px' }}>
          {isMax ? 'MAX' : `${pts.toLocaleString()} / ${xpNeededForNext.toLocaleString()}`}
        </span>
      </div>
    );
  }

  // Full mode — rendered on white/card background, uses themed colors
  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-black" style={{ color: 'var(--tc-text)' }}>
          {t('levelProgress', { level })}
        </span>
        {!isMax && (
          <span className="text-xs font-bold" style={{ color: 'var(--tc-text-sec)' }}>
            {pts.toLocaleString()} / {xpNeededForNext.toLocaleString()} XP
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-4 rounded-full overflow-hidden" style={{ background: 'var(--tc-border)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: isMax
              ? 'linear-gradient(90deg, #FFD700, #FFA500)'
              : 'linear-gradient(90deg, var(--tc-primary), var(--tc-orange))',
          }}
        />
      </div>

      {/* Footer */}
      <p className="text-xs font-semibold mt-1.5" style={{ color: 'var(--tc-text-sec)' }}>
        {isMax
          ? t('maxLevel')
          : t('xpToNext', { xp: xpLeft.toLocaleString(), next: level + 1 })}
      </p>
    </div>
  );
}
