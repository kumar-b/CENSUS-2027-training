import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuizStore } from '../store/quizStore';
import QuizRunner from '../components/QuizRunner';
import { BookIcon } from '../components/Icons';

export default function PracticePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const chapter = location.state?.chapter;
  const { startSession, reset } = useQuizStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resumed, setResumed] = useState(false);

  useEffect(() => {
    if (!chapter) { navigate('/quiz'); return; }
    reset();
    startSession('practice', chapter)
      .then((data) => { setResumed(data.resumed || false); setLoading(false); })
      .catch((err) => { setError(err.response?.data?.error || t('error')); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20 font-bold" style={{ color: 'var(--tc-text-muted)' }}>{t('loading')}</div>
  );

  if (error) return (
    <div className="px-4 py-6 text-center space-y-4">
      <p className="font-bold" style={{ color: 'var(--tc-primary)' }}>{error}</p>
      <button onClick={() => navigate('/quiz')} className="font-black underline" style={{ color: 'var(--tc-primary)' }}>{t('back')}</button>
    </div>
  );

  return (
    <div>
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '2px solid var(--tc-border)' }}>
        <h2 className="font-black flex items-center gap-2" style={{ color: 'var(--tc-text)' }}>
          <BookIcon size={18} color="var(--tc-green)" /> {t('practice')} — {t('chapter')} {chapter}
        </h2>
        {resumed && (
          <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--tc-orange)' }}>Resuming previous session…</p>
        )}
      </div>
      <QuizRunner mode="practice" timerSeconds={null} />
    </div>
  );
}
