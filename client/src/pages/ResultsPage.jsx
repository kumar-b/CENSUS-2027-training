import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TrophyIcon, TargetIcon, BookIcon, GiftIcon, ChevronUpIcon, ChevronDownIcon, CheckIcon, XIcon } from '../components/Icons';
import BadgeIcon from '../components/BadgeIcon';

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
    <div className="flex items-center gap-3 rounded-xl px-4 py-3"
      style={{ background: '#FFFDE7', border: '2px solid #C9970A', boxShadow: '0 3px 0 #AA6520' }}>
      <BadgeIcon icon={badge.icon} size={32} color="var(--tc-xp-dark)" />
      <div>
        <p className="font-bold text-sm" style={{ color: 'var(--tc-text)' }}>{badge.name_en}</p>
        <p className="text-xs font-semibold" style={{ color: 'var(--tc-text-sec)' }}>{badge.description_en}</p>
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
          <div key={q.id} className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--tc-card)', border: '2px solid var(--tc-border)' }}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-sm leading-relaxed flex-1" style={{ color: 'var(--tc-text)' }}>
                <span className="font-black mr-1" style={{ color: 'var(--tc-text-muted)' }}>Q{qIdx + 1}.</span>{text}
              </p>
              <span className="flex-shrink-0 p-1 rounded-full"
                style={result?.isCorrect ? { background: '#E8F5EE' } : { background: '#FAE0D3' }}>
                {result?.isCorrect
                  ? <CheckIcon size={14} color="#1B4332" />
                  : <XIcon size={14} color="#9A3409" />}
              </span>
            </div>

            <div className="space-y-1.5">
              {shuffled.map(({ v: opt, i: origIdx }, displayIdx) => {
                const isCorrect = origIdx === result?.correctOption;
                const isChosen = origIdx === chosenOption;
                let optStyle = { background: 'var(--tc-surface)', border: '1.5px solid var(--tc-border)', color: 'var(--tc-text-muted)' };
                if (isCorrect) optStyle = { background: '#E8F5EE', border: '1.5px solid #2D6A4F', color: '#1B4332' };
                else if (isChosen && !isCorrect) optStyle = { background: '#FAE0D3', border: '1.5px solid #C1440E', color: '#9A3409' };

                return (
                  <div key={origIdx} className="rounded-lg px-3 py-2 text-xs flex items-center gap-2" style={optStyle}>
                    <span className="font-black w-4 flex-shrink-0">{OPTION_LABELS[displayIdx]}.</span>
                    <span className="flex-1 font-semibold">{opt}</span>
                    {isCorrect && <CheckIcon size={12} color="#1B4332" />}
                    {isChosen && !isCorrect && <XIcon size={12} color="#9A3409" />}
                  </div>
                );
              })}
            </div>

            {explanation && (
              <div className="rounded-lg px-3 py-2 text-xs font-semibold"
                style={result?.isCorrect
                  ? { background: '#E8F5EE', color: '#1B4332' }
                  : { background: '#FFF0D0', color: '#AA6520' }
                }>
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
    <div className="pb-6">
      {/* Header */}
      <div className="text-center px-4 pt-6 pb-5" style={{ background: 'linear-gradient(135deg, var(--tc-primary) 0%, var(--tc-orange) 100%)' }}>
        <div className="flex justify-center mb-2">
          {pct >= 80 ? <TrophyIcon size={44} color="#fff" sw={1.5} /> : pct >= 50 ? <TargetIcon size={44} color="#fff" sw={1.5} /> : <BookIcon size={44} color="#fff" sw={1.5} />}
        </div>
        <h2 className="text-2xl font-black" style={{ color: '#fff' }}>{t('quizComplete')}</h2>
        <p className="text-sm font-bold mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {pct >= 80 ? 'Excellent work!' : pct >= 50 ? 'Good effort!' : 'Keep practicing!'}
        </p>
      </div>

      <div className="px-4 space-y-5 mt-5">
        {/* Score card */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: totalPoints, label: t('yourScore'), color: 'var(--tc-primary)' },
            { value: `${correctCount}/${totalQuestions}`, label: t('correctAnswers'), color: 'var(--tc-green)' },
            { value: streakMax, label: t('maxStreak'), color: 'var(--tc-orange)' },
            { value: `${pct}%`, label: 'Accuracy', color: 'var(--tc-xp-dark)' },
          ].map(({ value, label, color }) => (
            <div key={label} className="text-center rounded-2xl p-4"
              style={{ background: 'var(--tc-card)', border: '2px solid var(--tc-border)', boxShadow: '0 4px 0 var(--tc-border)' }}>
              <p className="text-3xl font-black" style={{ color }}>{value}</p>
              <p className="text-xs font-bold mt-1" style={{ color: 'var(--tc-text-sec)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* New badges */}
        {newBadges.length > 0 && (
          <div className="space-y-2">
            <p className="sec-label flex items-center gap-1"><GiftIcon size={13} color="var(--tc-text-sec)" /> {t('newBadges')}</p>
            {newBadges.map((b) => <BadgeCard key={b.id} badge={b} />)}
          </div>
        )}

        {/* Answer review toggle */}
        {questions.length > 0 && (
          <div>
            <button
              onClick={() => setShowReview(!showReview)}
              className="w-full rounded-xl py-3 font-black text-sm"
              style={{ background: 'var(--tc-surface)', border: '2px solid var(--tc-border)', color: 'var(--tc-text-sec)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              {showReview ? <ChevronUpIcon size={16} color="var(--tc-text-sec)" /> : <ChevronDownIcon size={16} color="var(--tc-text-sec)" />} {t('reviewAnswers')}
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
            className="btn-3d btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <TrophyIcon size={18} color="#fff" /> {t('viewLeaderboard')}
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-3d btn-ghost"
          >
            {t('goHome')}
          </button>
        </div>
      </div>
    </div>
  );
}
