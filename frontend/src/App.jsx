import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import SplashPage from './pages/SplashPage';
import Leaderboard from './pages/Leaderboard';
import Login from './pages/Login';
import Today from './pages/Today';
import History from './pages/History';
import Progress from './pages/Progress';
import Templates from './pages/Templates';
import Settings from './pages/Settings';
import ClaudeSetup from './pages/ClaudeSetup';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  return null;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <Navbar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const authenticated = useAuthStore((state) => state.authenticated);

  if (!authenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/"        element={<Leaderboard />} />
          <Route path="/splash"  element={<SplashPage />} />
          <Route path="/login"   element={<Login />} />
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppLayout>
        <Routes>
          <Route path="/"       element={<Navigate to="/today" replace />} />
          <Route path="/today"     element={<Today />} />
          <Route path="/history/*" element={<History />} />
          <Route path="/progress/*" element={<Progress />} />
          <Route path="/weekly"    element={<Navigate to="/history/weekly" replace />} />
          <Route path="/total"     element={<Navigate to="/history/total" replace />} />
          <Route path="/strength"  element={<Navigate to="/progress/strength" replace />} />
          <Route path="/cardio"    element={<Navigate to="/progress/cardio" replace />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/settings"     element={<Settings />} />
          <Route path="/claude-setup" element={<ClaudeSetup />} />
          <Route path="*"             element={<Navigate to="/today" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
