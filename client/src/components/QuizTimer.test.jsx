import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import QuizTimer from './QuizTimer';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => ({ timeLeft: 'Time left' })[k] ?? k }),
}));

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

// ── Initial rendering ─────────────────────────────────────────────────────────
describe('QuizTimer initial render', () => {
  it('displays MM:SS format', () => {
    render(<QuizTimer totalSeconds={600} onExpire={vi.fn()} />);
    expect(screen.getByText('10:00')).toBeInTheDocument();
  });

  it('pads single-digit seconds with a leading zero', () => {
    render(<QuizTimer totalSeconds={65} onExpire={vi.fn()} />);
    expect(screen.getByText('01:05')).toBeInTheDocument();
  });

  it('shows 00:60 → 01:00 correctly', () => {
    render(<QuizTimer totalSeconds={60} onExpire={vi.fn()} />);
    expect(screen.getByText('01:00')).toBeInTheDocument();
  });

  it('shows 00:30 for 30 seconds', () => {
    render(<QuizTimer totalSeconds={30} onExpire={vi.fn()} />);
    expect(screen.getByText('00:30')).toBeInTheDocument();
  });

  it('renders the "Time left" label', () => {
    render(<QuizTimer totalSeconds={120} onExpire={vi.fn()} />);
    expect(screen.getByText('Time left')).toBeInTheDocument();
  });
});

// ── Countdown ─────────────────────────────────────────────────────────────────
describe('QuizTimer countdown', () => {
  it('decrements by 1 after each second', () => {
    render(<QuizTimer totalSeconds={10} onExpire={vi.fn()} />);
    expect(screen.getByText('00:10')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText('00:09')).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.getByText('00:05')).toBeInTheDocument();
  });

  it('calls onExpire when countdown reaches 0', () => {
    const onExpire = vi.fn();
    render(<QuizTimer totalSeconds={3} onExpire={onExpire} />);

    act(() => { vi.advanceTimersByTime(3000); });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('does not call onExpire before time is up', () => {
    const onExpire = vi.fn();
    render(<QuizTimer totalSeconds={5} onExpire={onExpire} />);
    act(() => { vi.advanceTimersByTime(4000); });
    expect(onExpire).not.toHaveBeenCalled();
  });
});

// ── Urgency states ────────────────────────────────────────────────────────────
describe('QuizTimer urgency states', () => {
  it('applies orange (#D4843A) warning color between 30 and 60 seconds remaining', () => {
    render(<QuizTimer totalSeconds={120} onExpire={vi.fn()} />);
    act(() => { vi.advanceTimersByTime(65000); }); // 55 seconds left (warning zone)
    const timeEl = screen.getByText('00:55');
    expect(timeEl.style.color).toBe('rgb(212, 132, 58)'); // #D4843A
  });

  it('applies red (#C1440E) urgent color below 30 seconds remaining', () => {
    render(<QuizTimer totalSeconds={60} onExpire={vi.fn()} />);
    act(() => { vi.advanceTimersByTime(35000); }); // 25 seconds left (urgent zone)
    const timeEl = screen.getByText('00:25');
    expect(timeEl.style.color).toBe('rgb(193, 68, 14)'); // #C1440E
  });
});

// ── Progress bar ──────────────────────────────────────────────────────────────
describe('QuizTimer progress bar', () => {
  it('fills to 100% at the start', () => {
    const { container } = render(<QuizTimer totalSeconds={60} onExpire={vi.fn()} />);
    const fill = container.querySelector('[style*="width"]');
    expect(fill.style.width).toBe('100%');
  });

  it('shrinks as time elapses', () => {
    const { container } = render(<QuizTimer totalSeconds={100} onExpire={vi.fn()} />);
    act(() => { vi.advanceTimersByTime(50000); }); // 50s left → 50%
    const fill = container.querySelector('[style*="width"]');
    expect(fill.style.width).toBe('50%');
  });
});
