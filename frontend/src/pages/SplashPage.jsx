import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import motivations from '../data/motivations.json';
import './SplashPage.css';

const CYCLE_INTERVAL_MS = 4000;

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
    year:    'numeric',
  });
}

export default function SplashPage() {
  const [index,   setIndex]   = useState(() => Math.floor(Math.random() * motivations.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % motivations.length);
        setVisible(true);
      }, 400); // matches CSS fade-out duration
    }, CYCLE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="splash">
      <div className="splash-card">
        <span className="splash-logo">ProgressLog</span>

        <div className="splash-date">{formatDate()}</div>

        <h1 className="splash-headline">Today's your day.</h1>
        <p className={`splash-quote ${visible ? 'splash-quote--visible' : 'splash-quote--hidden'}`}>
          {motivations[index]}
        </p>

        <div className="splash-actions">
          <Link to="/login" className="btn-primary splash-btn">Sign In</Link>
          <Link to="/login?mode=signup" className="splash-link">Create Account</Link>
        </div>
      </div>
    </div>
  );
}
