import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuizStore } from '../store/quizStore';
import QuizRunner from '../components/QuizRunner';
import { StarIcon } from '../components/Icons';

export default function DailyQuizPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startSession, reset } = useQuizStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    reset();
    startSession('daily', null)
      .then(() => setLoading(false))
      .catch((err) => {
        const msg = err.response?.data?.error || t('error');
        setError(msg);
        setLoading(false);
      });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20 font-bold" style={{ color: 'var(--tc-text-muted)' }}>{t('loading')}</div>
  );

  if (error) return (
    <div className="px-4 py-6 text-center space-y-4">
      <p className="font-bold" style={{ color: 'var(--tc-primary)' }}>{error}</p>
      <button onClick={() => navigate('/')} className="font-black underline" style={{ color: 'var(--tc-primary)' }}>{t('goHome')}</button>
    </div>
  );

  return (
    <div>
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '2px solid var(--tc-border)' }}>
        <h2 className="font-black flex items-center gap-2" style={{ color: 'var(--tc-text)' }}><StarIcon size={18} color="var(--tc-primary)" /> {t('dailyQuiz')}</h2>
        <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--tc-text-muted)' }}>10 questions · 60 sec each</p>
      </div>
      <QuizRunner mode="daily" timerSeconds={600} />
    </div>
  );
}
