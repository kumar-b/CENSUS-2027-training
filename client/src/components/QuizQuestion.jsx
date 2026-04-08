import { useTranslation } from 'react-i18next';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function QuizQuestion({ question, onAnswer, answered, result, currentIndex, total }) {
  const { i18n } = useTranslation();
  const isHi = i18n.language === 'hi';

  const text = isHi && question.question_hi ? question.question_hi : question.question_en;
  const options = isHi && question.options_hi
    ? JSON.parse(question.options_hi)
    : JSON.parse(question.options_en);
  const explanation = isHi && question.explanation_hi ? question.explanation_hi : question.explanation_en;

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

      {/* Question text */}
      <p className="text-gray-800 font-medium text-base leading-relaxed">{text}</p>

      {/* Options */}
      <div className="space-y-2">
        {options.map((opt, idx) => {
          let style = 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer';
          if (answered !== null) {
            if (idx === result?.correctOption) style = 'border-green-400 bg-green-50';
            else if (idx === answered && idx !== result?.correctOption) style = 'border-red-400 bg-red-50';
            else style = 'border-gray-200 bg-gray-50 opacity-60';
          }

          return (
            <button
              key={idx}
              disabled={answered !== null}
              onClick={() => onAnswer(idx)}
              className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${style}`}
            >
              <span className="font-semibold text-indigo-600 mr-2">{OPTION_LABELS[idx]}.</span>
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
    </div>
  );
}
