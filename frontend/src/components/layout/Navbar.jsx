import useAuthStore from '../../store/authStore';
import useTheme from '../../hooks/useTheme';
import api from '../../api';
import './Navbar.css';

// Mobile-only top bar: brand on the left, theme + logout on the right.
// Primary navigation lives in the BottomTabBar.
export default function Navbar() {
  const clearAuth = useAuthStore((state) => state.logout);
  const [dark, setDark] = useTheme();

  function logout() {
    api.post('/auth/logout').catch(() => {});
    clearAuth();
  }

  return (
    <header className="navbar">
      <span className="navbar-brand">ProgressLog</span>

      <div className="navbar-actions">
        <button
          className="navbar-action"
          onClick={() => setDark((d) => !d)}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? 'Light' : 'Dark'}
        </button>
        <button className="navbar-action" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}
