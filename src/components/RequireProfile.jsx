import { Navigate, useLocation } from 'react-router-dom';
import useSession from '../hooks/useSession';

// Pages behind the free profile. Sends visitors to the landing form, then back here.
export default function RequireProfile({ children }) {
  const { session, loading } = useSession();
  const location = useLocation();
  if (loading) return <div className="app min-h-[60vh]" aria-busy="true" />;
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?next=${next}`} replace />;
  }
  return children;
}
