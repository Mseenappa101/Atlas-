import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { flags } from './lib/flags';
import Footer from './components/Footer';
import Home from './pages/Home';
import Calendar from './pages/Calendar';
import Templates from './pages/Templates';
import SignIn from './pages/SignIn';
import ResetPassword from './pages/ResetPassword';
import Resume from './pages/Resume';
import LetterNew from './pages/LetterNew';
import Documents from './pages/Documents';
import { SessionProvider } from './context/SessionContext';
import { MyListProvider } from './context/MyListProvider';
import { AccessProvider } from './context/AccessProvider';
import AppNav from './components/app/AppNav';
import Explore from './pages/Explore';
import FirmPage from './pages/FirmPage';
import Pro from './pages/Pro';
import MyList from './pages/MyList';
import Apply from './pages/Apply';
import Account from './pages/Account';
import { Disclaimer, Privacy, Terms } from './pages/Legal';
import Join from './pages/Join';
import Sprint from './pages/Sprint';
import Membership from './pages/Membership';
import Placement from './pages/Placement';
import Workshop from './pages/Workshop';
import Families from './pages/Families';
import About from './pages/About';
import { ThanksCall, ThanksSignup, ThanksSprint } from './pages/Thanks';
import FoundingBanner from './components/FoundingBanner';
import { MarketPage, TypePage } from './pages/SeoList';

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
    <div className="app min-h-[60vh]">
      <div className="mx-auto max-w-app px-4 py-16 md:px-6">
        <h1 className="text-t24 font-bold tracking-tight">Page not found</h1>
        <p className="mt-2 text-t16 text-fg-2">
          Nothing lives at <span className="data text-t14">{pathname}</span>.{' '}
          <a href="/explore" className="font-medium text-brand hover:underline">
            Go to Explore
          </a>
          .
        </p>
      </div>
    </div>
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
      <Route path="/apply/:slug" element={<Apply />} />
      <Route path="/account" element={<Account />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/disclaimer" element={<Disclaimer />} />
      <Route path="/signup" element={<Join />} />
      <Route path="/sprint" element={<Sprint />} />
      <Route path="/membership" element={<Membership />} />
      <Route path="/placement" element={<Placement />} />
      <Route path="/workshop" element={<Workshop />} />
      <Route path="/families" element={<Families />} />
      <Route path="/about" element={<About />} />
      <Route path="/thanks/signup" element={<ThanksSignup />} />
      <Route path="/thanks/sprint" element={<ThanksSprint />} />
      <Route path="/thanks/call" element={<ThanksCall />} />
      <Route path="/markets/:slug" element={<MarketPage />} />
      <Route path="/types/:slug" element={<TypePage />} />
      <Route path="/directory" element={<Navigate to="/explore" replace />} />
      <Route path="/directory/:firmId" element={<Navigate to="/explore" replace />} />
      <Route path="/calendar" element={<Calendar />} />
      <Route path="/templates" element={<Templates />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/resume" element={<Resume />} />
      <Route path="/letters/new" element={<LetterNew />} />
      <Route path="/documents" element={<Documents />} />
      <Route path="/login" element={<Navigate to="/signin" replace />} />

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
      {/* /pro is unlisted (kept for existing subscribers); the pricing URL points at the ladder, not Pro. */}
      <Route path="/pricing" element={<Navigate to="/" replace />} />

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
      <AccessProvider>
      <MyListProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-app focus:bg-card focus:px-3 focus:py-2 focus:text-t14">
        Skip to content
      </a>
      <FoundingBanner />
      <AppNav />
      <div id="main">
        <Suspense fallback={null}>{flags.accounts ? <AuthProvider>{routes}</AuthProvider> : routes}</Suspense>
      </div>
      <Footer />
      </MyListProvider>
      </AccessProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}
