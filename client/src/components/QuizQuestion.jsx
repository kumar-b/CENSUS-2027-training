import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

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
        onSuccess(); // treat duplicate as success
      } else {
        setError(err.response?.data?.error || t('error'));
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white rounded-t-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-gray-800">{t('flagQuestion')}</h3>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ key, labelKey }) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${category === key ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
        <textarea
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
          rows={3}
          placeholder={t('addNote')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {t('cancel')}
          </button>
          <button
            onClick={submit}
            disabled={!category || submitting}
            className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {submitting ? t('loading') : t('submitReport')}
          </button>
        </div>
      </div>
    </div>
  );
}

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

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Q {currentIndex + 1} / {total}</span>
        <span className="capitalize text-xs bg-gray-100 px-2 py-0.5 rounded-full">{question.difficulty}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((currentIndex) / total) * 100}%` }}
        />
      </div>

      <p className="text-gray-800 font-medium text-base leading-relaxed">{text}</p>

      <div className="space-y-2">
        {shuffled.map(({ v: opt, i: origIdx }, displayIdx) => {
          let style = 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer';
          if (answered !== null) {
            if (origIdx === result?.correctOption) style = 'border-green-400 bg-green-50';
            else if (displayIdx === answeredDisplayIdx && origIdx !== result?.correctOption) style = 'border-red-400 bg-red-50';
            else style = 'border-gray-200 bg-gray-50 opacity-60';
          }
          return (
            <button
              key={origIdx}
              disabled={answered !== null}
              onClick={() => onAnswer(origIdx)}
              className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${style}`}
            >
              <span className="font-semibold text-indigo-600 mr-2">{OPTION_LABELS[displayIdx]}.</span>
              {opt}
            </button>
          );
        })}
      </div>

      {/* Explanation after answering */}
      {answered !== null && explanation && (
        <div className={`rounded-xl p-3 text-sm ${result?.isCorrect ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          <span className="font-semibold">{result?.isCorrect ? '✓ Correct! ' : '✗ Incorrect. '}</span>
          {explanation}
          {result?.pointsEarned > 0 && (
            <span className="ml-2 font-bold text-indigo-600">+{result.pointsEarned} pts</span>
          )}
        </div>
      )}

      {/* Report button — only visible after answering */}
      {answered !== null && (
        <div className="text-center">
          {alreadyFlagged ? (
            <span className="text-xs text-gray-400">{t('alreadyReported')}</span>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="text-xs text-gray-400 hover:text-indigo-500 transition-colors underline underline-offset-2"
            >
              {t('reportIssue')}
            </button>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-4 py-2 rounded-full z-50 shadow-lg">
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
