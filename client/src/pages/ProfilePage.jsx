import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import html2canvas from 'html2canvas';

const MODE_ICON = { daily: '🌟', timed: '⏱', practice: '📖' };

function CertificateCanvas({ user, canvasRef }) {
  return (
    <div
      ref={canvasRef}
      className="bg-white border-4 border-indigo-600 rounded-2xl p-8 text-center w-80 mx-auto"
      style={{ fontFamily: 'serif' }}
    >
      <p className="text-indigo-600 font-bold text-lg mb-1">जनगणना 2027</p>
      <p className="text-gray-500 text-xs mb-4">Census Training Platform</p>
      <div className="border-t border-b border-indigo-200 py-4 my-4">
        <p className="text-gray-600 text-sm">This is to certify that</p>
        <p className="text-xl font-bold text-gray-800 mt-1">{user.name}</p>
        <p className="text-gray-500 text-sm mt-1">{user.functionary_type}</p>
        <p className="text-gray-400 text-xs">{user.district}, {user.state}</p>
      </div>
      <p className="text-gray-600 text-sm">has earned</p>
      <p className="text-3xl font-bold text-indigo-600 my-1">{user.total_points}</p>
      <p className="text-gray-500 text-sm">training points</p>
      <p className="text-xs text-gray-300 mt-4">{new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [showCert, setShowCert] = useState(false);
  const [sharing, setSharing] = useState(false);
  const certRef = useRef(null);

  useEffect(() => {
    api.get('/user/me').then(({ data }) => setProfile(data)).catch(() => {});
  }, []);

  const generateCanvas = async () => {
    setSharing(true);
    setShowCert(true);
    await new Promise((r) => setTimeout(r, 100)); // wait for render
    const canvas = await html2canvas(certRef.current, { scale: 2 });
    setSharing(false);
    return canvas;
  };

  const downloadCert = async () => {
    const canvas = await generateCanvas();
    const a = document.createElement('a');
    a.download = `census2027-certificate-${user.name}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  const shareWhatsApp = async () => {
    const canvas = await generateCanvas();
    const blob = await new Promise((r) => canvas.toBlob(r));
    const file = new File([blob], 'certificate.png', { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: `I earned ${user.total_points} points on Census 2027 Training!` });
    } else {
      const text = encodeURIComponent(`I earned ${user.total_points} points on the Census 2027 Training Platform! 🏆`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    }
  };

  const shareUrl = encodeURIComponent(window.location.origin);
  const shareText = encodeURIComponent(`I earned ${user?.total_points} points on Census 2027 Training! 🏆`);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Profile card */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{user?.name}</h2>
            <p className="text-indigo-100 text-sm">{user?.functionary_type}</p>
            <p className="text-indigo-200 text-xs">{user?.district}, {user?.state}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{user?.total_points}</p>
            <p className="text-indigo-200 text-xs">{t('totalPoints')}</p>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('badges')}</h3>
        {profile?.badges?.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {profile.badges.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2 shadow-sm">
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{b.name_en}</p>
                  <p className="text-xs text-gray-400 leading-tight">{b.description_en}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">{t('noBadges')}</p>
        )}
      </div>

      {/* Certificate */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('certificate')}</h3>
        <button
          onClick={() => setShowCert(!showCert)}
          className="w-full bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl py-2.5 font-medium text-sm hover:bg-indigo-100 transition-colors"
        >
          {showCert ? 'Hide Certificate' : t('downloadCertificate')}
        </button>

        {showCert && user && (
          <div className="mt-4 space-y-4">
            <CertificateCanvas user={user} canvasRef={certRef} />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={downloadCert} className="bg-gray-800 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-900 transition-colors">
                ⬇ {t('download')}
              </button>
              <button onClick={shareWhatsApp} className="bg-green-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-green-600 transition-colors">
                WhatsApp
              </button>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}&quote=${shareText}`}
                target="_blank" rel="noopener noreferrer"
                className="bg-blue-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors text-center"
              >
                Facebook
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                target="_blank" rel="noopener noreferrer"
                className="bg-sky-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-sky-600 transition-colors text-center"
              >
                Twitter / X
              </a>
            </div>
            <button onClick={downloadCert} className="w-full bg-pink-50 border border-pink-200 text-pink-600 rounded-xl py-2.5 text-sm font-medium hover:bg-pink-100 transition-colors">
              📷 {t('downloadForInstagram')}
            </button>
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('recentActivity')}</h3>
        {profile?.recentSessions?.length > 0 ? (
          <div className="space-y-2">
            {profile.recentSessions.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm mr-2">{MODE_ICON[s.mode]}</span>
                  <span className="text-sm font-medium text-gray-700">
                    {s.mode === 'practice' || s.mode === 'timed' ? `Chapter ${s.chapter}` : 'Daily'}
                  </span>
                  <p className="text-xs text-gray-400">{new Date(s.completed_at).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-indigo-600">{s.score}</p>
                  <p className="text-xs text-gray-400">/{s.max_score} pts</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">{t('noActivity')}</p>
        )}
      </div>
    </div>
  );
}
