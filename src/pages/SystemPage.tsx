import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ExternalLink,
  ListChecks,
  Timer,
} from 'lucide-react';

import Badge from '@/components/ui/Badge';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import OrganCard from '@/components/ui/OrganCard';
import Prose, { excerpt } from '@/components/ui/Prose';
import Reveal from '@/components/ui/Reveal';
import SectionHeading from '@/components/ui/SectionHeading';
import { Stat, StatGroup } from '@/components/ui/Stat';
import SystemIcon from '@/components/ui/SystemIcon';
import ViewerStage from '@/components/ui/ViewerStage';
import { getSystem, systems } from '@/data';
import { usePageMeta } from '@/lib/seo';
import NotFoundPage from '@/pages/NotFoundPage';

export default function SystemPage() {
  const { systemId } = useParams();
  const system = getSystem(systemId);

  usePageMeta({
    title: system ? system.name : 'System not found',
    description: system
      ? `${system.tagline} ${excerpt(system.summary, 120)}`
      : 'Explore the systems of the human body.',
    path: `/systems/${systemId ?? ''}`,
    noindex: !system,
  });

  if (!system) return <NotFoundPage />;

  const index = systems.findIndex((candidate) => candidate.id === system.id);
  const count = systems.length;
  const previous = count > 1 ? systems[(index - 1 + count) % count] : undefined;
  const next = count > 1 ? systems[(index + 1) % count] : undefined;
  const relatedSystems = systems
    .filter((candidate) => candidate.id !== system.id)
    .slice(index % Math.max(1, count - 1))
    .concat(systems.filter((candidate) => candidate.id !== system.id))
    .filter((candidate, position, list) => list.findIndex((other) => other.id === candidate.id) === position)
    .slice(0, 4);

  const sources = Array.from(
    new Map(system.organs.flatMap((organ) => organ.sources).map((source) => [source.url, source])).values(),
  );

  return (
    <article className="system-page" style={{ ['--sys' as string]: system.color }}>
      <div className="container">
        <Breadcrumbs
          items={[{ label: 'Home', to: '/' }, { label: 'Systems', to: '/systems' }, { label: system.name }]}
        />

        <header className="system-hero">
          <div className="system-hero__copy">
            <p className="eyebrow">
              System {String(index + 1).padStart(2, '0')} of {String(count || 12).padStart(2, '0')} ·{' '}
              {system.shortName}
            </p>
            <div className="system-hero__title-row">
              <span className="system-hero__icon" aria-hidden="true">
                <SystemIcon systemId={system.id} size={32} />
              </span>
              <h1 className="system-hero__title">{system.name}</h1>
            </div>
            <p className="lede system-hero__lede">{system.tagline}</p>
            <div className="cluster system-hero__actions">
              <Button to={`/learn/${system.lesson.id}`} iconLeft={<BookOpen size={16} />}>
                Start the lesson
              </Button>
              <Button to={`/quiz/${system.id}`} variant="ghost" iconLeft={<ListChecks size={16} />}>
                Take the quiz
              </Button>
            </div>
            <ul className="system-hero__meta">
              <li>
                <span className="system-hero__meta-value num">{system.organs.length}</span>
                <span>structures</span>
              </li>
              <li>
                <span className="system-hero__meta-value num">{system.lesson.steps.length}</span>
                <span>lesson steps</span>
              </li>
              <li>
                <span className="system-hero__meta-value num">{system.quiz.length}</span>
                <span>quiz questions</span>
              </li>
            </ul>
          </div>

          <div className="system-hero__stage">
            <ViewerStage
              variant="system"
              activeSystems={[system.id]}
              autoRotate
              interactive
              controls
              showLabels={false}
              resetKey={system.id}
              plate={{
                eyebrow: `Fig. 02 · System ${String(index + 1).padStart(2, '0')}`,
                title: system.shortName,
                meta: `${system.organs.length} structures illuminated`,
              }}
              caption="Drag to orbit · select an organ"
              actions={
                <Button
                  to={`/explore?system=${system.id}`}
                  variant="on-dark"
                  size="sm"
                  iconRight={<ArrowUpRight size={14} />}
                >
                  Open in explorer
                </Button>
              }
            />
          </div>
        </header>
      </div>

      <section className="container system-statline" aria-label={`${system.name} statistics`}>
        <StatGroup divided columns={3}>
          {system.stats.map((stat) => (
            <Stat key={stat.label} value={stat.value} label={stat.label} />
          ))}
        </StatGroup>
      </section>

      <div className="container system-layout">
        <div className="system-main">
          <Reveal>
            <section className="system-block" aria-labelledby="system-overview-title">
              <SectionHeading
                id="system-overview-title"
                eyebrow="Overview"
                title={
                  <>
                    How this system <em className="accent-serif">works</em>.
                  </>
                }
                rule
              />
              <Prose text={system.summary} />
            </section>
          </Reveal>

          <Reveal>
            <section className="system-block" aria-labelledby="system-functions-title">
              <SectionHeading
                id="system-functions-title"
                eyebrow="What it does"
                title="Its work, in order."
                lede="Four to six jobs this system performs, in plain language."
                rule
              />
              <ol className="function-index">
                {system.functions.map((job, jobIndex) => (
                  <li key={job} className="function-index__item">
                    <span className="function-index__num" aria-hidden="true">
                      {String(jobIndex + 1).padStart(2, '0')}
                    </span>
                    <p className="function-index__text">{job}</p>
                  </li>
                ))}
              </ol>
            </section>
          </Reveal>

          <Reveal>
            <section className="system-block" aria-labelledby="system-structures-title">
              <SectionHeading
                id="system-structures-title"
                eyebrow="Structures"
                title="Meet the parts."
                lede={`${system.organs.length} named structures carry this system's work. Each has its own illustrated entry.`}
                rule
              />
              {system.organs.length ? (
                <div className="organ-grid">
                  {system.organs.map((organ, organIndex) => (
                    <OrganCard key={organ.id} organ={organ} index={organIndex + 1} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Structure entries are being written."
                  description="This system's organ entries are still in the workshop. The system overview and lesson are ready."
                  action={<Button to={`/learn/${system.lesson.id}`}>Start the lesson</Button>}
                />
              )}
            </section>
          </Reveal>

          <Reveal>
            <section className="system-block system-references" aria-labelledby="system-sources-title">
              <SectionHeading
                id="system-sources-title"
                eyebrow="References"
                title="Where this came from."
                lede="Every organ entry lists its own sources. These are the references used across this system."
                rule
              />
              {sources.length ? (
                <details className="sources-fold">
                  <summary>
                    <span>Show {sources.length} reference{sources.length === 1 ? '' : 's'}</span>
                    <span className="sources-fold__icon" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <ul className="source-list">
                    {sources.map((source) => (
                      <li key={source.url}>
                        <a href={source.url} target="_blank" rel="noreferrer">
                          <span>{source.label}</span>
                          <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : (
                <EmptyState
                  size="sm"
                  title="References are being compiled."
                  description="Sources for these entries will be listed once the content is finalized."
                />
              )}
            </section>
          </Reveal>
        </div>

        <aside className="system-aside" aria-label="System shortcuts">
          <div className="aside-card aside-card--accent">
            <p className="eyebrow eyebrow--plain">Guided lesson</p>
            <h3 className="aside-card__title">{system.lesson.title}</h3>
            <p className="aside-card__copy">{system.lesson.subtitle}</p>
            <dl className="aside-meta">
              <div>
                <dt>
                  <Timer size={13} aria-hidden="true" /> Duration
                </dt>
                <dd>{system.lesson.durationMin} min</dd>
              </div>
              <div>
                <dt>Level</dt>
                <dd>{system.lesson.level}</dd>
              </div>
              <div>
                <dt>Steps</dt>
                <dd>{system.lesson.steps.length}</dd>
              </div>
            </dl>
            <Button to={`/learn/${system.lesson.id}`} block>
              Start the lesson
            </Button>
            <Button to={`/quiz/${system.id}`} variant="ghost" block>
              Test yourself
            </Button>
          </div>

          <div className="aside-card">
            <p className="eyebrow eyebrow--plain">Adjacent chapters</p>
            <h3 className="aside-card__title">Related systems</h3>
            <ul className="mini-systems">
              {relatedSystems.map((related) => (
                <li key={related.id} style={{ ['--sys' as string]: related.color }}>
                  <Link to={`/systems/${related.id}`}>
                    <span className="mini-systems__icon" aria-hidden="true">
                      <SystemIcon systemId={related.id} size={15} />
                    </span>
                    <span className="mini-systems__name">{related.name}</span>
                    <span className="mini-systems__count num">{related.organs.length}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Button to="/systems" variant="quiet" size="sm" iconRight={<ArrowUpRight size={14} />}>
              All systems
            </Button>
          </div>

          <div className="aside-card aside-card--quiet">
            <p className="eyebrow eyebrow--plain">Region</p>
            <h3 className="aside-card__title">Where it lives</h3>
            <div className="aside-badges">
              {Array.from(new Set(system.organs.map((organ) => organ.region))).map((region) => (
                <Badge key={region} tone="outline">
                  {region.replace('-', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {previous || next ? (
        <nav className="container system-pager" aria-label="System navigation">
          {previous ? (
            <Link to={`/systems/${previous.id}`} className="pager-link pager-link--prev">
              <span className="pager-link__kicker">
                <ArrowLeft size={14} aria-hidden="true" /> Previous system
              </span>
              <span className="pager-link__title">{previous.name}</span>
            </Link>
          ) : (
            <span />
          )}
          <Link to="/systems" className="pager-index">
            All systems
          </Link>
          {next ? (
            <Link to={`/systems/${next.id}`} className="pager-link pager-link--next">
              <span className="pager-link__kicker">
                Next system <ArrowRight size={14} aria-hidden="true" />
              </span>
              <span className="pager-link__title">{next.name}</span>
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </article>
  );
}
