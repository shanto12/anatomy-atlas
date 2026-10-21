import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Compass, ListChecks, Search } from 'lucide-react';

import Button from '@/components/ui/Button';
import SystemIcon from '@/components/ui/SystemIcon';
import { systems } from '@/data';
import { usePageMeta } from '@/lib/seo';

const SUGGESTIONS = [
  { to: '/explore', label: 'The 3D body explorer', copy: 'Rotate the body and select any structure.' },
  { to: '/systems', label: 'The systems index', copy: 'Twelve chapters, from bone to breath.' },
  { to: '/learn', label: 'Guided lessons', copy: 'Short narrated tours of each system.' },
  { to: '/glossary', label: 'The glossary', copy: 'Plain-language definitions of anatomy terms.' },
];

export default function NotFoundPage() {
  usePageMeta({
    title: 'Page not found',
    description: 'This page could not be found. Return to the Anatomy Atlas body explorer.',
    path: '/404',
    noindex: true,
  });

  return (
    <div className="notfound">
      <div className="container notfound__inner">
        <div className="notfound__visual" aria-hidden="true">
          <span className="notfound__code">404</span>
          <span className="notfound__frame" />
          <span className="notfound__tick notfound__tick--tl" />
          <span className="notfound__tick notfound__tick--tr" />
          <span className="notfound__tick notfound__tick--bl" />
          <span className="notfound__tick notfound__tick--br" />
        </div>

        <div className="notfound__copy">
          <p className="eyebrow">Not in the atlas</p>
          <h1 className="notfound__title">
            This part has not been <em>charted</em>.
          </h1>
          <p className="lede notfound__lede">
            The page you followed does not exist — but the body is still here. Try one of the entrances below, or search
            the atlas by organ, system, lesson or term.
          </p>
          <div className="notfound__actions">
            <Button to="/explore" size="lg" iconLeft={<Compass size={17} />}>
              Open the body explorer
            </Button>
            <Button to="/" size="lg" variant="ghost">
              Back to the atlas
            </Button>
            <button
              type="button"
              className="btn btn--quiet btn--md"
              onClick={() => window.dispatchEvent(new Event('atlas:open-search'))}
            >
              <span className="btn__icon" aria-hidden="true">
                <Search size={15} />
              </span>
              <span className="btn__label">Search the atlas</span>
            </button>
          </div>

          <nav className="notfound__suggestions" aria-label="Suggested pages">
            {SUGGESTIONS.map((item) => (
              <Link key={item.to} to={item.to} className="notfound__suggestion">
                <span className="notfound__suggestion-label">{item.label}</span>
                <span className="notfound__suggestion-copy">{item.copy}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ))}
          </nav>

          {systems.length ? (
            <div className="notfound__systems">
              <p className="caps">Or open a system</p>
              <div className="notfound__chips">
                {systems.slice(0, 6).map((system) => (
                  <Link
                    key={system.id}
                    to={`/systems/${system.id}`}
                    className="notfound__chip"
                    style={{ ['--sys' as string]: system.color }}
                  >
                    <SystemIcon systemId={system.id} size={14} />
                    {system.shortName}
                  </Link>
                ))}
                <Link to="/systems" className="notfound__chip notfound__chip--all">
                  <ListChecks size={14} aria-hidden="true" />
                  All systems
                </Link>
              </div>
            </div>
          ) : null}

          <p className="notfound__foot">
            <BookOpen size={14} aria-hidden="true" />
            New here? Start with the{' '}
            <Link className="text-link" to="/learn">
              guided lessons
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
