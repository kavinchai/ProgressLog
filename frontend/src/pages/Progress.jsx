import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import Strength from './Strength';
import Cardio from './Cardio';

export default function Progress() {
  return (
    <div>
      <nav className="page-tabs" aria-label="Progress views">
        <NavLink
          to="/progress/strength"
          className={({ isActive }) => 'page-tab' + (isActive ? ' page-tab-active' : '')}
        >
          Strength
        </NavLink>
        <NavLink
          to="/progress/cardio"
          className={({ isActive }) => 'page-tab' + (isActive ? ' page-tab-active' : '')}
        >
          Cardio
        </NavLink>
      </nav>

      <Routes>
        <Route index element={<Navigate to="strength" replace />} />
        <Route path="strength" element={<Strength />} />
        <Route path="cardio" element={<Cardio />} />
        <Route path="*" element={<Navigate to="strength" replace />} />
      </Routes>
    </div>
  );
}
