import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import './Sidebar.css';

const navItems = [
  { to: '/today',  label: 'Today'        },
  { to: '/weekly', label: 'Weekly Stats' },
  { to: '/total',  label: 'Total Stats'  },
];

export default function Sidebar() {
  const username = useAuthStore((state) => state.username);
  const logout   = useAuthStore((state) => state.logout);
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span>[ FITTRACK ]</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            {({ isActive }) => (
              <span>{isActive ? '> ' : '  '}{label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-darkmode" onClick={() => setDark((d) => !d)}>
          {dark ? '[light mode]' : '[dark mode]'}
        </button>
        <div className="sidebar-user">
          <span className="muted">{username ?? 'user'}</span>
        </div>
        <button className="btn btn-sm sidebar-logout" onClick={logout}>
          [logout]
        </button>
      </div>
    </aside>
  );
}
