import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UsersIcon } from '../../components/Icons';

export default function ChallengeLandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Header */}
      <div className="rounded-2xl p-5 text-center"
        style={{ background: 'linear-gradient(135deg, var(--tc-purple) 0%, #9F67FA 100%)', boxShadow: '0 5px 0 var(--tc-purple-dark)' }}>
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)' }}>
            <UsersIcon size={28} color="white" />
          </div>
        </div>
        <p className="font-black text-xl" style={{ color: '#fff' }}>{t('challengeFriend')}</p>
        <p className="text-sm font-semibold mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>{t('challengeFriendDesc')}</p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => navigate('/challenge/create')}
          className="w-full text-left rounded-2xl overflow-hidden transition-all"
          style={{ background: 'var(--tc-card)', border: '2.5px solid var(--tc-purple)', boxShadow: '0 4px 0 var(--tc-purple-dark)' }}
        >
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="font-black text-sm" style={{ color: 'var(--tc-text)' }}>{t('createChallenge')}</p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--tc-text-sec)' }}>
                Pick questions · Share a code · Compare scores
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/challenge/join')}
          className="w-full text-left rounded-2xl overflow-hidden transition-all"
          style={{ background: 'var(--tc-card)', border: '2.5px solid var(--tc-border)', boxShadow: '0 4px 0 var(--tc-border)' }}
        >
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="text-2xl">🔑</span>
            <div>
              <p className="font-black text-sm" style={{ color: 'var(--tc-text)' }}>{t('joinChallenge')}</p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--tc-text-sec)' }}>
                Enter a code from a friend
              </p>
            </div>
          </div>
        </button>
      </div>

      <button
        onClick={() => navigate('/')}
        className="w-full py-2 text-sm font-bold"
        style={{ color: 'var(--tc-text-muted)' }}
      >
        ← {t('back')}
      </button>
    </div>
  );
}
