import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  CornerDownLeft,
  Heart,
  Layers,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react';

import Highlight from '@/components/learn/Highlight';
import {
  flattenSearchGroups,
  searchAtlas,
  SEARCH_SUGGESTIONS,
  type SearchKind,
  type SearchResultItem,
} from '@/lib/search';

export interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

const KIND_ICONS: Record<SearchKind, LucideIcon> = {
  organ: Heart,
  system: Layers,
  lesson: BookOpen,
  glossary: BookMarked,
};

const KIND_LABELS: Record<SearchKind, string> = {
  organ: 'Organ',
  system: 'System',
  lesson: 'Lesson',
  glossary: 'Glossary',
};

/**
 * Global search overlay.
 *
 * Contract: rendered once by AppShell, opens via `open`, closes via `onClose`.
 * ⌘K/Ctrl-K opening is AppShell's job; this component owns Escape, the backdrop,
 * focus trapping and keyboard navigation within the results.
 */
export default function SearchDialog({ open, onClose }: SearchDialogProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const groups = useMemo(() => (open ? searchAtlas(query) : []), [open, query]);
  const flat = useMemo(() => flattenSearchGroups(groups), [groups]);
  const flatIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    flat.forEach((item, index) => map.set(item.key, index));
    return map;
  }, [flat]);

  // Opening: reset, remember the opener, lock the page behind, focus the field.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery('');
    itemRefs.current = [];

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 20);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  // Escape closes from anywhere.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function choose(item: SearchResultItem) {
    onClose();
    navigate(item.to);
  }

  function focusItem(index: number) {
    const refs = itemRefs.current.filter((ref): ref is HTMLAnchorElement => Boolean(ref));
    if (refs.length === 0) return;
    const target = refs[Math.max(0, Math.min(refs.length - 1, index))];
    target?.focus();
    target?.scrollIntoView({ block: 'nearest' });
  }

  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0);
    if (focusables.length === 0) {
      event.preventDefault();
      inputRef.current?.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const current = document.activeElement;
    if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && (current === first || !panel.contains(current))) {
      event.preventDefault();
      last.focus();
    }
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      if (flat.length === 0) return;
      event.preventDefault();
      focusItem(0);
    } else if (event.key === 'ArrowUp') {
      if (flat.length === 0) return;
      event.preventDefault();
      focusItem(flat.length - 1);
    } else if (event.key === 'Enter') {
      if (flat.length === 0) return;
      event.preventDefault();
      choose(flat[0]);
    }
  }

  function onResultsKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowDown') {
      const refs = itemRefs.current.filter((ref): ref is HTMLAnchorElement => Boolean(ref));
      if (refs.length === 0) return;
      event.preventDefault();
      const currentIndex = refs.indexOf(document.activeElement as HTMLAnchorElement);
      focusItem((currentIndex + 1) % refs.length);
    } else if (event.key === 'ArrowUp') {
      const refs = itemRefs.current.filter((ref): ref is HTMLAnchorElement => Boolean(ref));
      if (refs.length === 0) return;
      event.preventDefault();
      const currentIndex = refs.indexOf(document.activeElement as HTMLAnchorElement);
      if (currentIndex <= 0) inputRef.current?.focus();
      else focusItem(currentIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === 'End') {
      const refs = itemRefs.current.filter((ref): ref is HTMLAnchorElement => Boolean(ref));
      if (refs.length === 0) return;
      event.preventDefault();
      focusItem(refs.length - 1);
    }
  }

  const trimmedQuery = query.trim();
  const hasResults = flat.length > 0;

  const dialog = (
    <div
      className="search-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search the atlas"
        onKeyDown={trapFocus}
      >
        <h2 className="visually-hidden">Search the atlas</h2>

        <div className="search-dialog__header">
          <Search size={20} aria-hidden="true" className="search-dialog__header-icon" />
          <input
            ref={inputRef}
            type="search"
            className="search-dialog__input"
            role="combobox"
            aria-label="Search the atlas"
            aria-expanded={hasResults}
            aria-controls="search-results"
            aria-autocomplete="list"
            placeholder="Search organs, systems, lessons, glossary…"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
          />
          <button type="button" className="search-dialog__close" onClick={onClose} aria-label="Close search">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div
          className="search-dialog__body"
          id="search-results"
          aria-label="Search results"
          onKeyDown={onResultsKeyDown}
        >
          {trimmedQuery ? (
            hasResults ? (
              groups.map((group) => {
                const Icon = KIND_ICONS[group.kind];
                return (
                  <section
                    key={group.kind}
                    className="search-dialog__group"
                    aria-labelledby={`search-group-${group.kind}`}
                  >
                    <h3 id={`search-group-${group.kind}`} className="search-dialog__group-title">
                      <Icon size={14} aria-hidden="true" />
                      {group.label}
                      <span className="search-dialog__group-count">{group.items.length}</span>
                    </h3>
                    <ul className="search-dialog__list">
                      {group.items.map((item) => {
                        const flatIndex = flatIndexByKey.get(item.key) ?? 0;
                        return (
                          <li key={item.key}>
                            <a
                              ref={(element) => {
                                itemRefs.current[flatIndex] = element;
                              }}
                              href={item.to}
                              className="search-result"
                              onClick={(event) => {
                                event.preventDefault();
                                choose(item);
                              }}
                            >
                              <span className="search-result__icon" aria-hidden="true">
                                <Icon size={16} />
                              </span>
                              <span className="search-result__text">
                                <span className="search-result__title">
                                  <Highlight text={item.title} query={query} />
                                </span>
                                <span className="search-result__meta">
                                  {KIND_LABELS[item.kind]}
                                  {item.meta ? ` · ${item.meta}` : ''}
                                </span>
                                {item.snippet ? (
                                  <span className="search-result__snippet">
                                    <Highlight text={item.snippet} query={query} />
                                  </span>
                                ) : null}
                              </span>
                              <ArrowRight size={15} aria-hidden="true" className="search-result__arrow" />
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })
            ) : (
              <div className="search-dialog__empty">
                <p className="search-dialog__empty-title" role="status">
                  Nothing found for “{trimmedQuery}”.
                </p>
                <p className="small">
                  Try a shorter word, a system name like “nervous”, or one of these starting points.
                </p>
                <div className="search-dialog__suggestions">
                  {SEARCH_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="search-suggestion"
                      onClick={() => {
                        setQuery(suggestion);
                        inputRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="search-dialog__start">
              <p className="search-dialog__start-title">Search the whole atlas</p>
              <p className="small">Organs, body systems, guided lessons and the glossary all live here.</p>
              <div className="search-dialog__suggestions" aria-label="Suggested searches">
                {SEARCH_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="search-suggestion"
                    onClick={() => {
                      setQuery(suggestion);
                      inputRef.current?.focus();
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <div className="search-dialog__shortcuts">
                <Link to="/learn" className="search-dialog__shortcut" onClick={onClose}>
                  <BookOpen size={15} aria-hidden="true" />
                  Guided lessons
                </Link>
                <Link to="/quiz" className="search-dialog__shortcut" onClick={onClose}>
                  <CornerDownLeft size={15} aria-hidden="true" />
                  Quizzes
                </Link>
                <Link to="/glossary" className="search-dialog__shortcut" onClick={onClose}>
                  <BookMarked size={15} aria-hidden="true" />
                  Glossary
                </Link>
              </div>
            </div>
          )}
        </div>

        <p className="visually-hidden" aria-live="polite">
          {trimmedQuery ? `${flat.length} ${flat.length === 1 ? 'result' : 'results'}` : ''}
        </p>

        <div className="search-dialog__footer">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> to move
          </span>
          <span>
            <kbd>↵</kbd> to open
          </span>
          <span>
            <kbd>esc</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
