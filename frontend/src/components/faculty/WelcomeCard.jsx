import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export const WelcomeCard = ({ facultyName, designation, department }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute greeting based on time of day
  const hours = currentTime.getHours();
  let greetingTime = 'Good morning';
  if (hours >= 12 && hours < 17) greetingTime = 'Good afternoon';
  else if (hours >= 17) greetingTime = 'Good evening';

  // Strictly 12-hour format e.g. "5:56 PM"
  const formattedTime12h = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const formattedDay = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
  const formattedDate = currentTime.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric'
  });

  const displayName = facultyName ? facultyName.split(' ')[0] : 'Faculty';

  return (
    <section className="fp-welcome-card" aria-label="Faculty Welcome & Time Overview">
      <div className="fp-welcome-left">
        <h1 className="fp-welcome-greeting">
          {greetingTime}, {displayName} 👋
        </h1>
        <p className="fp-welcome-subtitle">
          Here's your academic schedule for today.
        </p>
        <div className="fp-welcome-dept-pill">
          <span className="fp-welcome-dept-dot"></span>
          <span>{department || 'Computer Science Department'}</span>
          <span>•</span>
          <span>{designation || 'Faculty Member'}</span>
        </div>
      </div>

      <div className="fp-today-compact-box">
        <div className="fp-today-badge">TODAY</div>
        <div className="fp-today-day">{formattedDay}</div>
        <div className="fp-today-date">{formattedDate}</div>
        <div className="fp-today-clock-tag">
          <Clock size={14} />
          <span>{formattedTime12h}</span>
        </div>
      </div>
    </section>
  );
};

export default WelcomeCard;
