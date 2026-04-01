import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import './Navbar.css';

const navItems = [
  { to: '/today',    label: 'Today'        },
  { to: '/weekly',   label: 'Weekly Stats' },
  { to: '/total',    label: 'Total Stats'  },
  { to: '/strength', label: 'Strength'     },
  { to: '/settings', label: 'Settings'     },
];

const PAGE_TITLES = {
  '/today':    'Today',
  '/weekly':   'Weekly Stats',
  '/total':    'Total Stats',
  '/strength': 'Strength',
  '/settings': 'Settings',
};

export default function Navbar() {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Fitness Tracker';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="navbar-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          <span />
          <span />
          <span />
        </button>
        <span className="navbar-page-title">{pageTitle}</span>
      </div>

      <div className="navbar-right">
        <span className="navbar-date">{today}</span>
        <div className="navbar-phase-badge">
          <span className="navbar-phase-dot" />
          Phase 1 — Lean Bulk
        </div>
      </div>

      {menuOpen && (
        <>
          <div className="navbar-overlay" onClick={() => setMenuOpen(false)} />
          <nav className="navbar-dropdown">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => 'navbar-dropdown-link' + (isActive ? ' active' : '')}
              >
                {({ isActive }) => <span>{isActive ? '> ' : '  '}{label}</span>}
              </NavLink>
            ))}
            <div className="navbar-dropdown-footer">
              <button className="navbar-dropdown-btn" onClick={() => setDark(d => !d)}>
                {dark ? '[light mode]' : '[dark mode]'}
              </button>
              <button className="navbar-dropdown-btn" onClick={logout}>
                [logout]
              </button>
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
