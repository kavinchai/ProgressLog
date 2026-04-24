import { NavLink } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import useTheme from '../../hooks/useTheme';
import './Sidebar.css';

const navItems = [
  { to: '/today',     label: 'Today',        icon: '~' },
  { to: '/weekly',    label: 'Weekly Stats',  icon: '~' },
  { to: '/total',     label: 'Total Stats',   icon: '~' },
  { to: '/strength',  label: 'Strength',      icon: '~' },
  { to: '/templates', label: 'Templates',     icon: '~' },
  { to: '/settings',  label: 'Settings',      icon: '~' },
];

export default function Sidebar() {
  const username = useAuthStore((state) => state.username);
  const logout   = useAuthStore((state) => state.logout);
  const [dark, setDark] = useTheme();

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
