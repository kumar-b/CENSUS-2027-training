import { create } from 'zustand';
import api from '../api/client';

export const useQuizStore = create((set, get) => ({
  sessionId: null,
  questions: [],
  currentIndex: 0,
  answers: [],       // { questionId, chosenOption, result }
  result: null,      // completeSession response

  startSession: async (mode, chapter) => {
    const { data } = await api.post('/quiz/start', { mode, chapter });
    set({
      sessionId: data.sessionId,
      questions: data.questions,
      currentIndex: 0,
      answers: [],
      result: null,
    });
    return data;
  },

  submitAnswer: async (questionId, chosenOption, timeTaken) => {
    const { sessionId } = get();
    const { data } = await api.post('/quiz/answer', { sessionId, questionId, chosenOption, timeTaken });
    set((s) => ({
      answers: [...s.answers, { questionId, chosenOption, result: data }],
    }));
    return data;
  },

  nextQuestion: () => set((s) => ({ currentIndex: s.currentIndex + 1 })),

  completeSession: async () => {
    const { sessionId } = get();
    const { data } = await api.post('/quiz/complete', { sessionId });
    set({ result: data });
    return data;
  },

  // Load a pre-started session (used by challenge quiz — bypasses the /quiz/start endpoint)
  loadSession: (sessionId, questions) => set({ sessionId, questions, currentIndex: 0, answers: [], result: null }),

  reset: () => set({ sessionId: null, questions: [], currentIndex: 0, answers: [], result: null }),
}));
