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
import MyFlagsPage from './pages/MyFlagsPage';
import AdminFlagList from './pages/admin/AdminFlagList';
import AdminFlagDetail from './pages/admin/AdminFlagDetail';

function Layout({ children }) {
  const { user } = useAuthStore();
  return (
    <div className="min-h-screen flex justify-center" style={{ background: 'var(--tc-bg)' }}>
      <div className="w-full max-w-2xl flex flex-col shadow-sm" style={{ background: 'var(--tc-bg)', minHeight: '100svh' }}>
        {user && (
          <header
            className="sticky top-0 z-40 flex-shrink-0 flex items-center gap-3 px-3 py-2"
            style={{
              background: 'var(--tc-card)',
              borderBottom: '2px solid var(--tc-border)',
            }}
          >
            <img
              src="/cg-logo.svg"
              alt="Chhattisgarh Government"
              className="h-10 w-10 object-contain flex-shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div className="flex flex-col leading-tight flex-1 min-w-0">
              <span className="font-black text-base" style={{ color: 'var(--tc-primary-dark)' }}>जनगणना 2027</span>
              <span className="font-semibold text-xs truncate" style={{ color: 'var(--tc-text-sec)' }}>
                District Administration, Raipur
              </span>
            </div>
            <LanguageToggle />
          </header>
        )}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        {user && (
          <div className="sticky bottom-0 z-50 flex-shrink-0">
            <BottomNav />
          </div>
        )}
      </div>
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
          <Route path="/flags/mine" element={<ProtectedRoute><MyFlagsPage /></ProtectedRoute>} />

          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute adminOnly><AdminUserList /></ProtectedRoute>} />
          <Route path="/admin/users/:id" element={<ProtectedRoute adminOnly><AdminUserDetail /></ProtectedRoute>} />
          <Route path="/admin/badges" element={<ProtectedRoute adminOnly><AdminBadgeManager /></ProtectedRoute>} />
          <Route path="/admin/flags" element={<ProtectedRoute adminOnly><AdminFlagList /></ProtectedRoute>} />
          <Route path="/admin/flags/:id" element={<ProtectedRoute adminOnly><AdminFlagDetail /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
