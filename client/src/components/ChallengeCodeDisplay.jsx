import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ChallengeCodeDisplay({ code }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWhatsApp = () => {
    const text = t('inviteText', { code });
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: '#EDE9FE', border: '2.5px solid var(--tc-purple)', boxShadow: '0 4px 0 var(--tc-purple-dark)' }}>
      <p className="text-xs font-black uppercase tracking-widest text-center" style={{ color: 'var(--tc-purple-dark)' }}>
        {t('yourCode')}
      </p>
      <div className="text-center">
        <span className="text-4xl font-black tracking-[0.3em]" style={{ color: 'var(--tc-purple)', fontFamily: 'monospace' }}>
          {code}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all"
          style={{
            background: copied ? '#5B21B6' : 'white',
            color: copied ? 'white' : 'var(--tc-purple)',
            border: '2px solid var(--tc-purple)',
          }}
        >
          {copied ? t('codeCopied') : 'Copy Code'}
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex-1 py-2.5 rounded-xl text-sm font-black"
          style={{ background: '#25D366', color: 'white', border: '2px solid #1da851' }}
        >
          {t('shareOnWhatsApp')}
        </button>
      </div>
    </div>
  );
}
