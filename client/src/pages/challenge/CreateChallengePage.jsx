import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';
import ChallengeCodeDisplay from '../../components/ChallengeCodeDisplay';

const CHAPTERS = [
  { value: null, labelEn: 'All Chapters', labelHi: 'सभी अध्याय' },
  { value: 1, labelEn: 'Chapter 1 — Introduction', labelHi: 'अध्याय 1 — परिचय' },
  { value: 2, labelEn: 'Chapter 2 — Roles & Responsibilities', labelHi: 'अध्याय 2 — भूमिकाएं और जिम्मेदारियां' },
  { value: 3, labelEn: 'Chapter 3 — Legal Provisions', labelHi: 'अध्याय 3 — कानूनी प्रावधान' },
  { value: 4, labelEn: 'Chapter 4 — Building Numbering', labelHi: 'अध्याय 4 — भवन संख्यांकन' },
  { value: 5, labelEn: 'Chapter 5 — Houselisting Questions', labelHi: 'अध्याय 5 — मकान सूचीकरण प्रश्न' },
  { value: 6, labelEn: 'Chapter 6 — Self-Enumeration', labelHi: 'अध्याय 6 — स्व-गणना' },
];

const COUNTS = [5, 10, 15];

export default function CreateChallengePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [chapter, setChapter] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null); // { code, challengeId }
  const isHindi = i18n.language === 'hi';

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/challenges/create', { chapter, questionCount });
      setCreated(data);
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    } finally {
      setLoading(false);
    }
  };

  if (created) {
    return (
      <div className="px-4 py-6 space-y-5">
        <div className="text-center">
          <span className="text-4xl">🎯</span>
          <p className="font-black text-lg mt-2" style={{ color: 'var(--tc-text)' }}>Challenge Created!</p>
          <p className="text-sm font-semibold mt-1" style={{ color: 'var(--tc-text-sec)' }}>
            Share this code with your friend
          </p>
        </div>

        <ChallengeCodeDisplay code={created.code} />

        <button
          onClick={() => navigate(`/challenge/${created.code}/quiz`)}
          className="btn-3d"
          style={{ background: 'var(--tc-purple)', color: 'white', boxShadow: '0 4px 0 var(--tc-purple-dark)', border: '2px solid var(--tc-purple-dark)' }}
        >
          {t('startMyAttempt')} →
        </button>

        <button
          onClick={() => navigate('/challenge')}
          className="w-full py-2 text-sm font-bold"
          style={{ color: 'var(--tc-text-muted)' }}
        >
          ← Back to Challenges
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <p className="font-black text-lg" style={{ color: 'var(--tc-text)' }}>{t('createChallenge')}</p>

      {/* Chapter selector */}
      <div>
        <p className="sec-label mb-2">{t('chooseChapter')}</p>
        <div className="space-y-2">
          {CHAPTERS.map((c) => (
            <button
              key={c.value ?? 'all'}
              onClick={() => setChapter(c.value)}
              className="w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition-all"
              style={{
                background: chapter === c.value ? '#EDE9FE' : 'var(--tc-card)',
                color: chapter === c.value ? 'var(--tc-purple-dark)' : 'var(--tc-text)',
                border: chapter === c.value ? '2px solid var(--tc-purple)' : '2px solid var(--tc-border)',
              }}
            >
              {isHindi ? c.labelHi : c.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Question count */}
      <div>
        <p className="sec-label mb-2">{t('chooseDifficulty')}</p>
        <div className="flex gap-2">
          {COUNTS.map((n) => (
            <button
              key={n}
              onClick={() => setQuestionCount(n)}
              className="flex-1 py-3 rounded-xl font-black text-sm transition-all"
              style={{
                background: questionCount === n ? 'var(--tc-purple)' : 'var(--tc-card)',
                color: questionCount === n ? 'white' : 'var(--tc-text)',
                border: questionCount === n ? '2px solid var(--tc-purple-dark)' : '2px solid var(--tc-border)',
                boxShadow: questionCount === n ? '0 3px 0 var(--tc-purple-dark)' : '0 3px 0 var(--tc-border)',
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm font-bold text-center" style={{ color: '#C1440E' }}>{error}</p>
      )}

      <button
        onClick={handleCreate}
        disabled={loading}
        className="btn-3d"
        style={{ background: 'var(--tc-purple)', color: 'white', boxShadow: '0 4px 0 var(--tc-purple-dark)', border: '2px solid var(--tc-purple-dark)' }}
      >
        {loading ? t('loading') : t('createAndShare')}
      </button>

      <button
        onClick={() => navigate('/challenge')}
        className="w-full py-2 text-sm font-bold"
        style={{ color: 'var(--tc-text-muted)' }}
      >
        ← {t('back')}
      </button>
    </div>
  );
}
