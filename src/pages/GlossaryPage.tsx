import { useMemo, useState } from 'react';

import { glossary } from '@/data';
import { usePageMeta } from '@/lib/seo';

export default function GlossaryPage() {
  const [query, setQuery] = useState('');
  usePageMeta({
    title: 'Anatomy Glossary',
    description: 'Plain-English definitions of the terms used across the human body atlas.',
    path: '/glossary',
  });

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return glossary;
    return glossary.filter((term) => term.term.toLowerCase().includes(q) || term.definition.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="container container--narrow section">
      <p className="eyebrow">Glossary</p>
      <h1 className="h1" style={{ marginTop: 16 }}>
        The words of anatomy
      </h1>
      <p className="lede" style={{ marginTop: 20 }}>
        From abduction to zygote — the vocabulary you need to read the body.
      </p>
      <input
        type="search"
        className="glossary-search"
        placeholder="Search terms…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Search glossary"
        style={{ marginTop: 32 }}
      />
      <dl className="glossary-list" style={{ marginTop: 32 }}>
        {results.map((term) => (
          <div key={term.term} className="glossary-entry">
            <dt>{term.term}</dt>
            <dd>{term.definition}</dd>
          </div>
        ))}
      </dl>
      {results.length === 0 ? <p className="small">No terms yet — the glossary is being written.</p> : null}
    </div>
  );
}
