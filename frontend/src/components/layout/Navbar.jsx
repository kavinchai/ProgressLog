import { useLocation } from 'react-router-dom';
import './Navbar.css';

const PAGE_TITLES = {
  '/dashboard':  'Dashboard',
  '/nutrition':  'Nutrition',
  '/workouts':   'Workouts',
  '/strength':   'Strength',
  '/goals':      'Goals',
  '/milestones': 'Milestones',
};

export default function Navbar() {
  const location = useLocation();
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Fitness Tracker';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    year:    'numeric',
  });

  return (
    <header className="navbar">
      <div className="navbar-left">
        <span className="navbar-page-title">{pageTitle}</span>
      </div>

      <div className="navbar-right">
        <span className="navbar-date">{today}</span>
        <div className="navbar-phase-badge">
          <span className="navbar-phase-dot" />
          Phase 1 — Lean Bulk
        </div>
      </div>
    </header>
  );
}
