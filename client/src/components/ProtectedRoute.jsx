import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Loading…</div>;
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />;

  return children;
}
