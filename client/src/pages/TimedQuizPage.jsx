import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuizStore } from '../store/quizStore';
import QuizRunner from '../components/QuizRunner';

export default function TimedQuizPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const chapter = location.state?.chapter;
  const { startSession, reset } = useQuizStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!chapter) { navigate('/quiz'); return; }
    reset();
    startSession('timed', chapter)
      .then(() => setLoading(false))
      .catch((err) => { setError(err.response?.data?.error || t('error')); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">{t('loading')}</div>;

  if (error) return (
    <div className="px-4 py-6 text-center space-y-4">
      <p className="text-red-500">{error}</p>
      <button onClick={() => navigate('/quiz')} className="text-indigo-600 underline">{t('back')}</button>
    </div>
  );

  return (
    <div>
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <h2 className="font-bold text-gray-800">⏱ {t('timedQuiz')} — {t('chapter')} {chapter}</h2>
        <p className="text-xs text-gray-400">10 questions · 10 min total</p>
      </div>
      <QuizRunner mode="timed" timerSeconds={600} />
    </div>
  );
}
