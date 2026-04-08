import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuizStore } from '../store/quizStore';
import QuizRunner from '../components/QuizRunner';

export default function DailyQuizPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sessionId, startSession, reset } = useQuizStore();
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

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">{t('loading')}</div>;

  if (error) return (
    <div className="px-4 py-6 text-center space-y-4">
      <p className="text-red-500">{error}</p>
      <button onClick={() => navigate('/')} className="text-indigo-600 underline">{t('goHome')}</button>
    </div>
  );

  return (
    <div>
      <div className="px-4 pt-4 pb-2 border-b border-gray-100">
        <h2 className="font-bold text-gray-800">🌟 {t('dailyQuiz')}</h2>
        <p className="text-xs text-gray-400">10 questions · 60 sec each</p>
      </div>
      <QuizRunner mode="daily" timerSeconds={600} />
    </div>
  );
}
