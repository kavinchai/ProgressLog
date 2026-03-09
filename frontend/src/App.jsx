import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Sidebar from './components/layout/Sidebar';
import Login from './pages/Login';
import Today from './pages/Today';
import WeeklyStats from './pages/WeeklyStats';

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
      <AppLayout>
        <Routes>
          <Route path="/"       element={<Navigate to="/today" replace />} />
          <Route path="/today"  element={<Today />} />
          <Route path="/weekly" element={<WeeklyStats />} />
          <Route path="*"       element={<Navigate to="/today" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
