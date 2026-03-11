import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';
import Sidebar from './components/layout/Sidebar';
import Login from './pages/Login';
import Today from './pages/Today';
import WeeklyStats from './pages/WeeklyStats';
import TotalStats from './pages/TotalStats';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const token = useAuthStore((state) => state.token);

  if (!token) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<Login />} />
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
          <Route path="/today"  element={<Today />} />
          <Route path="/weekly" element={<WeeklyStats />} />
          <Route path="/total"  element={<TotalStats />} />
          <Route path="*"       element={<Navigate to="/today" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
