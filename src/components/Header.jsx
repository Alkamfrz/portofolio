import React, { useState, useEffect, useCallback } from 'react';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [pathname, setPathname] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [compact, setCompact] = useState(false);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    const overlay = document.getElementById('nav-overlay');
    if (overlay) overlay.classList.remove('show');
  }, []);

  useEffect(() => {
    setPathname(window.location.pathname);
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark !== false;
    setDarkMode(isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    const handleScroll = () => {
      const progressBar = document.getElementById('scroll-progress');
      if (progressBar) {
        const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
        progressBar.style.width = scrolled + '%';
      }
      // Header shrink
      setCompact(window.scrollY > 80);
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) closeMenu();
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeMenu]);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  const toggleMenu = () => {
    const next = !isOpen;
    setIsOpen(next);
    const overlay = document.getElementById('nav-overlay');
    if (overlay) {
      if (next) overlay.classList.add('show');
      else overlay.classList.remove('show');
    }
  };

  const getActiveClass = (path) => {
    if (path === '/') {
      return pathname === '/' ? 'nav-link active' : 'nav-link';
    }
    return pathname.startsWith(path) ? 'nav-link active' : 'nav-link';
  };

  return (
    <header className={`header${compact ? ' compact' : ''}`}>
      <div className="nav-container">
        <a href="/" className="logo" id="logo-link">
          <span className="text-gradient">Alkamfrz</span>
        </a>

        <nav id="nav-links" className={`nav-links ${isOpen ? 'show' : ''}`} role="navigation" aria-label="Main navigation">
          <a id="nav-home" href="/" className={getActiveClass('/')} aria-current={pathname === '/' ? 'page' : undefined} onClick={closeMenu}>Home</a>
          <a id="nav-projects" href="/projects/" className={getActiveClass('/projects')} aria-current={pathname.startsWith('/projects') ? 'page' : undefined} onClick={closeMenu}>Projects</a>
          <a id="nav-blog" href="/blog/" className={getActiveClass('/blog')} aria-current={pathname.startsWith('/blog') ? 'page' : undefined} onClick={closeMenu}>Blog</a>
        </nav>

        <div className="nav-actions">
          <button
            id="theme-toggle"
            className={`theme-toggle ${darkMode ? 'dark' : 'light'}`}
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <div className="slider-track">
              <span className="slider-icon sun-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              </span>
              <span className="slider-icon moon-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              </span>
              <div className="slider-thumb"></div>
            </div>
          </button>

          <button
            id="hamburger"
            className={`hamburger ${isOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
          >
            <span className="hamburger-box">
              <span className="hamburger-inner"></span>
            </span>
          </button>
        </div>
      </div>
      <div className="scroll-progress-container">
        <div className="scroll-progress-bar" id="scroll-progress"></div>
      </div>
    </header>
  );
}

