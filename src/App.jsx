import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { flags } from './lib/flags';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Directory from './pages/Directory';
import Calendar from './pages/Calendar';
import Templates from './pages/Templates';

// Pre-pivot features. Loaded only when their flag is on, so they stay out of the public bundle.
const AuthProvider = lazy(() => import('./context/AuthContext').then((m) => ({ default: m.AuthProvider })));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Settings = lazy(() => import('./pages/Settings'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Pricing = lazy(() => import('./pages/Pricing'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));

function FirmRedirect() {
  const { id } = useParams();
  return <Navigate to={`/directory/${id}`} replace />;
}

function NotFound() {
  const { pathname } = useLocation();
  return (
    <main className="page py-16">
      <h1 className="text-xl">Page not found</h1>
      <p className="mt-2 text-muted">
        Nothing lives at <span className="font-mono text-xs">{pathname}</span>.{' '}
        <a href="/directory" className="link">
          Go to the directory
        </a>
        .
      </p>
    </main>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/directory" element={<Directory />} />
      <Route path="/directory/:firmId" element={<Directory />} />
      <Route path="/calendar" element={<Calendar />} />
      <Route path="/templates" element={<Templates />} />

      <Route path="/browse" element={<Navigate to="/directory" replace />} />
      <Route path="/browse/:state" element={<Navigate to="/directory" replace />} />
      <Route path="/firm/:id" element={<FirmRedirect />} />

      {flags.accounts && (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </>
      )}
      {flags.tracker && <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />}
      {flags.paid && <Route path="/pricing" element={<Pricing />} />}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  const routes = <AppRoutes />;
  return (
    <BrowserRouter>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <NavBar />
      <div id="main">
        <Suspense fallback={null}>{flags.accounts ? <AuthProvider>{routes}</AuthProvider> : routes}</Suspense>
      </div>
      <Footer />
    </BrowserRouter>
  );
}
