import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

function StatCell({ label, value }) {
  return (
    <div className="text-center">
      <p className="font-black text-xl" style={{ color: 'var(--tc-text)' }}>{value ?? '—'}</p>
      <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--tc-text-sec)' }}>{label}</p>
    </div>
  );
}

export default function ChallengeResultsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { code } = useParams();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/challenges/${code}/results`)
      .then(({ data }) => { setResults(data); setLoading(false); })
      .catch((err) => {
        setError(err.response?.data?.error || t('error'));
        setLoading(false);
      });
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 font-bold" style={{ color: 'var(--tc-text-muted)' }}>
        {t('loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-10 text-center space-y-4">
        <span className="text-4xl">😕</span>
        <p className="font-black text-base" style={{ color: 'var(--tc-text)' }}>{error}</p>
        <button onClick={() => navigate('/')} className="btn-3d btn-primary">{t('goHome')}</button>
      </div>
    );
  }

  const me = results?.participants?.find(p => p.isYou);
  const others = results?.participants?.filter(p => !p.isYou) || [];
  const opponent = others[0];
  const allCompleted = results?.allCompleted;

  // Determine winner
  let banner = null;
  if (allCompleted && me && opponent) {
    if (me.score > (opponent.score || 0)) banner = { text: t('youWon'), emoji: '🏆', color: '#D4843A' };
    else if ((opponent.score || 0) > me.score) banner = { text: t('opponentWon'), emoji: '😤', color: '#7C3AED' };
    else banner = { text: t('itsATie'), emoji: '🤝', color: '#2D6A4F' };
  }

  return (
    <div className="px-4 py-6 space-y-5">
      <p className="font-black text-lg" style={{ color: 'var(--tc-text)' }}>{t('challengeResults')}</p>

      {/* Winner banner */}
      {banner && (
        <div className="rounded-2xl py-4 text-center"
          style={{ background: '#FFF8E7', border: `2.5px solid ${banner.color}` }}>
          <p className="text-3xl">{banner.emoji}</p>
          <p className="font-black text-base mt-1" style={{ color: banner.color }}>{banner.text}</p>
        </div>
      )}

      {/* Waiting banner */}
      {!allCompleted && (
        <div className="rounded-2xl py-4 text-center"
          style={{ background: '#EDE9FE', border: '2px solid var(--tc-purple)' }}>
          <p className="text-2xl">⏳</p>
          <p className="font-bold text-sm mt-1" style={{ color: 'var(--tc-purple-dark)' }}>{t('waitingForOpponent')}</p>
        </div>
      )}

      {/* Side-by-side comparison */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: '2.5px solid var(--tc-border)', boxShadow: '0 4px 0 var(--tc-border)' }}>

        {/* Headers */}
        <div className="grid grid-cols-3 divide-x"
          style={{ background: 'var(--tc-surface)', borderBottom: '2px solid var(--tc-border)' }}>
          <div className="p-3 text-center">
            <p className="font-black text-sm" style={{ color: 'var(--tc-purple)' }}>You</p>
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--tc-text-sec)' }}>{me?.name}</p>
          </div>
          <div className="p-3 text-center flex items-center justify-center">
            <span className="font-black text-xs" style={{ color: 'var(--tc-text-muted)' }}>{t('vs')}</span>
          </div>
          <div className="p-3 text-center">
            <p className="font-black text-sm" style={{ color: 'var(--tc-text)' }}>{opponent ? 'Opponent' : '?'}</p>
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--tc-text-sec)' }}>{opponent?.name || '—'}</p>
          </div>
        </div>

        {/* Stats rows */}
        {[
          { label: t('yourScore'), myVal: me?.score ?? 0, oppVal: opponent?.score ?? (allCompleted ? 0 : '?') },
          { label: t('correctAnswers'), myVal: `${me?.correct_count ?? 0}/${me?.total_questions ?? results?.questionCount}`, oppVal: opponent?.completed_at ? `${opponent.correct_count ?? 0}/${opponent.total_questions ?? results?.questionCount}` : '?' },
          { label: t('maxStreak'), myVal: me?.streak_max ?? 0, oppVal: opponent?.completed_at ? (opponent.streak_max ?? 0) : '?' },
        ].map((row) => (
          <div key={row.label} className="grid grid-cols-3 divide-x"
            style={{ borderBottom: '1.5px solid var(--tc-border)' }}>
            <div className="p-3 text-center">
              <p className="font-black text-lg" style={{ color: 'var(--tc-text)' }}>{row.myVal}</p>
            </div>
            <div className="p-3 flex items-center justify-center">
              <p className="text-xs font-bold text-center" style={{ color: 'var(--tc-text-sec)' }}>{row.label}</p>
            </div>
            <div className="p-3 text-center">
              <p className="font-black text-lg" style={{ color: 'var(--tc-text)' }}>{row.oppVal}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Share result */}
      {allCompleted && banner && (
        <button
          onClick={() => {
            const text = `I ${banner.text === t('youWon') ? 'won' : banner.text === t('itsATie') ? 'tied' : 'lost'} a Census 2027 quiz challenge! My score: ${me?.score ?? 0} pts. Challenge your friends with code ${code} in the app!`;
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
          }}
          className="w-full py-3 rounded-xl font-black text-sm"
          style={{ background: '#25D366', color: 'white', border: '2px solid #1da851' }}
        >
          {t('shareOnWhatsApp')}
        </button>
      )}

      <button
        onClick={() => navigate('/')}
        className="btn-3d btn-primary"
      >
        {t('goHome')}
      </button>
    </div>
  );
}
