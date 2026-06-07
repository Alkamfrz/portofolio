import React, { useState, useEffect } from 'react';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [pathname, setPathname] = useState('');

  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  const getActiveClass = (path) => {
    if (path === '/') {
      return pathname === '/' ? 'nav-link active' : 'nav-link';
    }
    return pathname.startsWith(path) ? 'nav-link active' : 'nav-link';
  };

  return (
    <header className="header">
      <div className="nav-container">
        <a href="/" className="logo" id="logo-link">
          <span className="text-gradient">Alkamfrz</span>
        </a>

        {/* Hamburger Menu Button */}
        <button
          id="hamburger"
          className={`hamburger ${isOpen ? 'open' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
        >
          <span className="hamburger-box">
            <span className="hamburger-inner"></span>
          </span>
        </button>

        {/* Navigation Links */}
        <nav id="nav-links" className={`nav-links ${isOpen ? 'show' : ''}`}>
          <a id="nav-home" href="/" className={getActiveClass('/')}>Home</a>
          <a id="nav-projects" href="/projects" className={getActiveClass('/projects')}>Projects</a>
          <a id="nav-blog" href="/blog" className={getActiveClass('/blog')}>Blog</a>
        </nav>
      </div>
    </header>
  );
}
