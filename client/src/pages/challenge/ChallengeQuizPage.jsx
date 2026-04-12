import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import { useQuizStore } from '../../store/quizStore';
import QuizRunner from '../../components/QuizRunner';

export default function ChallengeQuizPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { code } = useParams();
  const { loadSession, reset } = useQuizStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    reset();
    api.post(`/challenges/${code}/join`)
      .then(({ data }) => {
        if (data.completed) {
          setAlreadyDone(true);
          setLoading(false);
          return;
        }
        if (data.questions.length === 0) {
          // Resumed but all questions answered — treat as complete
          setAlreadyDone(true);
          setLoading(false);
          return;
        }
        loadSession(data.sessionId, data.questions);
        setLoading(false);
      })
      .catch((err) => {
        const msg = err.response?.data?.error || t('error');
        if (err.response?.status === 410) {
          setError(t('codeExpired'));
        } else if (err.response?.status === 404) {
          setError(t('codeNotFound'));
        } else {
          setError(msg);
        }
        setLoading(false);
      });
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleComplete = async () => {
    try {
      const sessionId = useQuizStore.getState().sessionId;
      await api.post(`/challenges/${code}/complete`, { sessionId });
    } catch {
      // Non-fatal — participant marking may fail but session is already completed
    }
    navigate(`/challenge/${code}/results`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 font-bold" style={{ color: 'var(--tc-text-muted)' }}>
        {t('loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-10 text-center space-y-4">
        <span className="text-4xl">😕</span>
        <p className="font-black text-base" style={{ color: 'var(--tc-text)' }}>{error}</p>
        <button
          onClick={() => navigate('/challenge')}
          className="btn-3d btn-primary"
        >
          {t('back')}
        </button>
      </div>
    );
  }

  if (alreadyDone) {
    return (
      <div className="px-4 py-10 text-center space-y-4">
        <span className="text-4xl">✅</span>
        <p className="font-black text-base" style={{ color: 'var(--tc-text)' }}>You already completed this challenge!</p>
        <button
          onClick={() => navigate(`/challenge/${code}/results`)}
          className="btn-3d"
          style={{ background: 'var(--tc-purple)', color: 'white', boxShadow: '0 4px 0 var(--tc-purple-dark)', border: '2px solid var(--tc-purple-dark)' }}
        >
          View Results →
        </button>
      </div>
    );
  }

  return <QuizRunner mode="challenge" onComplete={handleComplete} />;
}
