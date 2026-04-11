// Maps badge emoji icons (stored in DB) to SVG components
// All icons render at the given size

function Svg({ size, children, color = 'currentColor', sw = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const BADGE_SVG = {
  // ⚡ Quick Learner
  '⚡': ({ size, color }) => (
    <Svg size={size} color={color}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Svg>
  ),
  // 🎓 Dedicated
  '🎓': ({ size, color }) => (
    <Svg size={size} color={color}>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </Svg>
  ),
  // 💯 Century
  '💯': ({ size, color }) => (
    <Svg size={size} color={color}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </Svg>
  ),
  // 🌈 All-Rounder
  '🌈': ({ size, color }) => (
    <Svg size={size} color={color}>
      <path d="M22 17a10 10 0 0 0-20 0" />
      <path d="M6 17a6 6 0 0 1 12 0" />
      <path d="M10 17a2 2 0 0 1 4 0" />
    </Svg>
  ),
  // 🚀 Speed Star
  '🚀': ({ size, color }) => (
    <Svg size={size} color={color}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </Svg>
  ),
  // 🏅 Chapter Champion / Question Champion
  '🏅': ({ size, color }) => (
    <Svg size={size} color={color}>
      <circle cx="12" cy="14" r="6" />
      <path d="M8.21 8.21 4 4l4.5 1L12 2l3.5 3L20 4l-4.21 4.21" />
      <path d="m12 10 1.5 3h3l-2.4 1.8.9 3-3-2.1-3 2.1.9-3L7.5 13H11z" />
    </Svg>
  ),
  // 📅 Daily Devotee
  '📅': ({ size, color }) => (
    <Svg size={size} color={color}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </Svg>
  ),
  // 💎 High Scorer
  '💎': ({ size, color }) => (
    <Svg size={size} color={color}>
      <polygon points="6 3 18 3 22 9 12 22 2 9" />
      <line x1="2" y1="9" x2="22" y2="9" />
      <line x1="12" y1="3" x2="6" y2="9" />
      <line x1="12" y1="3" x2="18" y2="9" />
      <line x1="12" y1="22" x2="6" y2="9" />
      <line x1="12" y1="22" x2="18" y2="9" />
    </Svg>
  ),
  // 👑 Legend
  '👑': ({ size, color }) => (
    <Svg size={size} color={color}>
      <path d="M2 20h20" />
      <path d="m4 16 4-8 4 4 4-8 4 8" />
    </Svg>
  ),
  // 🔄 Practice Makes Perfect
  '🔄': ({ size, color }) => (
    <Svg size={size} color={color}>
      <path d="M21.5 2v6h-6M2.5 22v-6h6" />
      <path d="M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </Svg>
  ),
  // 🔍 Question Spotter
  '🔍': ({ size, color }) => (
    <Svg size={size} color={color}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Svg>
  ),
  // 🛡️ Question Guardian
  '🛡️': ({ size, color }) => (
    <Svg size={size} color={color}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </Svg>
  ),
};

// Fallback: generic award icon for any unrecognized emoji
function FallbackIcon({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

export default function BadgeIcon({ icon, size = 32, color = 'currentColor' }) {
  const Component = BADGE_SVG[icon];
  if (!Component) return <FallbackIcon size={size} color={color} />;
  return <Component size={size} color={color} />;
}
