import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { flags } from './lib/flags';
import Footer from './components/Footer';
import Home from './pages/Home';
import Calendar from './pages/Calendar';
import Templates from './pages/Templates';
import SignIn from './pages/SignIn';
import Resume from './pages/Resume';
import LetterNew from './pages/LetterNew';
import Documents from './pages/Documents';
import { SessionProvider } from './context/SessionContext';
import { MyListProvider } from './context/MyListProvider';
import AppNav from './components/app/AppNav';
import Explore from './pages/Explore';
import FirmPage from './pages/FirmPage';
import Pro from './pages/Pro';
import MyList from './pages/MyList';

// Pre-pivot features. Loaded only when their flag is on, so they stay out of the public bundle.
const AuthProvider = lazy(() => import('./context/AuthContext').then((m) => ({ default: m.AuthProvider })));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Settings = lazy(() => import('./pages/Settings'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));
const ComponentsGallery = import.meta.env.DEV ? lazy(() => import('./pages/dev/Components')) : null;

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
      <Route path="/explore" element={<Explore />} />
      <Route path="/firms/:slug" element={<FirmPage />} />
      <Route path="/pro" element={<Pro />} />
      <Route path="/my-list" element={<MyList />} />
      <Route path="/directory" element={<Navigate to="/explore" replace />} />
      <Route path="/directory/:firmId" element={<Navigate to="/explore" replace />} />
      <Route path="/calendar" element={<Calendar />} />
      <Route path="/templates" element={<Templates />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/resume" element={<Resume />} />
      <Route path="/letters/new" element={<LetterNew />} />
      <Route path="/documents" element={<Documents />} />
      <Route path="/login" element={<Navigate to="/signin" replace />} />
      <Route path="/signup" element={<Navigate to="/" replace />} />

      <Route path="/browse" element={<Navigate to="/explore" replace />} />
      <Route path="/browse/:state" element={<Navigate to="/explore" replace />} />
      <Route path="/firm/:id" element={<Navigate to="/explore" replace />} />

      {flags.accounts && (
        <>
          <Route path="/legacy/login" element={<Login />} />
          <Route path="/legacy/signup" element={<Signup />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        </>
      )}
      {flags.tracker && <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />}
      <Route path="/pricing" element={<Navigate to="/pro" replace />} />

      {import.meta.env.DEV && <Route path="/dev/components" element={<ComponentsGallery />} />}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  const routes = <AppRoutes />;
  return (
    <BrowserRouter>
      <SessionProvider>
      <MyListProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:bg-surface focus:px-3 focus:py-2">
        Skip to content
      </a>
      <AppNav />
      <div id="main">
        <Suspense fallback={null}>{flags.accounts ? <AuthProvider>{routes}</AuthProvider> : routes}</Suspense>
      </div>
      <Footer />
      </MyListProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}
