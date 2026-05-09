import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useTheme from '../../hooks/useTheme';
import api from '../../api';
import './Sidebar.css';

const navItems = [
  { to: '/today',     label: 'Today' },
  { to: '/history',   label: 'History' },
  { to: '/progress',  label: 'Progress' },
  { to: '/templates', label: 'Templates' },
  { to: '/settings',  label: 'Settings' },
];

export default function Sidebar() {
  const username = useAuthStore((state) => state.username);
  const clearAuth = useAuthStore((state) => state.logout);
  const [dark, setDark] = useTheme();

  function logout() {
    api.post('/auth/logout').catch(() => {});
    clearAuth();
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        ProgressLog
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-darkmode" onClick={() => setDark((d) => !d)}>
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <div className="sidebar-user">
          <span className="muted">{username ?? 'user'}</span>
        </div>
        <button className="sidebar-logout" onClick={logout}>
          Log out
        </button>
      </div>
    </aside>
  );
}
