import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// Deterministic Fisher-Yates shuffle seeded by question.id (mirrors QuizQuestion.jsx)
function seededShuffle(arr, seed) {
  const items = arr.map((v, i) => ({ v, i }));
  let s = seed | 0;
  for (let i = items.length - 1; i > 0; i--) {
    s = Math.imul(s, 1664525) + 1013904223 | 0;
    const j = Math.abs(s) % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function BadgeCard({ badge }) {
  return (
    <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
      <span className="text-3xl">{badge.icon}</span>
      <div>
        <p className="font-semibold text-gray-800 text-sm">{badge.name_en}</p>
        <p className="text-xs text-gray-500">{badge.description_en}</p>
      </div>
    </div>
  );
}

function AnswerReview({ questions, answers }) {
  const { i18n } = useTranslation();
  const isHi = i18n.language === 'hi';

  return (
    <div className="space-y-4">
      {questions.map((q, qIdx) => {
        const ans = answers[qIdx];
        if (!ans) return null;
        const { chosenOption, result } = ans;
        const text = isHi && q.question_hi ? q.question_hi : q.question_en;
        const options = isHi && q.options_hi ? JSON.parse(q.options_hi) : JSON.parse(q.options_en);
        const explanation = isHi && q.explanation_hi ? q.explanation_hi : q.explanation_en;
        const shuffled = seededShuffle(options, q.id);

        return (
          <div key={q.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-gray-800 font-medium text-sm leading-relaxed flex-1">
                <span className="text-gray-400 mr-1">Q{qIdx + 1}.</span>{text}
              </p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${result?.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {result?.isCorrect ? '✓' : '✗'}
              </span>
            </div>

            <div className="space-y-1.5">
              {shuffled.map(({ v: opt, i: origIdx }, displayIdx) => {
                const isCorrect = origIdx === result?.correctOption;
                const isChosen = origIdx === chosenOption;
                let style = 'border-gray-100 bg-gray-50 text-gray-500';
                if (isCorrect) style = 'border-green-300 bg-green-50 text-green-800';
                else if (isChosen && !isCorrect) style = 'border-red-300 bg-red-50 text-red-800';

                return (
                  <div key={origIdx} className={`rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${style}`}>
                    <span className="font-semibold w-4 flex-shrink-0">{OPTION_LABELS[displayIdx]}.</span>
                    <span className="flex-1">{opt}</span>
                    {isCorrect && <span className="flex-shrink-0">✓</span>}
                    {isChosen && !isCorrect && <span className="flex-shrink-0">✗</span>}
                  </div>
                );
              })}
            </div>

            {explanation && (
              <div className={`rounded-lg px-3 py-2 text-xs ${result?.isCorrect ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                {explanation}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ResultsPage() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [showReview, setShowReview] = useState(false);

  const result = state?.result;
  const questions = state?.questions || [];
  const answers = state?.answers || [];

  if (!result) {
    navigate('/');
    return null;
  }

  const { totalPoints, correctCount, totalQuestions, streakMax, newBadges = [] } = result;
  const pct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-2">{pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '📚'}</div>
        <h2 className="text-2xl font-bold text-gray-800">{t('quizComplete')}</h2>
      </div>

      {/* Score card */}
      <div className="bg-indigo-50 rounded-2xl p-5 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-3xl font-bold text-indigo-600">{totalPoints}</p>
          <p className="text-xs text-gray-500">{t('yourScore')}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-green-600">{correctCount}/{totalQuestions}</p>
          <p className="text-xs text-gray-500">{t('correctAnswers')}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-orange-500">{streakMax}</p>
          <p className="text-xs text-gray-500">{t('maxStreak')}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-700">{pct}%</p>
          <p className="text-xs text-gray-500">Accuracy</p>
        </div>
      </div>

      {/* New badges */}
      {newBadges.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700">🎉 {t('newBadges')}</h3>
          {newBadges.map((b) => <BadgeCard key={b.id} badge={b} />)}
        </div>
      )}

      {/* Answer review toggle */}
      {questions.length > 0 && (
        <div>
          <button
            onClick={() => setShowReview(!showReview)}
            className="w-full bg-gray-50 border border-gray-200 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-100 transition-colors text-sm"
          >
            {showReview ? '▲' : '▼'} {t('reviewAnswers')}
          </button>
          {showReview && (
            <div className="mt-4">
              <AnswerReview questions={questions} answers={answers} />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => navigate('/leaderboard')}
          className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 transition-colors"
        >
          {t('viewLeaderboard')}
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-50 transition-colors"
        >
          {t('goHome')}
        </button>
      </div>
    </div>
  );
}
