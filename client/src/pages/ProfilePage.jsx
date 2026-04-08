import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import html2canvas from 'html2canvas';

const MODE_ICON = { daily: '🌟', timed: '⏱', practice: '📖' };

// Default avatar SVG shown when no photo uploaded
function DefaultAvatar({ size = 80 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="40" fill="#e0e7ff" />
      <circle cx="40" cy="32" r="14" fill="#a5b4fc" />
      <ellipse cx="40" cy="68" rx="22" ry="16" fill="#a5b4fc" />
    </svg>
  );
}

function CertificateCanvas({ user, photo, canvasRef }) {
  return (
    <div
      ref={canvasRef}
      style={{
        fontFamily: 'serif',
        background: 'white',
        border: '4px solid #4f46e5',
        borderRadius: '16px',
        padding: '32px',
        textAlign: 'center',
        width: '320px',
        margin: '0 auto',
      }}
    >
      <p style={{ color: '#4f46e5', fontWeight: 'bold', fontSize: '18px', margin: '0 0 4px' }}>जनगणना 2027</p>
      <p style={{ color: '#9ca3af', fontSize: '12px', margin: '0 0 16px' }}>Census Training Platform</p>

      {photo && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <img
            src={photo}
            alt="Profile"
            style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #c7d2fe' }}
            crossOrigin="anonymous"
          />
        </div>
      )}

      <div style={{ borderTop: '1px solid #c7d2fe', borderBottom: '1px solid #c7d2fe', padding: '16px 0', margin: '8px 0' }}>
        <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 4px' }}>This is to certify that</p>
        <p style={{ color: '#111827', fontWeight: 'bold', fontSize: '20px', margin: '0 0 4px' }}>{user.name}</p>
        <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 2px' }}>{user.functionary_type}</p>
        <p style={{ color: '#9ca3af', fontSize: '11px', margin: 0 }}>{user.district}, {user.state}</p>
      </div>

      <p style={{ color: '#6b7280', fontSize: '13px', margin: '8px 0 4px' }}>has earned</p>
      <p style={{ color: '#4f46e5', fontWeight: 'bold', fontSize: '36px', margin: '0 0 4px' }}>{user.total_points}</p>
      <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 12px' }}>training points</p>
      <p style={{ color: '#d1d5db', fontSize: '11px', margin: 0 }}>
        {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  );
}

// Compress image to max 200x200 JPEG at 60% quality → base64
function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 200;
      const canvas = document.createElement('canvas');
      const ratio = Math.min(size / img.width, size / img.height);
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.src = url;
  });
}

function triggerDownload(canvas, filename) {
  canvas.toBlob((blob) => {
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }, 'image/png');
}

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [showCert, setShowCert] = useState(false);
  const [uploading, setUploading] = useState(false);
  const certRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    api.get('/user/me').then(({ data }) => setProfile(data)).catch(() => {});
  }, []);

  const photo = profile?.user?.photo || user?.photo || null;

  const getCertCanvas = async () => {
    if (!showCert) {
      setShowCert(true);
      // Wait for React to render the cert div, then for fonts/images to load
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 200))));
    } else {
      await new Promise((r) => setTimeout(r, 50));
    }
    return html2canvas(certRef.current, { scale: 2, useCORS: true, allowTaint: false });
  };

  const downloadCert = async () => {
    const canvas = await getCertCanvas();
    triggerDownload(canvas, `census2027-certificate-${user.name}.png`);
  };

  const shareWhatsApp = async () => {
    const text = encodeURIComponent(`I earned ${user.total_points} points on the Census 2027 Training Platform! 🏆`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareUrl = encodeURIComponent(window.location.origin);
  const shareText = encodeURIComponent(`I earned ${user?.total_points} points on Census 2027 Training! 🏆`);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await compressImage(file);
      await api.patch('/user/me', { photo: base64 });
      updateUser({ photo: base64 });
      setProfile((p) => p ? { ...p, user: { ...p.user, photo: base64 } } : p);
    } catch {}
    setUploading(false);
  };

  const removePhoto = async () => {
    try {
      await api.patch('/user/me', { photo: null });
      updateUser({ photo: null });
      setProfile((p) => p ? { ...p, user: { ...p.user, photo: null } } : p);
    } catch {}
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Profile card */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => photoInputRef.current?.click()}
              className="block rounded-full overflow-hidden border-2 border-white/50 hover:border-white transition-all"
              title="Change photo"
              disabled={uploading}
            >
              {photo ? (
                <img src={photo} alt="Profile" className="w-16 h-16 object-cover" />
              ) : (
                <div className="w-16 h-16"><DefaultAvatar size={64} /></div>
              )}
            </button>
            {photo && (
              <button
                onClick={removePhoto}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600"
                title="Remove photo"
              >×</button>
            )}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{user?.name}</h2>
            <p className="text-indigo-100 text-sm">{user?.functionary_type}</p>
            <p className="text-indigo-200 text-xs">{user?.district}, {user?.state}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-bold">{user?.total_points}</p>
            <p className="text-indigo-200 text-xs">{t('totalPoints')}</p>
          </div>
        </div>
        {uploading && <p className="text-indigo-100 text-xs mt-2">Uploading photo…</p>}
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
            <CertificateCanvas user={user} photo={photo} canvasRef={certRef} />

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={downloadCert}
                className="bg-gray-800 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-900 transition-colors"
              >
                ⬇ {t('download')}
              </button>
              <button
                onClick={shareWhatsApp}
                className="bg-green-500 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-green-600 transition-colors"
              >
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
            <button
              onClick={downloadCert}
              className="w-full bg-pink-50 border border-pink-200 text-pink-600 rounded-xl py-2.5 text-sm font-medium hover:bg-pink-100 transition-colors"
            >
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
