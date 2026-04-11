import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ClockIcon, BookIcon } from '../components/Icons';

const CHAPTERS = [
  { id: 1, en: 'Introduction', hi: 'परिचय' },
  { id: 2, en: 'Roles and Responsibilities of Enumerators and Supervisors', hi: 'प्रगणकों और पर्यवेक्षकों की भूमिकाएं और जिम्मेदारियां' },
  { id: 3, en: 'Legal Provisions and the Rights of Enumerators and Supervisors', hi: 'प्रगणकों और पर्यवेक्षकों के कानूनी प्रावधान और अधिकार' },
  { id: 4, en: 'Numbering of Buildings, Census Houses and Preparation of Layout Map', hi: 'भवनों, जनगणना मकानों की संख्या और लेआउट मैप की तैयारी' },
  { id: 5, en: 'Filling up of the Houselisting and Housing Census Questions', hi: 'मकान सूचीकरण और आवास जनगणना प्रश्नों को भरना' },
  { id: 6, en: 'Self-Enumeration (SE)', hi: 'स्व-प्रगणना (SE)' },
];

export default function QuizSelectorPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isHi = i18n.language === 'hi';

  return (
    <div className="px-4 py-5">
      <h2 className="text-xl font-black mb-1" style={{ color: 'var(--tc-text)' }}>{t('selectChapter')}</h2>
      <p className="text-sm font-bold mb-5" style={{ color: 'var(--tc-text-muted)' }}>Choose a chapter for Timed or Practice mode</p>

      <div className="space-y-3">
        {CHAPTERS.map((ch) => (
          <div key={ch.id} className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--tc-card)', border: '2px solid var(--tc-border)', boxShadow: '0 4px 0 var(--tc-border)' }}>
            <div className="p-4">
              <p className="font-black text-sm mb-3" style={{ color: 'var(--tc-text)' }}>
                {t('chapter')} {ch.id}: {isHi ? ch.hi : ch.en}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/quiz/timed', { state: { chapter: ch.id } })}
                  className="flex-1 rounded-xl py-2 text-sm font-black"
                  style={{ background: 'var(--tc-primary-light)', color: 'var(--tc-primary-dark)', border: '2px solid var(--tc-primary)', boxShadow: '0 3px 0 var(--tc-primary-dark)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <ClockIcon size={14} color="var(--tc-primary-dark)" /> {t('timedQuiz')}
                </button>
                <button
                  onClick={() => navigate('/quiz/practice', { state: { chapter: ch.id } })}
                  className="flex-1 rounded-xl py-2 text-sm font-black"
                  style={{ background: '#E8F5EE', color: '#1B4332', border: '2px solid #2D6A4F', boxShadow: '0 3px 0 #1B4332', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <BookIcon size={14} color="#1B4332" /> {t('practice')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
