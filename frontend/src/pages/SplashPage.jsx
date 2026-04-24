import { Link } from 'react-router-dom';
import './SplashPage.css';

const MOTIVATIONS = [
  'Show up. Do the work. Repeat.',
  'Progress is earned one rep at a time.',
  'The only bad workout is the one that didn\'t happen.',
  'Consistency beats intensity every time.',
  'Every session counts. Make today one of them.',
  'Strong today. Stronger tomorrow.',
];

function getTodayQuote() {
  const day = new Date().getDay();
  return MOTIVATIONS[day % MOTIVATIONS.length];
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
    year:    'numeric',
  });
}

export default function SplashPage() {
  return (
    <div className="splash">
      <div className="splash-card">
        <span className="splash-logo">FitTrack</span>

        <div className="splash-date">{formatDate()}</div>

        <h1 className="splash-headline">Today's your day.</h1>
        <p className="splash-quote">{getTodayQuote()}</p>

        <div className="splash-actions">
          <Link to="/login" className="btn-primary splash-btn">Sign In</Link>
          <Link to="/login?mode=signup" className="splash-link">Create Account</Link>
        </div>
      </div>
    </div>
  );
}
