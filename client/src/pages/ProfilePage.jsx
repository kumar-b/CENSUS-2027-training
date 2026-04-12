import { useEffect, useState, useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import html2canvas from 'html2canvas';
import { FlagIcon, DownloadIcon, ScrollIcon } from '../components/Icons';
import BadgeIcon from '../components/BadgeIcon';
import LevelProgressBar from '../components/LevelProgressBar';

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

function CertificateCanvas({ user, totalPoints, photo, badges = [], canvasRef }) {
  const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const earnedBadges = badges.filter(b => b.earned);
  const font = '"Nunito", "Arial", sans-serif';
  const pts = String(totalPoints ?? user?.total_points ?? 0);

  return (
    <div
      ref={canvasRef}
      style={{
        fontFamily: font,
        background: '#FDF6EE',
        width: '100%',
        maxWidth: '420px',
        margin: '0 auto',
        border: '5px solid #9A3409',
        outline: '2px solid #C9970A',
        outlineOffset: '-9px',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Header bar */}
      <div style={{
        background: '#9A3409',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        {/* Logo in white circle */}
        <div style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: '#fff', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0, padding: '4px',
        }}>
          <img
            src="/cg-logo.svg"
            alt="CG Govt"
            style={{ width: '38px', height: '38px', objectFit: 'contain', display: 'block' }}
            crossOrigin="anonymous"
          />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontWeight: '800', fontSize: '13px', margin: 0, fontFamily: font }}>
            छत्तीसगढ़ शासन
          </p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', margin: '2px 0 0', fontFamily: font }}>
            District Administration, Raipur
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: '#FAE0D3', fontWeight: '800', fontSize: '13px', margin: 0, fontFamily: font }}>जनगणना 2027</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', margin: '2px 0 0', fontFamily: font }}>Census 2027</p>
        </div>
      </div>

      {/* Orange accent rule */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #C9970A, #D4843A, #C9970A)' }} />

      {/* Body */}
      <div style={{ padding: '20px 24px', textAlign: 'center' }}>

        {/* Title */}
        <p style={{ color: '#C1440E', fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 4px', fontWeight: '800', fontFamily: font }}>
          Certificate of Training
        </p>
        <p style={{ color: '#7A5C4A', fontSize: '13px', margin: '0 0 14px', fontFamily: font, fontWeight: '600' }}>
          प्रशिक्षण प्रमाण पत्र
        </p>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px' }}>
          <div style={{ flex: 1, height: '1px', background: '#E8D5C0' }} />
          <div style={{ color: '#C9970A', fontSize: '14px' }}>✦</div>
          <div style={{ flex: 1, height: '1px', background: '#E8D5C0' }} />
        </div>

        <p style={{ color: '#7A5C4A', fontSize: '12px', margin: '0 0 10px', fontFamily: font, fontStyle: 'italic' }}>
          This is to certify that
        </p>

        {/* Profile photo */}
        {photo && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <img
              src={photo}
              alt="Profile"
              style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #C9970A' }}
              crossOrigin="anonymous"
            />
          </div>
        )}

        {/* Name */}
        <p style={{ color: '#2C1810', fontWeight: '900', fontSize: '22px', margin: '0 0 4px', letterSpacing: '0.3px', fontFamily: font }}>
          {user.name}
        </p>
        <p style={{ color: '#7A5C4A', fontSize: '12px', margin: '0 0 2px', fontFamily: font, fontWeight: '600' }}>
          {user.functionary_type}
        </p>
        <p style={{ color: '#AD8B78', fontSize: '11px', margin: '0 0 14px', fontFamily: font }}>
          {user.district}, {user.state}
        </p>

        <p style={{ color: '#7A5C4A', fontSize: '12px', margin: '0 0 12px', fontFamily: font, fontStyle: 'italic' }}>
          has successfully taken part in the Census 2027 Training Program and earned
        </p>

        {/* Points box */}
        <div style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          border: '2px solid #C9970A',
          borderRadius: '8px',
          padding: '10px 28px',
          margin: '0 0 16px',
          background: '#FFFAF4',
          minWidth: '140px',
        }}>
          <div style={{ position: 'relative', zIndex: 2, color: '#C1440E', fontWeight: '900', fontSize: '36px', margin: 0, lineHeight: '1.1', fontFamily: font, textAlign: 'center', width: '100%' }}>
            {pts}
          </div>
          <div style={{ position: 'relative', zIndex: 2, color: '#AD8B78', fontSize: '10px', margin: '2px 0 0', fontFamily: font, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: '700', textAlign: 'center', width: '100%' }}>
            Training Points
          </div>
        </div>

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            <p style={{ color: '#C1440E', fontSize: '10px', fontWeight: '800', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 10px', fontFamily: font }}>
              Badges Earned
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
              {earnedBadges.map((b) => (
                <div key={b.id} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  background: '#FFFAF4', border: '1.5px solid #E8D5C0',
                  borderRadius: '10px', padding: '7px 8px', width: '62px',
                }}>
                  <BadgeIcon icon={b.icon} size={22} color="#C1440E" />
                  <p style={{ color: '#2C1810', fontSize: '8px', margin: 0, textAlign: 'center', lineHeight: 1.2, fontFamily: font, fontWeight: '700' }}>
                    {b.name_en}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px' }}>
          <div style={{ flex: 1, height: '1px', background: '#E8D5C0' }} />
          <div style={{ color: '#C9970A', fontSize: '10px' }}>✦</div>
          <div style={{ flex: 1, height: '1px', background: '#E8D5C0' }} />
        </div>

        <p style={{ color: '#AD8B78', fontSize: '10px', margin: 0, fontFamily: font }}>
          Issued on {dateStr}
        </p>
      </div>

      {/* Footer bar */}
      <div style={{ background: '#9A3409', padding: '7px 16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '9px', margin: 0, fontFamily: font }}>
          censusindia.gov.in/census.website
        </p>
      </div>
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

// Badge canvas rendered off-screen for html2canvas capture
const BadgeCanvas = forwardRef(function BadgeCanvas({ badge, user }, ref) {
  const font = '"Nunito", "Arial", sans-serif';
  const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: '-9999px',
        fontFamily: font,
        background: '#FDF6EE',
        width: '320px',
        border: '5px solid #9A3409',
        outline: '2px solid #C9970A',
        outlineOffset: '-9px',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ background: '#9A3409', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: '3px' }}>
          <img src="/cg-logo.svg" alt="CG Govt" style={{ width: '32px', height: '32px', objectFit: 'contain', display: 'block' }} crossOrigin="anonymous" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontWeight: '800', fontSize: '12px', margin: 0, fontFamily: font }}>छत्तीसगढ़ शासन</p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '10px', margin: '1px 0 0', fontFamily: font }}>District Administration, Raipur</p>
        </div>
        <p style={{ color: '#FAE0D3', fontWeight: '800', fontSize: '12px', margin: 0, fontFamily: font }}>जनगणना 2027</p>
      </div>

      {/* Gold accent */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #C9970A, #D4843A, #C9970A)' }} />

      {/* Body */}
      <div style={{ padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ color: '#C1440E', fontSize: '9px', letterSpacing: '3px', textTransform: 'uppercase', margin: '0 0 14px', fontWeight: '800', fontFamily: font }}>
          Badge of Achievement · उपलब्धि बैज
        </p>

        {/* Badge icon in gold ring */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
          <div style={{ width: '90px', height: '90px', borderRadius: '50%', border: '3px solid #C9970A', background: '#FFFAF4', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 0 6px #F5E6C8' }}>
            <BadgeIcon icon={badge.icon} size={46} color="#C1440E" />
          </div>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px' }}>
          <div style={{ flex: 1, height: '1px', background: '#E8D5C0' }} />
          <div style={{ color: '#C9970A', fontSize: '12px' }}>✦</div>
          <div style={{ flex: 1, height: '1px', background: '#E8D5C0' }} />
        </div>

        <p style={{ color: '#2C1810', fontWeight: '900', fontSize: '18px', margin: '0 0 3px', fontFamily: font }}>{badge.name_en}</p>
        {badge.name_hi && <p style={{ color: '#7A5C4A', fontSize: '13px', margin: '0 0 10px', fontFamily: font, fontWeight: '600' }}>{badge.name_hi}</p>}
        <p style={{ color: '#AD8B78', fontSize: '11px', margin: '0 0 16px', lineHeight: 1.5, fontFamily: font }}>{badge.description_en}</p>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 12px' }}>
          <div style={{ flex: 1, height: '1px', background: '#E8D5C0' }} />
          <div style={{ color: '#C9970A', fontSize: '10px' }}>✦</div>
          <div style={{ flex: 1, height: '1px', background: '#E8D5C0' }} />
        </div>

        <p style={{ color: '#2C1810', fontWeight: '900', fontSize: '15px', margin: '0 0 3px', fontFamily: font }}>{user.name}</p>
        <p style={{ color: '#AD8B78', fontSize: '10px', margin: 0, fontFamily: font }}>Awarded on {dateStr}</p>
      </div>

      {/* Footer */}
      <div style={{ background: '#9A3409', padding: '6px 14px', display: 'flex', justifyContent: 'flex-end' }}>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '9px', margin: 0, fontFamily: font }}>censusindia.gov.in/census.website</p>
      </div>
    </div>
  );
});

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
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [pendingFlagsCount, setPendingFlagsCount] = useState(0);
  const [showCert, setShowCert] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingBadge, setDownloadingBadge] = useState(null);
  const certRef = useRef(null);
  const badgeRef = useRef(null);
  const photoInputRef = useRef(null);

  useEffect(() => {
    api.get('/user/me').then(({ data }) => {
      setProfile(data);
      // Keep authStore in sync so total_points is always current
      updateUser({ total_points: data.user.total_points });
    }).catch(() => { });
    api.get('/flags/mine').then(({ data }) => {
      setPendingFlagsCount(data.filter(f => f.status === 'pending').length);
    }).catch(() => { });
  }, []);

  const photo = profile?.user?.photo || user?.photo || null;

  const downloadBadge = async (badge) => {
    setDownloadingBadge(badge);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 200))));
    const canvas = await html2canvas(badgeRef.current, { scale: 2, useCORS: true, allowTaint: false });
    triggerDownload(canvas, `census2027-badge-${badge.name_en.replace(/\s+/g, '-')}.png`);
    setDownloadingBadge(null);
  };

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

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await compressImage(file);
      await api.patch('/user/me', { photo: base64 });
      updateUser({ photo: base64 });
      setProfile((p) => p ? { ...p, user: { ...p.user, photo: base64 } } : p);
    } catch { }
    setUploading(false);
  };

  const removePhoto = async () => {
    try {
      await api.patch('/user/me', { photo: null });
      updateUser({ photo: null });
      setProfile((p) => p ? { ...p, user: { ...p.user, photo: null } } : p);
    } catch { }
  };

  return (
    <div className="pb-6">
      {/* Profile header */}
      <div className="px-4 pt-5 pb-6" style={{ background: 'linear-gradient(135deg, var(--tc-primary) 0%, var(--tc-orange) 100%)' }}>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => photoInputRef.current?.click()}
              className="block rounded-full overflow-hidden transition-all"
              style={{ border: '3px solid rgba(255,255,255,0.6)' }}
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
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center"
                style={{ background: '#C1440E', border: '2px solid #fff' }}
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
            <h2 className="text-xl font-black truncate" style={{ color: '#fff' }}>{user?.name}</h2>
            <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>{user?.functionary_type}</p>
            <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>{user?.district}, {user?.state}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-3xl font-black" style={{ color: '#fff' }}>{user?.total_points}</p>
            <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>{t('totalPoints')}</p>
          </div>
        </div>
        {uploading && <p className="text-xs mt-2 font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>Uploading photo…</p>}
      </div>

      <div className="px-4 space-y-5 mt-5">

        {/* Level progress */}
        <div className="rounded-2xl px-4 py-3"
          style={{ background: 'var(--tc-card)', border: '2px solid var(--tc-border)', boxShadow: '0 3px 0 var(--tc-border)' }}>
          <LevelProgressBar totalPoints={profile?.user?.total_points ?? user?.total_points ?? 0} />
        </div>

        {/* Hidden badge canvas for download */}
        {downloadingBadge && user && (
          <BadgeCanvas ref={badgeRef} badge={downloadingBadge} user={user} />
        )}

        {/* Badges */}
        <div>
          <p className="sec-label">{t('badges')}</p>
          {profile?.badges?.length > 0 ? (
            <>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--tc-text-muted)' }}>
                {profile.badges.filter(b => b.earned).length} / {profile.badges.length} earned
              </p>
              <div className="grid grid-cols-2 gap-2">
                {profile.badges.map((b) => (
                  <div key={b.id}
                    className="rounded-xl p-3 flex items-center gap-2"
                    style={{
                      background: b.earned ? 'var(--tc-card)' : 'var(--tc-bg)',
                      border: `2px solid ${b.earned ? 'var(--tc-border)' : 'var(--tc-border)'}`,
                      boxShadow: b.earned ? '0 3px 0 var(--tc-border)' : 'none',
                      opacity: b.earned ? 1 : 0.5,
                    }}>
                    <BadgeIcon icon={b.icon} size={28} color={b.earned ? 'var(--tc-primary)' : 'var(--tc-text-muted)'} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs" style={{ color: b.earned ? 'var(--tc-text)' : 'var(--tc-text-muted)' }}>{b.name_en}</p>
                      <p className="text-xs font-semibold leading-tight" style={{ color: 'var(--tc-text-muted)' }}>{b.description_en}</p>
                    </div>
                    {b.earned ? (
                      <button
                        onClick={() => downloadBadge(b)}
                        disabled={!!downloadingBadge}
                        className="flex-shrink-0 disabled:opacity-40"
                        style={{ color: 'var(--tc-text-muted)' }}
                        title={t('downloadBadge')}
                      ><DownloadIcon size={16} color="var(--tc-text-muted)" /></button>
                    ) : (
                      <span className="flex-shrink-0 text-sm">🔒</span>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm font-semibold" style={{ color: 'var(--tc-text-muted)' }}>{t('noBadges')}</p>
          )}
        </div>

        {/* My Reports */}
        <button
          onClick={() => navigate('/flags/mine')}
          className="w-full rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{ background: 'var(--tc-card)', border: '2px solid var(--tc-border)', boxShadow: '0 3px 0 var(--tc-border)' }}
        >
          <div className="flex items-center gap-3">
            <FlagIcon size={18} color="var(--tc-text-sec)" />
            <span className="font-bold text-sm" style={{ color: 'var(--tc-text)' }}>{t('myReports')}</span>
          </div>
          <div className="flex items-center gap-2">
            {pendingFlagsCount > 0 && (
              <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: '#FFF0D0', color: '#AA6520', border: '2px solid #D4843A' }}>
                {pendingFlagsCount} pending
              </span>
            )}
            <span className="font-black" style={{ color: 'var(--tc-text-muted)' }}>›</span>
          </div>
        </button>

        {/* Certificate */}
        <div>
          <p className="sec-label">{t('certificate')}</p>
          <button
            onClick={() => setShowCert(!showCert)}
            className="btn-3d btn-ghost"
            style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ScrollIcon size={16} color="var(--tc-primary-dark)" />
            {showCert ? 'Hide Certificate' : t('downloadCertificate')}
          </button>

          {showCert && user && (
            <div className="mt-4 space-y-4">
              <CertificateCanvas
                user={profile?.user || user}
                totalPoints={profile?.user?.total_points ?? user?.total_points ?? 0}
                photo={photo}
                badges={profile?.badges || []}
                canvasRef={certRef}
              />

              <button
                onClick={downloadCert}
                className="w-full rounded-xl py-2.5 text-sm font-bold"
                style={{ background: '#2C1810', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <DownloadIcon size={15} color="#fff" /> {t('download')}
              </button>
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div>
          <p className="sec-label">{t('recentActivity')}</p>
          {profile?.recentSessions?.length > 0 ? (
            <div className="space-y-2">
              {profile.recentSessions.map((s) => (
                <div key={s.id} className="rounded-xl px-4 py-3 flex items-center justify-between"
                  style={{ background: 'var(--tc-card)', border: '2px solid var(--tc-border)' }}>
                  <div>
                    <span className="text-sm mr-2">{MODE_ICON[s.mode]}</span>
                    <span className="text-sm font-bold" style={{ color: 'var(--tc-text)' }}>
                      {s.mode === 'practice' || s.mode === 'timed' ? `Chapter ${s.chapter}` : 'Daily'}
                    </span>
                    <p className="text-xs font-semibold" style={{ color: 'var(--tc-text-muted)' }}>{new Date(s.completed_at).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black" style={{ color: 'var(--tc-primary)' }}>{s.score}</p>
                    <p className="text-xs font-semibold" style={{ color: 'var(--tc-text-muted)' }}>/{s.max_score} pts</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold" style={{ color: 'var(--tc-text-muted)' }}>{t('noActivity')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
