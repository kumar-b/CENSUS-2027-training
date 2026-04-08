import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const CHAPTERS = [
  { id: 1, en: 'Introduction to Census', hi: 'जनगणना का परिचय' },
  { id: 2, en: 'Houselisting & Housing Census', hi: 'मकान सूचीकरण और आवास जनगणना' },
  { id: 3, en: 'Population Enumeration', hi: 'जनसंख्या गणना' },
  { id: 4, en: 'NPR & SECC', hi: 'NPR और SECC' },
  { id: 5, en: 'Field Procedures & Ethics', hi: 'क्षेत्र प्रक्रियाएं और नैतिकता' },
  { id: 6, en: 'Digital Tools & eCensus', hi: 'डिजिटल टूल्स और eCensus' },
];

export default function QuizSelectorPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isHi = i18n.language === 'hi';

  return (
    <div className="px-4 py-6">
      <h2 className="text-xl font-bold text-gray-800 mb-1">{t('selectChapter')}</h2>
      <p className="text-sm text-gray-500 mb-6">Choose a chapter for Timed or Practice mode</p>

      <div className="space-y-3">
        {CHAPTERS.map((ch) => (
          <div key={ch.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="font-semibold text-gray-800 mb-3">
              {t('chapter')} {ch.id}: {isHi ? ch.hi : ch.en}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/quiz/timed', { state: { chapter: ch.id } })}
                className="flex-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg py-2 text-sm font-medium hover:bg-blue-100 transition-colors"
              >
                ⏱ {t('timedQuiz')}
              </button>
              <button
                onClick={() => navigate('/quiz/practice', { state: { chapter: ch.id } })}
                className="flex-1 bg-green-50 border border-green-200 text-green-700 rounded-lg py-2 text-sm font-medium hover:bg-green-100 transition-colors"
              >
                📖 {t('practice')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
