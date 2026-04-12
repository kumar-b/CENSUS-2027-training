import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LevelProgressBar from './LevelProgressBar';

// Minimal i18next mock — mirrors en.js interpolation patterns
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, vars) => {
      const strings = {
        levelProgress: `Level ${vars?.level} Progress`,
        xpToNext: `${vars?.xp} XP to Level ${vars?.next}! Keep going 🚀`,
        maxLevel: 'Max Level Reached! 🏆',
      };
      return strings[key] ?? key;
    },
  }),
}));

// Helper: cumulative XP to reach level N
const cumXP = (n) => 50 * (n - 1) * n;

describe('LevelProgressBar (full mode)', () => {
  it('renders the level heading', () => {
    render(<LevelProgressBar totalPoints={0} />);
    expect(screen.getByText('Level 1 Progress')).toBeInTheDocument();
  });

  it('shows absolute XP fraction in header (current / cumulative-to-next)', () => {
    // Level 1: cumXP(1)=0 → needs cumXP(2)=100 to reach L2
    render(<LevelProgressBar totalPoints={50} />);
    expect(screen.getByText('50 / 100 XP')).toBeInTheDocument();
  });

  it('shows XP remaining to next level in footer', () => {
    // 50 XP into L1, 50 XP left to L2
    render(<LevelProgressBar totalPoints={50} />);
    expect(screen.getByText('50 XP to Level 2! Keep going 🚀')).toBeInTheDocument();
  });

  it('reflects level 2 correctly', () => {
    // cumXP(2)=100 → user is at start of L2; needs cumXP(3)=300 total
    render(<LevelProgressBar totalPoints={100} />);
    expect(screen.getByText('Level 2 Progress')).toBeInTheDocument();
    expect(screen.getByText('100 / 300 XP')).toBeInTheDocument();
    expect(screen.getByText('200 XP to Level 3! Keep going 🚀')).toBeInTheDocument();
  });

  it('reflects level 10 milestone (4,500 XP)', () => {
    // cumXP(10)=4500, cumXP(11)=5500
    render(<LevelProgressBar totalPoints={4500} />);
    expect(screen.getByText('Level 10 Progress')).toBeInTheDocument();
    expect(screen.getByText('4,500 / 5,500 XP')).toBeInTheDocument();
    expect(screen.getByText('1,000 XP to Level 11! Keep going 🚀')).toBeInTheDocument();
  });

  it('hides XP fraction and shows max-level message at level 100', () => {
    render(<LevelProgressBar totalPoints={495000} />);
    expect(screen.getByText('Max Level Reached! 🏆')).toBeInTheDocument();
    // XP fraction row should NOT appear
    expect(screen.queryByText(/\/ .* XP/)).not.toBeInTheDocument();
  });

  it('caps at max level for XP beyond 495,000', () => {
    render(<LevelProgressBar totalPoints={999999} />);
    expect(screen.getByText('Max Level Reached! 🏆')).toBeInTheDocument();
  });

  it('handles 0 XP without errors', () => {
    render(<LevelProgressBar totalPoints={0} />);
    expect(screen.getByText('Level 1 Progress')).toBeInTheDocument();
  });

  it('handles null totalPoints without errors', () => {
    render(<LevelProgressBar totalPoints={null} />);
    expect(screen.getByText('Level 1 Progress')).toBeInTheDocument();
  });

  it('renders a progress bar element', () => {
    const { container } = render(<LevelProgressBar totalPoints={500} />);
    // The outer track + the fill div — both exist
    const bars = container.querySelectorAll('[style*="width"]');
    expect(bars.length).toBeGreaterThan(0);
  });
});

describe('LevelProgressBar (compact mode)', () => {
  it('renders Lv.N badge', () => {
    render(<LevelProgressBar totalPoints={0} compact />);
    expect(screen.getByText('Lv.1')).toBeInTheDocument();
  });

  it('shows absolute XP label', () => {
    // 0 XP at L1, cumXP(2)=100
    render(<LevelProgressBar totalPoints={0} compact />);
    expect(screen.getByText('0 / 100')).toBeInTheDocument();
  });

  it('shows MAX for level 100', () => {
    render(<LevelProgressBar totalPoints={495000} compact />);
    expect(screen.getByText('MAX')).toBeInTheDocument();
  });

  it('does not render the level heading text', () => {
    render(<LevelProgressBar totalPoints={500} compact />);
    expect(screen.queryByText(/Progress/)).not.toBeInTheDocument();
  });

  it('does not render the footer XP text', () => {
    render(<LevelProgressBar totalPoints={500} compact />);
    expect(screen.queryByText(/Keep going/)).not.toBeInTheDocument();
  });

  it('renders higher level correctly', () => {
    // cumXP(5)=1000, cumXP(6)=1500
    render(<LevelProgressBar totalPoints={1250} compact />);
    expect(screen.getByText('Lv.5')).toBeInTheDocument();
    expect(screen.getByText('1,250 / 1,500')).toBeInTheDocument();
  });
});
