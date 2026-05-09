import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import WeeklyStats from './WeeklyStats';
import TotalStats from './TotalStats';

export default function History() {
  return (
    <div>
      <nav className="page-tabs" aria-label="History views">
        <NavLink
          to="/history/weekly"
          className={({ isActive }) => 'page-tab' + (isActive ? ' page-tab-active' : '')}
        >
          Weekly
        </NavLink>
        <NavLink
          to="/history/total"
          className={({ isActive }) => 'page-tab' + (isActive ? ' page-tab-active' : '')}
        >
          Total
        </NavLink>
      </nav>

      <Routes>
        <Route index element={<Navigate to="weekly" replace />} />
        <Route path="weekly" element={<WeeklyStats />} />
        <Route path="total" element={<TotalStats />} />
        <Route path="*" element={<Navigate to="weekly" replace />} />
      </Routes>
    </div>
  );
}
