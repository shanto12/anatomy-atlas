import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Compass,
  ExternalLink,
  Info,
  MapPin,
  Printer,
  Quote,
  Ruler,
  ScanLine,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import OrganCard from '@/components/ui/OrganCard';
import Prose, { excerpt } from '@/components/ui/Prose';
import Reveal from '@/components/ui/Reveal';
import SectionHeading from '@/components/ui/SectionHeading';
import SystemIcon from '@/components/ui/SystemIcon';
import ViewerStage from '@/components/ui/ViewerStage';
import { getOrgan, getRelatedOrgans, getSystemForOrgan, regions } from '@/data';
import { useProgress } from '@/lib/progress';
import { usePageMeta } from '@/lib/seo';
import { BODY_REGIONS, type Organ } from '@/lib/types';
import NotFoundPage from '@/pages/NotFoundPage';

interface ContentsItem {
  id: string;
  label: string;
}

export default function OrganPage() {
  const { organId } = useParams();
  const organ = getOrgan(organId);
  const system = organ ? getSystemForOrgan(organ) : undefined;

  const { markOrganExplored, toggleBookmark, isBookmarked } = useProgress();
  const [focusSignal, setFocusSignal] = useState(1);

  usePageMeta({
    title: organ ? `${organ.name} — ${system?.name ?? 'Human anatomy'}` : 'Organ not found',
    description: organ
      ? excerpt(organ.summary, 155)
      : 'Explore the organs and structures of the human body.',
    path: `/organs/${organId ?? ''}`,
    type: 'article',
    noindex: !organ,
  });

  const organKey = organ?.id;
  useEffect(() => {
    if (!organKey) return;
    markOrganExplored(organKey);
    setFocusSignal((value) => value + 1);
  }, [organKey, markOrganExplored]);

  const relatedOrgans = useMemo<Organ[]>(() => (organ ? getRelatedOrgans(organ) : []), [organ]);

  if (!organ) return <NotFoundPage />;

  const bookmarked = isBookmarked(organ.id);
  const region =
    regions.find((candidate) => candidate.id === organ.region) ??
    BODY_REGIONS.find((candidate) => candidate.id === organ.region);
  const regionName = region?.name ?? organ.region.replace('-', ' ');
  const regionTagline = 'tagline' in (region ?? {}) ? (region as { tagline?: string }).tagline : undefined;
  const siblings = system?.organs ?? [];
  const position = siblings.findIndex((candidate) => candidate.id === organ.id);
  const previousOrgan = position > 0 ? siblings[position - 1] : undefined;
  const nextOrgan = position >= 0 && position < siblings.length - 1 ? siblings[position + 1] : undefined;

  const contents: ContentsItem[] = [
    { id: 'organ-overview', label: 'Overview' },
    ...(organ.functions.length ? [{ id: 'organ-functions', label: 'What it does' }] : []),
    ...(organ.facts.length ? [{ id: 'organ-facts', label: 'Field notes' }] : []),
    ...(organ.conditions.length ? [{ id: 'organ-conditions', label: 'When it goes wrong' }] : []),
    ...(relatedOrgans.length ? [{ id: 'organ-related', label: 'Related organs' }] : []),
    ...(organ.sources.length ? [{ id: 'organ-sources', label: 'Sources' }] : []),
  ];

  const specimen: { icon: LucideIcon; term: string; value: string }[] = [
    { icon: MapPin, term: 'Location', value: organ.location },
    { icon: Ruler, term: 'Size', value: organ.size },
    { icon: ScanLine, term: 'Region', value: regionName },
  ];

  return (
    <article className="organ-page" style={{ ['--sys' as string]: system?.color ?? 'var(--gold)' }}>
      <div className="container">
        <Breadcrumbs
          items={[
            { label: 'Home', to: '/' },
            { label: 'Systems', to: '/systems' },
            ...(system ? [{ label: system.name, to: `/systems/${system.id}` }] : []),
            { label: organ.name },
          ]}
        />

        <header className="organ-hero">
          <div className="organ-hero__copy">
            {system ? (
              <Link to={`/systems/${system.id}`} className="organ-hero__system">
                <SystemIcon systemId={system.id} size={16} />
                <span>{system.name}</span>
                <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            ) : (
              <p className="eyebrow">Human anatomy</p>
            )}

            <h1 className="organ-hero__title">{organ.name}</h1>

            {organ.latin || organ.alsoKnownAs?.length ? (
              <p className="organ-hero__epithet">
                {organ.latin ? <em>{organ.latin}</em> : null}
                {organ.latin && organ.alsoKnownAs?.length ? <span className="organ-hero__dot">·</span> : null}
                {organ.alsoKnownAs?.length ? (
                  <span className="organ-hero__aka">also called {organ.alsoKnownAs.join(', ')}</span>
                ) : null}
              </p>
            ) : null}

            <p className="lede organ-hero__lede">{organ.tagline}</p>

            <div className="organ-hero__actions">
              <Button to={`/explore?organ=${organ.id}`} iconLeft={<Compass size={16} />}>
                Open in 3D
              </Button>
              <Button
                variant={bookmarked ? 'oxblood' : 'ghost'}
                onClick={() => toggleBookmark(organ.id)}
                aria-pressed={bookmarked}
                iconLeft={
                  bookmarked ? (
                    <BookmarkCheck size={16} aria-hidden="true" />
                  ) : (
                    <Bookmark size={16} aria-hidden="true" />
                  )
                }
              >
                {bookmarked ? 'Saved' : 'Save entry'}
              </Button>
              <Button
                variant="quiet"
                onClick={() => window.print()}
                iconLeft={<Printer size={15} aria-hidden="true" />}
                aria-label="Print this organ entry"
              >
                Print
              </Button>
            </div>

            {organ.heroStat ? (
              <div className="organ-hero__stat">
                <span className="organ-hero__stat-value num">{organ.heroStat.value}</span>
                <span className="organ-hero__stat-label">{organ.heroStat.label}</span>
              </div>
            ) : null}
          </div>

          <div className="organ-hero__stage">
            <ViewerStage
              variant="organ"
              selectedOrganId={organ.id}
              focusOrganId={organ.id}
              focusSignal={focusSignal}
              autoRotate
              interactive
              controls
              resetKey={organ.id}
              showLabels={false}
              plate={{
                eyebrow: `Specimen · ${regionName}`,
                title: organ.name,
                meta: organ.latin ? `Latin: ${organ.latin}` : system?.shortName,
              }}
              topRight={
                <span className="live">
                  <span className="live__dot" aria-hidden="true" />
                  Focused
                </span>
              }
              caption="Drag to orbit · structure highlighted"
              actions={
                <Button
                  to={`/explore?organ=${organ.id}`}
                  variant="on-dark"
                  size="sm"
                  iconRight={<ArrowUpRight size={14} />}
                >
                  Full explorer
                </Button>
              }
            />
          </div>
        </header>

        <dl className="organ-specimen-strip">
          {specimen.map(({ icon: Icon, term, value }) => (
            <div key={term} className="organ-specimen-strip__item">
              <dt>
                <Icon size={14} aria-hidden="true" />
                {term}
              </dt>
              <dd>{value}</dd>
            </div>
          ))}
          <div className="organ-specimen-strip__item">
            <dt>
              <SystemIcon systemId={organ.systemId} size={14} />
              System
            </dt>
            <dd>{system?.name ?? 'Anatomy'}</dd>
          </div>
        </dl>

        {regionTagline ? <p className="organ-region-note">{regionTagline}</p> : null}
      </div>

      <div className="container organ-layout">
        <div className="organ-main">
          <Reveal>
            <section id="organ-overview" className="organ-block" aria-labelledby="organ-overview-title">
              <SectionHeading
                id="organ-overview-title"
                eyebrow="The specimen"
                title={
                  <>
                    What <em className="accent-serif">it is</em>.
                  </>
                }
                rule
              />
              <Prose text={organ.summary} className="organ-prose" />
            </section>
          </Reveal>

          {organ.functions.length ? (
            <Reveal>
              <section id="organ-functions" className="organ-block" aria-labelledby="organ-functions-title">
                <SectionHeading
                  id="organ-functions-title"
                  eyebrow="Function"
                  title="What it does."
                  lede="The work this structure performs, in plain language."
                  rule
                />
                <ol className="organ-functions">
                  {organ.functions.map((fn, index) => (
                    <li key={fn.title} className="organ-functions__item">
                      <span className="organ-functions__num" aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="organ-functions__body">
                        <h3 className="organ-functions__title">{fn.title}</h3>
                        <p className="organ-functions__detail">{fn.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </Reveal>
          ) : null}

          {organ.facts.length ? (
            <Reveal>
              <section id="organ-facts" className="organ-block" aria-labelledby="organ-facts-title">
                <SectionHeading
                  id="organ-facts-title"
                  eyebrow="Field notes"
                  title={
                    <>
                      Three things worth <em className="accent-serif">remembering</em>.
                    </>
                  }
                  lede="Accurate, surprising details about this structure."
                  rule
                />
                <ul className="organ-facts">
                  {organ.facts.map((fact, index) => (
                    <li key={fact} className="organ-fact">
                      <span className="organ-fact__quote" aria-hidden="true">
                        <Quote size={18} />
                      </span>
                      <p className="organ-fact__text">{fact}</p>
                      <span className="organ-fact__index" aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          ) : null}

          {organ.conditions.length ? (
            <Reveal>
              <section id="organ-conditions" className="organ-block" aria-labelledby="organ-conditions-title">
                <SectionHeading
                  id="organ-conditions-title"
                  eyebrow="When it goes wrong"
                  title="Common conditions."
                  lede="Educational descriptions only — never diagnosis or treatment advice."
                  rule
                />
                <div className="condition-note">
                  <Info size={16} aria-hidden="true" />
                  <p>
                    These descriptions are for learning. They are not medical advice and cannot tell you what is
                    happening in your own body. If something concerns you, speak with a qualified clinician.
                  </p>
                </div>
                <ul className="condition-list">
                  {organ.conditions.map((condition) => (
                    <li key={condition.name} className="condition-card">
                      <TriangleAlert size={16} aria-hidden="true" />
                      <div>
                        <h3 className="condition-card__title">{condition.name}</h3>
                        <p className="condition-card__copy">{condition.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          ) : null}

          {relatedOrgans.length ? (
            <Reveal>
              <section id="organ-related" className="organ-block" aria-labelledby="organ-related-title">
                <SectionHeading
                  id="organ-related-title"
                  eyebrow="Connections"
                  title="Related organs."
                  lede={
                    system
                      ? `Structures that share work with the ${organ.name.toLowerCase()} — inside this system and beyond it.`
                      : 'Structures that share work with this organ.'
                  }
                  rule
                />
                <div className="organ-grid">
                  {relatedOrgans.map((related) => (
                    <OrganCard key={related.id} organ={related} showSystem />
                  ))}
                </div>
              </section>
            </Reveal>
          ) : null}

          <Reveal>
            <section id="organ-sources" className="organ-block organ-sources" aria-labelledby="organ-sources-title">
              <SectionHeading
                id="organ-sources-title"
                eyebrow="Sources"
                title="Where this came from."
                lede="This entry is written from authoritative public references. Read them yourself."
                rule
              />
              {organ.sources.length ? (
                <ul className="source-list source-list--boxed">
                  {organ.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        <span className="source-list__label">{source.label}</span>
                        <span className="source-list__url">{prettyHost(source.url)}</span>
                        <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  size="sm"
                  title="References are being compiled."
                  description="Sources for this entry will be listed once the content is finalized."
                />
              )}
              <p className="organ-sources__note">
                Educational content only — not medical advice. Anatomy Atlas does not diagnose or treat any condition.
              </p>
            </section>
          </Reveal>

          <nav className="organ-pager" aria-label="Organ navigation">
            {previousOrgan ? (
              <Link to={`/organs/${previousOrgan.id}`} className="pager-link pager-link--prev">
                <span className="pager-link__kicker">
                  <ArrowLeft size={14} aria-hidden="true" /> Previous structure
                </span>
                <span className="pager-link__title">{previousOrgan.name}</span>
              </Link>
            ) : (
              <span />
            )}
            {system ? (
              <Link to={`/systems/${system.id}`} className="pager-index">
                All {system.shortName} structures
              </Link>
            ) : (
              <Link to="/systems" className="pager-index">
                All systems
              </Link>
            )}
            {nextOrgan ? (
              <Link to={`/organs/${nextOrgan.id}`} className="pager-link pager-link--next">
                <span className="pager-link__kicker">
                  Next structure <ArrowRight size={14} aria-hidden="true" />
                </span>
                <span className="pager-link__title">{nextOrgan.name}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </div>

        <aside className="organ-aside" aria-label="Entry details">
          {contents.length > 2 ? (
            <nav className="contents-card" aria-label="In this entry">
              <p className="contents-card__title">In this entry</p>
              <ol className="contents-card__list">
                {contents.map((item, index) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`}>
                      <span className="contents-card__num" aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}

          <div className="aside-card">
            <p className="eyebrow eyebrow--plain">Specimen data</p>
            <dl className="data-list">
              {organ.latin ? (
                <div>
                  <dt>Latin</dt>
                  <dd className="serif italic">{organ.latin}</dd>
                </div>
              ) : null}
              <div>
                <dt>System</dt>
                <dd>{system?.name ?? '—'}</dd>
              </div>
              <div>
                <dt>Region</dt>
                <dd>{regionName}</dd>
              </div>
              {organ.alsoKnownAs?.length ? (
                <div>
                  <dt>Also known as</dt>
                  <dd>{organ.alsoKnownAs.join(', ')}</dd>
                </div>
              ) : null}
              <div>
                <dt>Size</dt>
                <dd>{organ.size}</dd>
              </div>
            </dl>
            {organ.keywords.length ? (
              <div className="aside-badges">
                {organ.keywords.map((keyword) => (
                  <Badge key={keyword} tone="outline">
                    {keyword}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>

          <div className="aside-card aside-card--accent">
            <p className="eyebrow eyebrow--plain">Keep looking</p>
            <h3 className="aside-card__title">See it in the body.</h3>
            <p className="aside-card__copy">
              The explorer isolates this structure on a rotatable model. The lesson places it in context.
            </p>
            <Button to={`/explore?organ=${organ.id}`} block iconRight={<ArrowUpRight size={15} />}>
              Open in 3D explorer
            </Button>
            {system ? (
              <Button to={`/learn/${system.lesson.id}`} variant="ghost" block iconLeft={<BookOpen size={15} />}>
                {system.shortName} lesson
              </Button>
            ) : null}
            <Button to="/systems" variant="quiet" size="sm">
              Browse all systems
            </Button>
          </div>
        </aside>
      </div>
    </article>
  );
}

function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
