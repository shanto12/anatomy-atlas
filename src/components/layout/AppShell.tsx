import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, Search, X } from 'lucide-react';

import SearchDialog from '@/components/search/SearchDialog';

const NAV = [
  { to: '/explore', label: 'Explore' },
  { to: '/systems', label: 'Systems' },
  { to: '/learn', label: 'Learn' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/glossary', label: 'Glossary' },
];

export default function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="shell-header">
        <div className="container shell-header__inner">
          <Link to="/" className="brand" aria-label="Anatomy Atlas home">
            <span className="brand__mark" aria-hidden="true">
              <svg viewBox="0 0 40 40" width="34" height="34">
                <circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
                <path
                  d="M20 5c-4.4 4.8-6.4 9.3-6.4 15S15.6 30.2 20 35c4.4-4.8 6.4-9.3 6.4-15S24.4 9.8 20 5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <circle cx="20" cy="20" r="3" fill="var(--oxblood)" />
              </svg>
            </span>
            <span className="brand__word">
              Anatomy <em>Atlas</em>
            </span>
          </Link>

          <nav className="shell-nav" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `shell-nav__link${isActive ? ' is-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="shell-actions">
            <button
              type="button"
              className="shell-search"
              onClick={() => setSearchOpen(true)}
              aria-label="Search the atlas"
            >
              <Search size={16} aria-hidden="true" />
              <span>Search</span>
              <kbd>⌘K</kbd>
            </button>
            <button
              type="button"
              className="shell-menu"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="shell-mobile">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} className="shell-mobile__link">
                {item.label}
              </NavLink>
            ))}
            <NavLink to="/about" className="shell-mobile__link">
              About
            </NavLink>
          </div>
        ) : null}
      </header>

      <main id="main">
        <Outlet />
      </main>

      <footer className="shell-footer">
        <div className="container shell-footer__inner">
          <div>
            <p className="brand__word" style={{ fontSize: '1.35rem' }}>
              Anatomy <em>Atlas</em>
            </p>
            <p className="small" style={{ marginTop: 8, maxWidth: 380 }}>
              A free, interactive atlas of the human body. Built for the curious.
            </p>
          </div>
          <div className="shell-footer__cols">
            <div>
              <p className="caps">Explore</p>
              <Link to="/explore">Body explorer</Link>
              <Link to="/systems">Body systems</Link>
              <Link to="/glossary">Glossary</Link>
            </div>
            <div>
              <p className="caps">Learn</p>
              <Link to="/learn">Guided lessons</Link>
              <Link to="/quiz">Quizzes</Link>
              <Link to="/about">About & sources</Link>
            </div>
          </div>
        </div>
        <div className="container shell-footer__legal">
          <p className="small">
            Educational content only — not medical advice. © {new Date().getFullYear()} Anatomy Atlas.
          </p>
          <a className="small" href="https://github.com/shanto12/anatomy-atlas" target="_blank" rel="noreferrer">
            View source on GitHub
          </a>
        </div>
      </footer>

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
