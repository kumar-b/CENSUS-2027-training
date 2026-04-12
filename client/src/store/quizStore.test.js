import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the API client before importing the store
vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
  },
}));

import api from '../api/client';
import { useQuizStore } from './quizStore';

const INITIAL_STATE = {
  sessionId: null,
  questions: [],
  currentIndex: 0,
  answers: [],
  result: null,
};

// Reset store state between tests
beforeEach(() => {
  useQuizStore.setState(INITIAL_STATE);
  vi.clearAllMocks();
});

// ── loadSession ───────────────────────────────────────────────────────────────
describe('loadSession', () => {
  it('sets sessionId and questions directly', () => {
    const questions = [{ id: 1 }, { id: 2 }];
    useQuizStore.getState().loadSession(42, questions);

    const state = useQuizStore.getState();
    expect(state.sessionId).toBe(42);
    expect(state.questions).toEqual(questions);
  });

  it('resets index, answers, and result', () => {
    // Pre-set some dirty state
    useQuizStore.setState({ currentIndex: 3, answers: [{}], result: { score: 100 } });

    useQuizStore.getState().loadSession(99, [{ id: 5 }]);
    const state = useQuizStore.getState();
    expect(state.currentIndex).toBe(0);
    expect(state.answers).toEqual([]);
    expect(state.result).toBeNull();
  });
});

// ── nextQuestion ──────────────────────────────────────────────────────────────
describe('nextQuestion', () => {
  it('increments currentIndex by 1', () => {
    useQuizStore.setState({ currentIndex: 2 });
    useQuizStore.getState().nextQuestion();
    expect(useQuizStore.getState().currentIndex).toBe(3);
  });

  it('can be called multiple times', () => {
    useQuizStore.getState().nextQuestion();
    useQuizStore.getState().nextQuestion();
    expect(useQuizStore.getState().currentIndex).toBe(2);
  });
});

// ── reset ─────────────────────────────────────────────────────────────────────
describe('reset', () => {
  it('clears all state back to initial values', () => {
    useQuizStore.setState({ sessionId: 7, questions: [{ id: 1 }], currentIndex: 5, answers: [{}], result: {} });
    useQuizStore.getState().reset();
    const state = useQuizStore.getState();
    expect(state).toMatchObject(INITIAL_STATE);
  });
});

// ── startSession ──────────────────────────────────────────────────────────────
describe('startSession', () => {
  it('calls POST /quiz/start and stores returned data', async () => {
    const mockQuestions = [{ id: 10, question_en: 'Q1' }, { id: 11, question_en: 'Q2' }];
    api.post.mockResolvedValueOnce({ data: { sessionId: 55, questions: mockQuestions } });

    const result = await useQuizStore.getState().startSession('daily', null);

    expect(api.post).toHaveBeenCalledWith('/quiz/start', { mode: 'daily', chapter: null });
    expect(result.sessionId).toBe(55);

    const state = useQuizStore.getState();
    expect(state.sessionId).toBe(55);
    expect(state.questions).toEqual(mockQuestions);
    expect(state.currentIndex).toBe(0);
    expect(state.answers).toEqual([]);
  });

  it('passes chapter to the API for timed mode', async () => {
    api.post.mockResolvedValueOnce({ data: { sessionId: 56, questions: [] } });
    await useQuizStore.getState().startSession('timed', 3);
    expect(api.post).toHaveBeenCalledWith('/quiz/start', { mode: 'timed', chapter: 3 });
  });
});

// ── submitAnswer ──────────────────────────────────────────────────────────────
describe('submitAnswer', () => {
  it('calls POST /quiz/answer with current sessionId and appends result to answers', async () => {
    useQuizStore.setState({ sessionId: 77, questions: [], answers: [] });

    const mockResult = { isCorrect: true, pointsEarned: 15, currentStreak: 1, correctOption: 2 };
    api.post.mockResolvedValueOnce({ data: mockResult });

    const returned = await useQuizStore.getState().submitAnswer(10, 2, 8000);

    expect(api.post).toHaveBeenCalledWith('/quiz/answer', {
      sessionId: 77, questionId: 10, chosenOption: 2, timeTaken: 8000,
    });
    expect(returned).toEqual(mockResult);

    const { answers } = useQuizStore.getState();
    expect(answers).toHaveLength(1);
    expect(answers[0]).toEqual({ questionId: 10, chosenOption: 2, result: mockResult });
  });

  it('accumulates multiple answers', async () => {
    useQuizStore.setState({ sessionId: 88, answers: [] });
    api.post
      .mockResolvedValueOnce({ data: { isCorrect: true, pointsEarned: 10, currentStreak: 1 } })
      .mockResolvedValueOnce({ data: { isCorrect: false, pointsEarned: 0, currentStreak: 0 } });

    await useQuizStore.getState().submitAnswer(1, 0, 5000);
    await useQuizStore.getState().submitAnswer(2, 1, 3000);

    expect(useQuizStore.getState().answers).toHaveLength(2);
  });
});

// ── completeSession ───────────────────────────────────────────────────────────
describe('completeSession', () => {
  it('calls POST /quiz/complete and stores the result', async () => {
    useQuizStore.setState({ sessionId: 33 });
    const mockResult = { totalPoints: 150, correctCount: 8, totalQuestions: 10, streakMax: 5 };
    api.post.mockResolvedValueOnce({ data: mockResult });

    const returned = await useQuizStore.getState().completeSession();

    expect(api.post).toHaveBeenCalledWith('/quiz/complete', { sessionId: 33 });
    expect(returned).toEqual(mockResult);
    expect(useQuizStore.getState().result).toEqual(mockResult);
  });
});
