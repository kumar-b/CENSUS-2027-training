import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function QuizTimer({ totalSeconds, onExpire }) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    if (remaining <= 0) { onExpire(); return; }
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [remaining, onExpire]);

  const mins = String(Math.floor(remaining / 60)).padStart(2, '0');
  const secs = String(remaining % 60).padStart(2, '0');
  const pct = (remaining / totalSeconds) * 100;
  const urgent = remaining < 30;
  const warning = remaining < 60;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold" style={{ color: 'var(--tc-text-muted)' }}>{t('timeLeft')}</span>
      <span className="font-mono font-black text-lg"
        style={{ color: urgent ? '#C1440E' : warning ? '#D4843A' : 'var(--tc-text)' }}>
        {mins}:{secs}
      </span>
      <div className="w-16 rounded-full overflow-hidden" style={{ height: '6px', background: 'var(--tc-surface)', border: '1.5px solid var(--tc-border)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: urgent ? '#C1440E' : 'var(--tc-primary)' }}
        />
      </div>
    </div>
  );
}
