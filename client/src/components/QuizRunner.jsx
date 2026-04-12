import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuizStore } from '../store/quizStore';
import QuizQuestion from './QuizQuestion';
import QuizTimer from './QuizTimer';
import { FlameIcon } from './Icons';

export default function QuizRunner({ mode, timerSeconds, onComplete }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { questions, currentIndex, answers, submitAnswer, completeSession, nextQuestion } = useQuizStore();

  const [answered, setAnswered] = useState(null);
  const [answerResult, setAnswerResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [streak, setStreak] = useState(0);
  const [timeExpired, setTimeExpired] = useState(false);
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState(new Set());

  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  const handleAnswer = async (optionIdx) => {
    if (answered !== null || submitting) return;
    setSubmitting(true);
    const res = await submitAnswer(question.id, optionIdx, null);
    setAnswered(optionIdx);
    setAnswerResult(res);
    setStreak(res.currentStreak);
    setSubmitting(false);
  };

  const handleNext = async () => {
    const wasLast = isLast;
    setAnswered(null);
    setAnswerResult(null);
    if (wasLast) {
      const res = await completeSession();
      if (onComplete) {
        onComplete(res, { questions, answers });
      } else {
        navigate('/results', { state: { result: res, questions, answers } });
      }
    } else {
      nextQuestion();
    }
  };

  const handleTimerExpire = useCallback(async () => {
    if (timeExpired) return;
    setTimeExpired(true);
    const res = await completeSession();
    if (onComplete) {
      onComplete(res, { questions, answers });
    } else {
      navigate('/results', { state: { result: res, questions, answers } });
    }
  }, [timeExpired, completeSession, navigate, onComplete, questions, answers]);

  const handleFlagged = (questionId) => {
    setFlaggedQuestionIds((prev) => new Set([...prev, questionId]));
  };

  if (!question) {
    return <div className="flex items-center justify-center py-20 font-bold" style={{ color: 'var(--tc-text-muted)' }}>{t('loading')}</div>;
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {streak >= 3 && (
            <span className="flex items-center gap-1 text-sm font-black px-3 py-1 rounded-full"
              style={{ background: '#FFF0D0', color: '#AA6520', border: '2px solid #D4843A' }}>
              <FlameIcon size={14} color="#D4843A" /> ×{streak}
            </span>
          )}
        </div>
        {timerSeconds && (
          <QuizTimer totalSeconds={timerSeconds} onExpire={handleTimerExpire} />
        )}
      </div>

      <QuizQuestion
        question={question}
        onAnswer={handleAnswer}
        answered={answered}
        result={answerResult}
        currentIndex={currentIndex}
        total={questions.length}
        flaggedQuestionIds={flaggedQuestionIds}
        onFlagged={handleFlagged}
      />

      {answered !== null && (
        <button
          onClick={handleNext}
          className="btn-3d btn-primary"
        >
          {isLast ? t('finish') : t('next') + ' →'}
        </button>
      )}
    </div>
  );
}
