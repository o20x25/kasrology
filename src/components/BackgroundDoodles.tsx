import { useLocation } from 'react-router-dom';

export default function BackgroundDoodles() {
  const location = useLocation();
  const isQuizPage = location.pathname.startsWith('/quiz');

  // Adjust opacity for quiz pages (softer 5-8%) vs standard pages (10-15%)
  const opacityClass = isQuizPage 
    ? 'opacity-5 dark:opacity-10' 
    : 'opacity-12 dark:opacity-18';

  return (
    <div 
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden transition-opacity duration-500 ${opacityClass}`} 
      aria-hidden="true"
      id="site-background-doodles"
    >
      {/* Stethoscope - Top Left */}
      <div className="absolute top-12 left-6 sm:left-16 text-teal-600 dark:text-teal-400 animate-float-slow" style={{ animationDuration: '7s' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.8 2.3A.3.3 0 0 0 5 2h4a1 1 0 0 1 1 1v7a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V3a1 1 0 0 1 1-1h1.2a.3.3 0 0 1 .3.3v.7a1 1 0 0 0 2 0v-.7z"></path>
          <path d="M5 13a6 6 0 0 0 6 6h2a6 6 0 0 0 6-6"></path>
          <circle cx="13" cy="19" r="2"></circle>
        </svg>
      </div>

      {/* DNA Helix - Top Right */}
      <div className="absolute top-16 right-6 sm:right-20 text-teal-600 dark:text-teal-400 animate-float-delayed" style={{ animationDuration: '9s' }}>
        <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 15c6.67 0 6.67-6 13-6"></path>
          <path d="M2 9c6.67 0 6.67 6 13 6"></path>
          <path d="M9 12h6"></path>
          <path d="M5 6l2 2"></path>
          <path d="M17 16l2 2"></path>
          <path d="M5 18l2-2"></path>
          <path d="M17 8l2-2"></path>
        </svg>
      </div>

      {/* ECG Heartbeat Line - Mid Left */}
      <div className="hidden md:block absolute top-1/3 left-4 text-teal-600 dark:text-teal-400 animate-float-slow" style={{ animationDuration: '6s' }}>
        <svg width="85" height="36" viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M0 20 h25 l5 -12 l10 24 l8 -20 l6 16 l6 -8 h25" />
        </svg>
      </div>

      {/* Chemical Flask - Mid Right */}
      <div className="hidden md:block absolute top-1/2 right-8 text-teal-600 dark:text-teal-400 animate-float-delayed" style={{ animationDuration: '8s' }}>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 3h6v4l4 11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2l4-11V3z"></path>
          <path d="M6.5 14h11"></path>
          <circle cx="10" cy="18" r="1" fill="currentColor"></circle>
          <circle cx="14" cy="17" r="0.8" fill="currentColor"></circle>
        </svg>
      </div>

      {/* Open Book - Lower Left */}
      <div className="absolute bottom-24 left-10 sm:left-28 text-teal-600 dark:text-teal-400 animate-float-slow" style={{ animationDuration: '7.5s' }}>
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"></path>
          <path d="M12 6v12"></path>
        </svg>
      </div>

      {/* Kasr Al-Ainy Architectural Dome / Column - Lower Right */}
      <div className="absolute bottom-20 right-10 sm:right-24 text-teal-600 dark:text-teal-400 animate-float-delayed" style={{ animationDuration: '8.5s' }}>
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18"></path>
          <path d="M5 21v-8a7 7 0 0 1 14 0v8"></path>
          <path d="M12 3v2"></path>
          <path d="M10 5h4"></path>
          <path d="M9 13h6"></path>
        </svg>
      </div>
    </div>
  );
}
