import { useState } from 'react';
import api from '../api';
import useAuthStore from '../store/authStore';
import './Login.css';

export default function Login() {
  const login = useAuthStore((state) => state.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.token, res.data.username);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-top-border">
          {'_'.repeat(28)}
        </div>

        <div className="login-inner">
          <div className="login-title">| FITTRACK |</div>
          <div className="login-divider">{'|' + '-'.repeat(26) + '|'}</div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="login-error">! {error}</div>
            )}

            <div className="login-field">
              <label htmlFor="username">username:</label>
              <input
                id="username"
                type="text"
                className="login-input"
                placeholder="kavin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">password:</label>
              <input
                id="password"
                type="password"
                className="login-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? '| logging in... |' : '|   Log In   |'}
            </button>
          </form>

          <div className="login-hint">
            default: kavin / password
          </div>
        </div>

        <div className="login-bottom-border">
          {'_'.repeat(28)}
        </div>

      </div>
    </div>
  );
}
