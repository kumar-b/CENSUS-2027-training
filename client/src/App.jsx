import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import BottomNav from './components/BottomNav';
import LanguageToggle from './components/LanguageToggle';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import QuizSelectorPage from './pages/QuizSelectorPage';
import DailyQuizPage from './pages/DailyQuizPage';
import TimedQuizPage from './pages/TimedQuizPage';
import PracticePage from './pages/PracticePage';
import ResultsPage from './pages/ResultsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUserList from './pages/admin/AdminUserList';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminBadgeManager from './pages/admin/AdminBadgeManager';

function Layout({ children }) {
  const { user } = useAuthStore();
  return (
    <div className="min-h-screen bg-gray-50 max-w-2xl mx-auto relative">
      {user && (
        <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-40">
          <span className="font-bold text-indigo-700 text-lg">जनगणना 2027</span>
          <LanguageToggle />
        </header>
      )}
      <main className={user ? 'pb-20' : ''}>
        {children}
      </main>
      {user && <BottomNav />}
    </div>
  );
}

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => { init(); }, [init]);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/quiz" element={<ProtectedRoute><QuizSelectorPage /></ProtectedRoute>} />
          <Route path="/quiz/daily" element={<ProtectedRoute><DailyQuizPage /></ProtectedRoute>} />
          <Route path="/quiz/timed" element={<ProtectedRoute><TimedQuizPage /></ProtectedRoute>} />
          <Route path="/quiz/practice" element={<ProtectedRoute><PracticePage /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUserList /></ProtectedRoute>} />
          <Route path="/admin/users/:id" element={<ProtectedRoute adminOnly><AdminUserDetail /></ProtectedRoute>} />
          <Route path="/admin/badges" element={<ProtectedRoute adminOnly><AdminBadgeManager /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
