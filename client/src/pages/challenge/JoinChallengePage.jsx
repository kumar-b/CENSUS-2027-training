import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function JoinChallengePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { code: codeParam } = useParams();
  const [code, setCode] = useState(codeParam || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (codeParam) setCode(codeParam.toUpperCase());
  }, [codeParam]);

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 6) {
      setError('Please enter a valid 6-character code');
      return;
    }
    navigate(`/challenge/${trimmed}/quiz`);
  };

  return (
    <div className="px-4 py-6 space-y-5">
      <div className="text-center">
        <span className="text-4xl">🔑</span>
        <p className="font-black text-lg mt-2" style={{ color: 'var(--tc-text)' }}>{t('joinChallenge')}</p>
        <p className="text-sm font-semibold mt-1" style={{ color: 'var(--tc-text-sec)' }}>
          {t('enterCode')}
        </p>
      </div>

      <div>
        <input
          type="text"
          value={code}
          onChange={(e) => {
            setError('');
            setCode(e.target.value.toUpperCase().slice(0, 6));
          }}
          placeholder="e.g. A1B2C3"
          maxLength={6}
          className="fancy-input text-center text-2xl tracking-widest font-black"
          style={{ fontFamily: 'monospace', letterSpacing: '0.3em' }}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
        />
      </div>

      {error && (
        <p className="text-sm font-bold text-center" style={{ color: '#C1440E' }}>{error}</p>
      )}

      <button
        onClick={handleJoin}
        disabled={code.trim().length !== 6}
        className="btn-3d"
        style={{ background: 'var(--tc-purple)', color: 'white', boxShadow: '0 4px 0 var(--tc-purple-dark)', border: '2px solid var(--tc-purple-dark)' }}
      >
        {t('joinChallenge')} →
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
