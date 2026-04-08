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
  const color = remaining < 30 ? 'text-red-600' : remaining < 60 ? 'text-amber-600' : 'text-gray-700';

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">{t('timeLeft')}</span>
      <span className={`font-mono font-bold text-lg ${color}`}>{mins}:{secs}</span>
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${remaining < 30 ? 'bg-red-500' : 'bg-indigo-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
