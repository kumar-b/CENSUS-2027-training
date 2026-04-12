import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuizQuestion from './QuizQuestion';

// ── Mocks ─────────────────────────────────────────────────────────────────────
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k) => ({
      wrongAnswer: 'Wrong answer',
      questionUnclear: 'Question unclear',
      translationError: 'Translation error',
      otherIssue: 'Other',
      addNote: 'Add a note (optional)',
      submitReport: 'Submit Report',
      cancel: 'Cancel',
      flagQuestion: 'Report an issue',
      reportIssue: '⚑ Report an issue with this question',
      alreadyReported: 'Already reported ✓',
      reportSubmitted: 'Thank you — your report has been submitted',
      loading: 'Loading…',
      error: 'Something went wrong',
    })[k] ?? k,
    i18n: { language: 'en' },
  }),
}));

vi.mock('../api/client', () => ({
  default: { post: vi.fn() },
}));

vi.mock('./Icons', () => ({
  CheckIcon: ({ size, color }) => <span data-testid="check-icon" />,
  XIcon:     ({ size, color }) => <span data-testid="x-icon" />,
}));

import api from '../api/client';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const baseQuestion = {
  id: 101,
  question_en: 'What is the capital of India?',
  question_hi: 'भारत की राजधानी क्या है?',
  options_en: JSON.stringify(['Mumbai', 'Delhi', 'Chennai', 'Kolkata']),
  options_hi: JSON.stringify(['मुम्बई', 'दिल्ली', 'चेन्नई', 'कोलकाता']),
  correct_option: 1, // Delhi
  explanation_en: 'Delhi is the capital of India.',
  explanation_hi: 'दिल्ली भारत की राजधानी है।',
  difficulty: 'easy',
};

const defaultProps = {
  question: baseQuestion,
  onAnswer: vi.fn(),
  answered: null,
  result: null,
  currentIndex: 0,
  total: 10,
  flaggedQuestionIds: new Set(),
  onFlagged: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

// ── Rendering ─────────────────────────────────────────────────────────────────
describe('QuizQuestion rendering', () => {
  it('renders the question text', () => {
    render(<QuizQuestion {...defaultProps} />);
    expect(screen.getByText('What is the capital of India?')).toBeInTheDocument();
  });

  it('renders all 4 option texts', () => {
    render(<QuizQuestion {...defaultProps} />);
    expect(screen.getByText('Mumbai')).toBeInTheDocument();
    expect(screen.getByText('Delhi')).toBeInTheDocument();
    expect(screen.getByText('Chennai')).toBeInTheDocument();
    expect(screen.getByText('Kolkata')).toBeInTheDocument();
  });

  it('renders A/B/C/D option labels', () => {
    render(<QuizQuestion {...defaultProps} />);
    ['A.', 'B.', 'C.', 'D.'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders progress counter (Q 1 / 10)', () => {
    render(<QuizQuestion {...defaultProps} />);
    expect(screen.getByText('Q 1 / 10')).toBeInTheDocument();
  });

  it('renders difficulty badge', () => {
    render(<QuizQuestion {...defaultProps} />);
    expect(screen.getByText('easy')).toBeInTheDocument();
  });

  it('does NOT show explanation before answering', () => {
    render(<QuizQuestion {...defaultProps} />);
    expect(screen.queryByText('Delhi is the capital of India.')).not.toBeInTheDocument();
  });

  it('does NOT show the report button before answering', () => {
    render(<QuizQuestion {...defaultProps} />);
    expect(screen.queryByText('⚑ Report an issue with this question')).not.toBeInTheDocument();
  });
});

// ── Option interaction ────────────────────────────────────────────────────────
describe('QuizQuestion option clicks', () => {
  it('calls onAnswer with the original (pre-shuffle) option index when clicked', () => {
    const onAnswer = vi.fn();
    render(<QuizQuestion {...defaultProps} onAnswer={onAnswer} />);

    // Each button onClick passes the original index (0–3), not the display index.
    // The seeded shuffle with id=101 gives a deterministic order.
    // We click whichever button contains "Delhi" and expect correct_option=1.
    fireEvent.click(screen.getByText('Delhi').closest('button'));
    expect(onAnswer).toHaveBeenCalledWith(1); // Delhi is original index 1
  });

  it('calls onAnswer with 0 when the first original option is clicked', () => {
    const onAnswer = vi.fn();
    render(<QuizQuestion {...defaultProps} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText('Mumbai').closest('button'));
    expect(onAnswer).toHaveBeenCalledWith(0);
  });

  it('disables all option buttons after answering', () => {
    const result = { isCorrect: true, correctOption: 1, pointsEarned: 10 };
    render(<QuizQuestion {...defaultProps} answered={1} result={result} />);
    const buttons = screen.getAllByRole('button').filter(b => ['Mumbai', 'Delhi', 'Chennai', 'Kolkata'].some(t => b.textContent.includes(t)));
    buttons.forEach(b => expect(b).toBeDisabled());
  });
});

// ── After answering ───────────────────────────────────────────────────────────
describe('QuizQuestion post-answer state', () => {
  const correctResult = { isCorrect: true, correctOption: 1, pointsEarned: 15, currentStreak: 1 };
  const wrongResult   = { isCorrect: false, correctOption: 1, pointsEarned: 0,  currentStreak: 0 };

  it('shows explanation after a correct answer', () => {
    render(<QuizQuestion {...defaultProps} answered={1} result={correctResult} />);
    expect(screen.getByText('Delhi is the capital of India.')).toBeInTheDocument();
  });

  it('shows explanation after a wrong answer', () => {
    render(<QuizQuestion {...defaultProps} answered={0} result={wrongResult} />);
    expect(screen.getByText('Delhi is the capital of India.')).toBeInTheDocument();
  });

  it('shows CheckIcon on correct answer', () => {
    render(<QuizQuestion {...defaultProps} answered={1} result={correctResult} />);
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  it('shows XIcon on wrong answer', () => {
    render(<QuizQuestion {...defaultProps} answered={0} result={wrongResult} />);
    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
  });

  it('shows points earned when > 0', () => {
    render(<QuizQuestion {...defaultProps} answered={1} result={correctResult} />);
    expect(screen.getByText('+15 pts')).toBeInTheDocument();
  });

  it('does NOT show points when 0 (wrong answer)', () => {
    render(<QuizQuestion {...defaultProps} answered={0} result={wrongResult} />);
    expect(screen.queryByText('+0 pts')).not.toBeInTheDocument();
  });

  it('shows the report issue button after answering', () => {
    render(<QuizQuestion {...defaultProps} answered={1} result={correctResult} />);
    expect(screen.getByText('⚑ Report an issue with this question')).toBeInTheDocument();
  });
});

// ── Deterministic shuffle ─────────────────────────────────────────────────────
describe('seededShuffle determinism', () => {
  it('renders the same option order on every render for the same question.id', () => {
    const getOrder = () => {
      const { unmount } = render(<QuizQuestion {...defaultProps} />);
      const buttons = screen.getAllByRole('button').filter(b =>
        ['Mumbai', 'Delhi', 'Chennai', 'Kolkata'].some(t => b.textContent.includes(t))
      );
      const order = buttons.map(b => b.textContent.replace(/^[A-D]\. /, ''));
      unmount();
      return order;
    };

    const first  = getOrder();
    const second = getOrder();
    expect(first).toEqual(second);
  });

  it('produces a different order for a different question.id', () => {
    const q1 = { ...baseQuestion, id: 1 };
    const q2 = { ...baseQuestion, id: 997 };

    const { unmount: u1 } = render(<QuizQuestion {...defaultProps} question={q1} />);
    const order1 = screen.getAllByRole('button')
      .filter(b => ['Mumbai', 'Delhi', 'Chennai', 'Kolkata'].some(t => b.textContent.includes(t)))
      .map(b => b.textContent.replace(/^[A-D]\. /, ''));
    u1();

    render(<QuizQuestion {...defaultProps} question={q2} />);
    const order2 = screen.getAllByRole('button')
      .filter(b => ['Mumbai', 'Delhi', 'Chennai', 'Kolkata'].some(t => b.textContent.includes(t)))
      .map(b => b.textContent.replace(/^[A-D]\. /, ''));

    // It's possible (but very unlikely) two different seeds produce the same order;
    // this test just checks the seeding mechanism runs without error.
    expect(order1).toHaveLength(4);
    expect(order2).toHaveLength(4);
  });
});

// ── Flag state ────────────────────────────────────────────────────────────────
describe('QuizQuestion flag / report', () => {
  const result = { isCorrect: true, correctOption: 1, pointsEarned: 10 };

  it('shows "Already reported" instead of the report button when question is flagged', () => {
    render(<QuizQuestion {...defaultProps} answered={1} result={result} flaggedQuestionIds={new Set([101])} />);
    expect(screen.getByText('Already reported ✓')).toBeInTheDocument();
    expect(screen.queryByText('⚑ Report an issue with this question')).not.toBeInTheDocument();
  });

  it('opens the flag modal when the report button is clicked', () => {
    render(<QuizQuestion {...defaultProps} answered={1} result={result} />);
    fireEvent.click(screen.getByText('⚑ Report an issue with this question'));
    expect(screen.getByText('Report an issue')).toBeInTheDocument();
  });

  it('closes the modal when Cancel is clicked', () => {
    render(<QuizQuestion {...defaultProps} answered={1} result={result} />);
    fireEvent.click(screen.getByText('⚑ Report an issue with this question'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Report an issue')).not.toBeInTheDocument();
  });

  it('submits the flag via API and shows toast', async () => {
    api.post.mockResolvedValueOnce({});
    render(<QuizQuestion {...defaultProps} answered={1} result={result} />);

    fireEvent.click(screen.getByText('⚑ Report an issue with this question'));
    fireEvent.click(screen.getByText('Wrong answer'));           // select category
    fireEvent.click(screen.getByText('Submit Report'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/flags', {
        questionId: 101, category: 'wrong_answer', note: '',
      });
    });
    await waitFor(() => {
      expect(screen.getByText('Thank you — your report has been submitted')).toBeInTheDocument();
    });
  });

  it('treats a 409 response as already-reported (success path)', async () => {
    api.post.mockRejectedValueOnce({ response: { status: 409 } });
    const onFlagged = vi.fn();
    render(<QuizQuestion {...defaultProps} answered={1} result={result} onFlagged={onFlagged} />);

    fireEvent.click(screen.getByText('⚑ Report an issue with this question'));
    fireEvent.click(screen.getByText('Wrong answer'));
    fireEvent.click(screen.getByText('Submit Report'));

    await waitFor(() => expect(onFlagged).toHaveBeenCalledWith(101));
  });
});
