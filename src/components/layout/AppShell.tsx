import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ArrowUp, Github, Menu, Search, X } from 'lucide-react';
import clsx from 'clsx';

import SearchDialog from '@/components/search/SearchDialog';

const NAV = [
  { to: '/explore', label: 'Explore' },
  { to: '/systems', label: 'Systems' },
  { to: '/learn', label: 'Learn' },
  { to: '/quiz', label: 'Quiz' },
  { to: '/glossary', label: 'Glossary' },
];

function Brand({ className }: { className?: string }) {
  return (
    <Link to="/" className={clsx('brand', className)} aria-label="Anatomy Atlas home">
      <span className="brand__mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" width="34" height="34" focusable="false">
          <circle cx="20" cy="20" r="18.2" fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.5" />
          <path
            d="M20 5.4c-4.4 4.8-6.4 9.2-6.4 14.8s2 10 6.4 14.4c4.4-4.4 6.4-8.8 6.4-14.4S24.4 10.2 20 5.4Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path d="M14.6 15.6h10.8M14.6 24.4h10.8" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
          <circle cx="20" cy="20" r="2.8" fill="var(--oxblood)" />
        </svg>
      </span>
      <span className="brand__word">
        Anatomy <em>Atlas</em>
      </span>
    </Link>
  );
}

export default function AppShell() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [progress, setProgress] = useState(0);

  const location = useLocation();
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);
  const frame = useRef(0);

  // Close overlays and return to the top of the page when the route changes.
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // ⌘K / Ctrl-K opens search from anywhere in the atlas.
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

  // Pages deep in the shell can ask for search without knowing about its state.
  useEffect(() => {
    function onOpenSearch() {
      setSearchOpen(true);
    }
    window.addEventListener('atlas:open-search', onOpenSearch);
    return () => window.removeEventListener('atlas:open-search', onOpenSearch);
  }, []);

  // Reading progress line + condensed header + back-to-top visibility.
  useEffect(() => {
    function measure() {
      frame.current = 0;
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const next = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      setProgress((prev) => (Math.abs(prev - next) > 0.004 ? next : prev));
      setScrolled(y > 6);
      setShowTop(y > 900);
    }
    function onScroll() {
      if (frame.current) return;
      frame.current = window.requestAnimationFrame(measure);
    }
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame.current) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  // Mobile menu: lock the page, move focus in, close on Escape and restore focus.
  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => {
      menuPanelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    }, 30);
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  function openSearch() {
    setMobileOpen(false);
    setSearchOpen(true);
  }

  function scrollToTop() {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className={clsx('shell-header', scrolled && 'is-scrolled')}>
        <div className="container shell-header__inner">
          <Brand />

          <nav className="shell-nav" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => clsx('shell-nav__link', isActive && 'is-active')}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="shell-actions">
            <button
              type="button"
              className="shell-search"
              onClick={openSearch}
              aria-keyshortcuts="Meta+K Control+K"
            >
              <Search size={16} aria-hidden="true" />
              <span className="shell-search__label" aria-hidden="true">
                Search
              </span>
              <span className="visually-hidden">Search the atlas</span>
              <kbd aria-hidden="true">⌘K</kbd>
            </button>
            <button
              ref={menuButtonRef}
              type="button"
              className="shell-menu"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileOpen((value) => !value)}
            >
              {mobileOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="shell-mobile" id="mobile-nav" ref={menuPanelRef}>
            <nav className="shell-mobile__nav" aria-label="Mobile">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => clsx('shell-mobile__link', isActive && 'is-active')}
                >
                  <span>{item.label}</span>
                  <span className="shell-mobile__rule" aria-hidden="true" />
                </NavLink>
              ))}
              <NavLink
                to="/about"
                className={({ isActive }) => clsx('shell-mobile__link', isActive && 'is-active')}
              >
                <span>About &amp; sources</span>
                <span className="shell-mobile__rule" aria-hidden="true" />
              </NavLink>
            </nav>
            <div className="shell-mobile__foot">
              <button type="button" className="shell-mobile__search" onClick={openSearch}>
                <Search size={16} aria-hidden="true" />
                Search the atlas
              </button>
              <p className="shell-mobile__note">A free field guide to the human body.</p>
            </div>
          </div>
        ) : null}

        <span className="shell-progress" aria-hidden="true">
          <span className="shell-progress__fill" style={{ transform: `scaleX(${progress})` }} />
        </span>
      </header>

      <main id="main">
        <div className="page" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <footer className="shell-footer">
        <div className="container shell-footer__top">
          <div className="shell-footer__brand">
            <Brand />
            <p className="shell-footer__mission">
              A free, three-dimensional field guide to the human body — written to be understood, built to be explored.
            </p>
            <p className="shell-footer__note">Educational content only. Not medical advice.</p>
          </div>

          <div className="shell-footer__nav">
            <nav aria-label="Explore" className="shell-footer__col">
              <p className="caps">Explore</p>
              <Link to="/explore">Body explorer</Link>
              <Link to="/systems">Systems index</Link>
              <Link to="/glossary">Glossary</Link>
            </nav>
            <nav aria-label="Learn" className="shell-footer__col">
              <p className="caps">Learn</p>
              <Link to="/learn">Guided lessons</Link>
              <Link to="/quiz">Quizzes</Link>
              <Link to="/about">About &amp; sources</Link>
            </nav>
            <nav aria-label="Elsewhere" className="shell-footer__col">
              <p className="caps">Elsewhere</p>
              <a href="https://github.com/shanto12/anatomy-atlas" target="_blank" rel="noreferrer">
                <Github size={13} aria-hidden="true" /> Source on GitHub
              </a>
              <a
                href="https://medlineplus.gov/"
                target="_blank"
                rel="noreferrer"
                title="MedlinePlus, U.S. National Library of Medicine"
              >
                Reference libraries
              </a>
              <Link to="/about#disclaimer">Disclaimer</Link>
            </nav>
          </div>
        </div>

        <div className="container shell-footer__legal">
          <p className="small">© {new Date().getFullYear()} Anatomy Atlas. Made for the curious.</p>
          <p className="small">
            Illustrated in code with React, Three.js &amp; Fraunces. No accounts, no tracking, no ads.
          </p>
        </div>

        <div className="shell-footer__wordmark" aria-hidden="true">
          Anatomy Atlas
        </div>
      </footer>

      {showTop ? (
        <button type="button" className="scroll-top" onClick={scrollToTop} aria-label="Back to top">
          <ArrowUp size={18} aria-hidden="true" />
        </button>
      ) : null}

      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
