import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useTheme from '../../hooks/useTheme';
import './Navbar.css';

const navItems = [
  { to: '/today',    label: 'Today'        },
  { to: '/weekly',   label: 'Weekly Stats' },
  { to: '/total',    label: 'Total Stats'  },
  { to: '/strength', label: 'Strength'     },
  { to: '/settings', label: 'Settings'     },
];

export default function Navbar() {
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useTheme();

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="navbar-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          <span />
          <span />
          <span />
        </button>
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
