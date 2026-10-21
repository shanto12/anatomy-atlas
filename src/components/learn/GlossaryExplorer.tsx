import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, X } from 'lucide-react';

import Highlight from '@/components/learn/Highlight';
import { systemsById } from '@/data';
import type { GlossaryTerm } from '@/lib/types';
import { glossaryTermAnchor, normalizeSearchText, tokenizeQuery } from '@/lib/search';

export interface GlossaryExplorerProps {
  terms: GlossaryTerm[];
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function firstLetter(term: GlossaryTerm): string {
  const letter = term.term.trim().charAt(0).toUpperCase();
  return /[A-Z]/.test(letter) ? letter : '#';
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * A–Z glossary with search, topic filters and a letter rail. Entries can be
 * linked to directly by anchor, and related terms are buttons that pivot the
 * whole explorer to that word.
 */
export default function GlossaryExplorer({ terms }: GlossaryExplorerProps) {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [letter, setLetter] = useState('all');
  const [flashAnchor, setFlashAnchor] = useState<string | null>(null);

  const sortedTerms = useMemo(
    () => [...terms].sort((a, b) => a.term.localeCompare(b.term, undefined, { sensitivity: 'base' })),
    [terms],
  );

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const term of sortedTerms) {
      if (!term.category) continue;
      counts.set(term.category, (counts.get(term.category) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [sortedTerms]);

  const letterCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const term of sortedTerms) {
      const key = firstLetter(term);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [sortedTerms]);

  const tokens = useMemo(() => tokenizeQuery(query), [query]);

  const filtered = useMemo(() => {
    return sortedTerms.filter((term) => {
      if (letter !== 'all' && firstLetter(term) !== letter) return false;
      if (category !== 'all' && term.category !== category) return false;
      if (tokens.length > 0) {
        const haystack = normalizeSearchText(
          [term.term, term.definition, term.category, ...(term.related ?? [])].join(' '),
        );
        if (!tokens.every((token) => haystack.includes(token))) return false;
      }
      return true;
    });
  }, [sortedTerms, letter, category, tokens]);

  const groups = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>();
    for (const term of filtered) {
      const key = firstLetter(term);
      const bucket = map.get(key);
      if (bucket) bucket.push(term);
      else map.set(key, [term]);
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === '#') return 1;
      if (b[0] === '#') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [filtered]);

  // Deep links from search: /glossary#alveolus highlights and scrolls to the term.
  useEffect(() => {
    if (!location.hash) return;
    const slug = decodeURIComponent(location.hash.slice(1));
    const target = sortedTerms.find((term) => glossaryTermAnchor(term) === slug);
    if (!target) return;

    setQuery('');
    setCategory('all');
    setLetter(firstLetter(target));
    setFlashAnchor(slug);

    const scrollTimer = window.setTimeout(() => {
      document.getElementById(`glossary-${slug}`)?.scrollIntoView({
        block: 'center',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }, 80);
    const clearTimer = window.setTimeout(() => setFlashAnchor(null), 2600);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearTimer);
    };
  }, [location.hash, sortedTerms]);

  const filtersActive = query.trim().length > 0 || category !== 'all' || letter !== 'all';

  function clearFilters() {
    setQuery('');
    setCategory('all');
    setLetter('all');
  }

  function focusRelated(term: string) {
    setQuery(term);
    setCategory('all');
    setLetter('all');
  }

  return (
    <div className="glossary-explorer">
      <div className="glossary-explorer__tools">
        <div className="glossary-explorer__search-field">
          <label htmlFor="glossary-search" className="glossary-explorer__label">
            Search the glossary
          </label>
          <div className="glossary-explorer__search">
            <Search size={17} aria-hidden="true" className="glossary-explorer__search-icon" />
            <input
              id="glossary-search"
              type="search"
              className="glossary-search"
              placeholder="Try “alveolus” or “reflex”"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setLetter('all');
              }}
              autoComplete="off"
            />
            {query ? (
              <button
                type="button"
                className="glossary-explorer__clear"
                onClick={() => setQuery('')}
                aria-label="Clear glossary search"
              >
                <X size={16} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        {categories.length > 0 ? (
          <div className="glossary-explorer__categories" role="group" aria-label="Filter by topic">
            <button
              type="button"
              className={`filter-chip${category === 'all' ? ' is-active' : ''}`}
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
            >
              All topics ({sortedTerms.length})
            </button>
            {categories.map(([name, count]) => (
              <button
                key={name}
                type="button"
                className={`filter-chip${category === name ? ' is-active' : ''}`}
                aria-pressed={category === name}
                onClick={() => setCategory(category === name ? 'all' : name)}
              >
                {name} ({count})
              </button>
            ))}
          </div>
        ) : null}

        <nav className="glossary-explorer__alphabet" aria-label="Jump to a letter">
          <button
            type="button"
            className={`glossary-letter-button glossary-letter-button--all${letter === 'all' ? ' is-active' : ''}`}
            aria-pressed={letter === 'all'}
            onClick={() => setLetter('all')}
          >
            All
          </button>
          {ALPHABET.map((character) => {
            const count = letterCounts.get(character) ?? 0;
            const isActive = letter === character;
            return (
              <button
                key={character}
                type="button"
                className={`glossary-letter-button${isActive ? ' is-active' : ''}`}
                aria-pressed={isActive}
                aria-label={`${character} — ${count} ${count === 1 ? 'term' : 'terms'}`}
                disabled={count === 0}
                onClick={() => setLetter(isActive ? 'all' : character)}
              >
                {character}
              </button>
            );
          })}
          {letterCounts.has('#') ? (
            <button
              type="button"
              className={`glossary-letter-button${letter === '#' ? ' is-active' : ''}`}
              aria-pressed={letter === '#'}
              aria-label={`Other — ${letterCounts.get('#')} terms`}
              onClick={() => setLetter(letter === '#' ? 'all' : '#')}
            >
              #
            </button>
          ) : null}
        </nav>
      </div>

      <div className="glossary-explorer__status">
        <p className="small" aria-live="polite">
          {filtered.length === sortedTerms.length
            ? `${filtered.length} ${filtered.length === 1 ? 'term' : 'terms'}`
            : `${filtered.length} of ${sortedTerms.length} terms`}
          {letter !== 'all' ? ` · letter ${letter}` : ''}
          {category !== 'all' ? ` · ${category}` : ''}
        </p>
        {filtersActive ? (
          <button type="button" className="glossary-explorer__reset" onClick={clearFilters}>
            Clear filters
          </button>
        ) : null}
      </div>

      {sortedTerms.length === 0 ? (
        <div className="glossary-explorer__empty">
          <h2 className="h3">The glossary is being written.</h2>
          <p className="lede">
            Every term is being checked against a reliable anatomy source before it lands here. The lessons and organ
            entries are a good place to start while this fills in.
          </p>
          <div className="glossary-explorer__empty-actions">
            <Link className="btn btn--primary" to="/learn">
              Browse lessons
            </Link>
            <Link className="btn btn--ghost" to="/systems">
              Explore systems
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glossary-explorer__empty">
          <h2 className="h3">No terms match that combination.</h2>
          <p className="lede">Try a shorter word, a different topic, or clear the filters to see the whole glossary.</p>
          <button type="button" className="btn btn--primary" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="glossary-explorer__letters">
          {groups.map(([groupLetter, groupTerms]) => (
            <section
              key={groupLetter}
              className="glossary-group"
              aria-labelledby={`glossary-group-${groupLetter}`}
            >
              <h2 id={`glossary-group-${groupLetter}`} className="glossary-group__heading">
                {groupLetter}
              </h2>
              <div className="glossary-list">
                {groupTerms.map((term) => {
                  const slug = glossaryTermAnchor(term);
                  const system = term.systemId ? systemsById[term.systemId] : undefined;
                  return (
                    <article
                      key={slug}
                      id={`glossary-${slug}`}
                      className={`glossary-entry${flashAnchor === slug ? ' is-flash' : ''}`}
                    >
                      <header className="glossary-entry__head">
                        <h3 className="glossary-entry__term">
                          <Highlight text={term.term} query={query} />
                        </h3>
                        <div className="glossary-entry__tags">
                          {term.category ? <span className="glossary-entry__category">{term.category}</span> : null}
                          {system ? (
                            <Link to={`/systems/${system.id}`} className="glossary-entry__system">
                              {system.shortName}
                            </Link>
                          ) : null}
                        </div>
                      </header>
                      <p className="glossary-entry__definition">
                        <Highlight text={term.definition} query={query} />
                      </p>
                      {term.related && term.related.length > 0 ? (
                        <div className="glossary-entry__related">
                          <span className="caps">Related</span>
                          <ul>
                            {term.related.map((relatedTerm) => (
                              <li key={relatedTerm}>
                                <button
                                  type="button"
                                  className="glossary-related__link"
                                  onClick={() => focusRelated(relatedTerm)}
                                >
                                  {relatedTerm}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
