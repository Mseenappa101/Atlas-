import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Only mounted when flags.accounts is on.
export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}
