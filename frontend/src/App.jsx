import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';
import Sidebar from './components/layout/Sidebar';
import Navbar from './components/layout/Navbar';
import SplashPage from './pages/SplashPage';
import Login from './pages/Login';
import Today from './pages/Today';
import WeeklyStats from './pages/WeeklyStats';
import TotalStats from './pages/TotalStats';
import Strength from './pages/Strength';
import Cardio from './pages/Cardio';
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
          <Route path="/"      element={<SplashPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="*"      element={<Navigate to="/" replace />} />
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
          <Route path="/weekly"    element={<WeeklyStats />} />
          <Route path="/total"     element={<TotalStats />} />
          <Route path="/strength"  element={<Strength />} />
          <Route path="/cardio"    element={<Cardio />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/settings"     element={<Settings />} />
          <Route path="/claude-setup" element={<ClaudeSetup />} />
          <Route path="*"             element={<Navigate to="/today" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
