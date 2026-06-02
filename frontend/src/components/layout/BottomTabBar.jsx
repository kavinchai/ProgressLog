import { NavLink } from 'react-router-dom';
import { Home, History, TrendingUp, Users, Settings } from 'lucide-react';
import './BottomTabBar.css';

const navItems = [
  { to: '/today',     label: 'Today',     Icon: Home },
  { to: '/history',   label: 'History',   Icon: History },
  { to: '/progress',  label: 'Progress',  Icon: TrendingUp },
  { to: '/community', label: 'Community', Icon: Users },
  { to: '/settings',  label: 'Settings',  Icon: Settings },
];

export default function BottomTabBar() {
  return (
    <nav className="bottom-tab-bar" aria-label="Primary">
      {navItems.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => 'bottom-tab-link' + (isActive ? ' active' : '')}
        >
          <Icon className="bottom-tab-icon" size={22} strokeWidth={2} aria-hidden="true" />
          <span className="bottom-tab-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
