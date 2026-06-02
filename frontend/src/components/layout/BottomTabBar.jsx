import { NavLink } from 'react-router-dom';
import './BottomTabBar.css';

const navItems = [
  { to: '/today',     label: 'Today',     icon: 'today' },
  { to: '/history',   label: 'History',   icon: 'history' },
  { to: '/progress',  label: 'Progress',  icon: 'progress' },
  { to: '/community', label: 'Community', icon: 'community' },
  { to: '/settings',  label: 'Settings',  icon: 'settings' },
];

// Inline stroke icons (no external dependency). 24×24, inherit currentColor.
const ICONS = {
  today: (
    <>
      <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </>
  ),
  history: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  progress: (
    <>
      <path d="M4 19h16" />
      <path d="M7 16v-4" />
      <path d="M12 16V7" />
      <path d="M17 16v-7" />
    </>
  ),
  community: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5" />
      <path d="M17.5 13.5A5.5 5.5 0 0 1 21 19" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.7 7.7 0 0 0 0-3l1.7-1.3-1.8-3.1-2 .8a7.6 7.6 0 0 0-2.6-1.5L14.3 2H9.7l-.4 2.1a7.6 7.6 0 0 0-2.6 1.5l-2-.8L2.9 7.9 4.6 9.2a7.7 7.7 0 0 0 0 3l-1.7 1.3 1.8 3.1 2-.8a7.6 7.6 0 0 0 2.6 1.5l.4 2.1h4.6l.4-2.1a7.6 7.6 0 0 0 2.6-1.5l2 .8 1.8-3.1z" />
    </>
  ),
};

function TabIcon({ name }) {
  return (
    <svg
      className="bottom-tab-icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

export default function BottomTabBar() {
  return (
    <nav className="bottom-tab-bar" aria-label="Primary">
      {navItems.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => 'bottom-tab-link' + (isActive ? ' active' : '')}
        >
          <TabIcon name={icon} />
          <span className="bottom-tab-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
