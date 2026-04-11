import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { CheckIcon, XIcon } from './Icons';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

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

const CATEGORIES = [
  { key: 'wrong_answer', labelKey: 'wrongAnswer' },
  { key: 'unclear', labelKey: 'questionUnclear' },
  { key: 'translation', labelKey: 'translationError' },
  { key: 'other', labelKey: 'otherIssue' },
];

function FlagModal({ question, onClose, onSuccess }) {
  const { t } = useTranslation();
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!category) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post('/flags', { questionId: question.id, category, note });
      onSuccess();
    } catch (err) {
      if (err.response?.status === 409) {
        onSuccess();
      } else {
        setError(err.response?.data?.error || t('error'));
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(44,24,16,0.5)' }} onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-t-2xl p-5 pb-20 space-y-4"
        style={{ background: 'var(--tc-card)', border: '2px solid var(--tc-border)', borderBottom: 'none' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-black" style={{ color: 'var(--tc-text)' }}>{t('flagQuestion')}</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className="px-3 py-1.5 rounded-full text-sm font-bold transition-all"
              style={category === key
                ? { background: 'var(--tc-primary)', color: '#fff', border: '2px solid var(--tc-primary-dark)' }
                : { background: 'var(--tc-surface)', color: 'var(--tc-text-sec)', border: '2px solid var(--tc-border)' }
              }
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
        <textarea
          className="w-full rounded-xl px-3 py-2 text-sm resize-none outline-none"
          style={{ border: '2px solid var(--tc-border)', background: 'var(--tc-surface)', color: 'var(--tc-text)', fontFamily: 'Nunito, sans-serif' }}
          rows={3}
          placeholder={t('addNote')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <p className="text-xs font-bold" style={{ color: 'var(--tc-primary)' }}>{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold"
            style={{ border: '2px solid var(--tc-border)', color: 'var(--tc-text-sec)', background: 'transparent' }}
          >
            {t('cancel')}
          </button>
          <button
            onClick={submit}
            disabled={!category || submitting}
            className="flex-1 rounded-xl py-2.5 text-sm font-black disabled:opacity-50"
            style={{ background: 'var(--tc-primary)', color: '#fff', boxShadow: '0 3px 0 var(--tc-primary-dark)', border: '2px solid var(--tc-primary-dark)' }}
          >
            {submitting ? t('loading') : t('submitReport')}
          </button>
        </div>
      </div>
    </div>
  );
}

const DIFF_COLORS = {
  easy:   { bg: '#E8F5EE', text: '#1B4332', border: '#2D6A4F' },
  medium: { bg: '#FFF0D0', text: '#AA6520', border: '#D4843A' },
  hard:   { bg: '#FAE0D3', text: '#9A3409', border: '#C1440E' },
};

export default function QuizQuestion({ question, onAnswer, answered, result, currentIndex, total, flaggedQuestionIds, onFlagged }) {
  const { t, i18n } = useTranslation();
  const isHi = i18n.language === 'hi';
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');

  const text = isHi && question.question_hi ? question.question_hi : question.question_en;
  const options = isHi && question.options_hi
    ? JSON.parse(question.options_hi)
    : JSON.parse(question.options_en);
  const explanation = isHi && question.explanation_hi ? question.explanation_hi : question.explanation_en;

  const shuffled = seededShuffle(options, question.id);
  const answeredDisplayIdx = answered !== null
    ? shuffled.findIndex((item) => item.i === answered)
    : null;

  const alreadyFlagged = flaggedQuestionIds?.has(question.id);

  const handleFlagSuccess = () => {
    setShowModal(false);
    setToast(t('reportSubmitted'));
    onFlagged?.(question.id);
    setTimeout(() => setToast(''), 3000);
  };

  const diffColors = DIFF_COLORS[question.difficulty] || DIFF_COLORS.easy;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-black" style={{ color: 'var(--tc-text-sec)' }}>Q {currentIndex + 1} / {total}</span>
        <span className="text-xs font-black px-2.5 py-1 rounded-full"
          style={{ background: diffColors.bg, color: diffColors.text, border: `2px solid ${diffColors.border}` }}>
          {question.difficulty}
        </span>
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ background: 'var(--tc-surface)', height: '8px', border: '2px solid var(--tc-border)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${((currentIndex) / total) * 100}%`, background: 'var(--tc-primary)' }}
        />
      </div>

      <p className="font-bold text-base leading-relaxed" style={{ color: 'var(--tc-text)' }}>{text}</p>

      <div className="space-y-2">
        {shuffled.map(({ v: opt, i: origIdx }, displayIdx) => {
          let style = {
            background: 'var(--tc-card)',
            borderColor: 'var(--tc-border)',
            color: 'var(--tc-text)',
            boxShadow: '0 3px 0 var(--tc-border)',
            cursor: answered !== null ? 'default' : 'pointer',
            opacity: 1,
          };
          if (answered !== null) {
            if (origIdx === result?.correctOption) {
              style = { background: '#E8F5EE', borderColor: '#2D6A4F', color: '#1B4332', boxShadow: '0 3px 0 #1B4332', cursor: 'default', opacity: 1 };
            } else if (displayIdx === answeredDisplayIdx && origIdx !== result?.correctOption) {
              style = { background: '#FAE0D3', borderColor: '#C1440E', color: '#9A3409', boxShadow: '0 3px 0 #9A3409', cursor: 'default', opacity: 1 };
            } else {
              style = { ...style, opacity: 0.5, cursor: 'default' };
            }
          }
          return (
            <button
              key={origIdx}
              disabled={answered !== null}
              onClick={() => onAnswer(origIdx)}
              className="w-full text-left rounded-xl border-2 px-4 py-3 transition-all font-bold text-sm"
              style={style}
            >
              <span className="font-black mr-2" style={{ color: answered !== null ? 'inherit' : 'var(--tc-primary)' }}>
                {OPTION_LABELS[displayIdx]}.
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {answered !== null && explanation && (
        <div className="rounded-xl p-3 text-sm font-semibold"
          style={result?.isCorrect
            ? { background: '#E8F5EE', color: '#1B4332', border: '2px solid #2D6A4F' }
            : { background: '#FAE0D3', color: '#9A3409', border: '2px solid #C1440E' }
          }>
          <span className="inline-flex items-center gap-1 font-black mr-1">
            {result?.isCorrect ? <CheckIcon size={14} color="#1B4332" /> : <XIcon size={14} color="#9A3409" />}
            {result?.isCorrect ? 'Correct!' : 'Incorrect.'}
          </span>{' '}
          {explanation}
          {result?.pointsEarned > 0 && (
            <span className="ml-2 font-black" style={{ color: 'var(--tc-xp-dark)' }}>+{result.pointsEarned} pts</span>
          )}
        </div>
      )}

      {/* Report button */}
      {answered !== null && (
        <div className="text-center">
          {alreadyFlagged ? (
            <span className="text-xs font-bold" style={{ color: 'var(--tc-text-muted)' }}>{t('alreadyReported')}</span>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="text-xs font-bold underline underline-offset-2"
              style={{ color: 'var(--tc-text-muted)' }}
            >
              {t('reportIssue')}
            </button>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-2 rounded-full z-50 shadow-lg"
          style={{ background: 'var(--tc-text)', color: '#fff' }}>
          {toast}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <FlagModal
          question={question}
          onClose={() => setShowModal(false)}
          onSuccess={handleFlagSuccess}
        />
      )}
    </div>
  );
}
