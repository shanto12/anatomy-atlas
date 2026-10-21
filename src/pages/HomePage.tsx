import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BookOpen, Compass, Sparkles } from 'lucide-react';

import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Prose from '@/components/ui/Prose';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import Reveal from '@/components/ui/Reveal';
import SectionHeading from '@/components/ui/SectionHeading';
import { Stat, StatGroup } from '@/components/ui/Stat';
import SystemCard from '@/components/ui/SystemCard';
import SystemIcon from '@/components/ui/SystemIcon';
import ViewerStage from '@/components/ui/ViewerStage';
import { facts, getOrgan, lessons, organs, organsById, siteStats, systems } from '@/data';
import { useProgress } from '@/lib/progress';
import { usePageMeta } from '@/lib/seo';
import type { Fact, Organ } from '@/lib/types';

/** A hand-picked set of landmarks; falls back to the first organs that exist. */
const FEATURED_ORGAN_IDS = ['heart', 'brain', 'lungs', 'liver', 'kidneys', 'eyes'];

export default function HomePage() {
  usePageMeta({
    title: 'Anatomy Atlas — Explore the Human Body in 3D',
    description:
      'A free interactive 3D atlas of the human body. Rotate, zoom, and explore every organ and body system, then learn with guided lessons and quizzes.',
    path: '/',
  });

  const { state, exploredCount } = useProgress();

  const featuredOrgans = useMemo<Organ[]>(() => {
    const picked = FEATURED_ORGAN_IDS.map((id) => getOrgan(id)).filter((organ): organ is Organ => Boolean(organ));
    if (picked.length >= 4) return picked;
    return organs.slice(0, 6);
  }, []);

  // Prefer the hand-written fact collection; fall back to organ fact lines so the
  // section still renders while supplementary content is being authored.
  const featuredFacts = useMemo<Fact[]>(() => {
    const authored = facts.filter((fact) => fact.text && (!fact.organId || organsById[fact.organId]));
    if (authored.length) return authored.slice(0, 4);
    return featuredOrgans
      .flatMap((organ) =>
        organ.facts.slice(0, 1).map((text, index) => ({
          id: `${organ.id}-fact-${index}`,
          text,
          organId: organ.id,
          systemId: organ.systemId,
        })),
      )
      .slice(0, 4);
  }, [featuredOrgans]);

  const featuredLessons = useMemo(() => {
    return lessons.slice(0, 3).map((lesson) => ({
      lesson,
      system: systems.find((system) => system.lesson.id === lesson.id),
    }));
  }, []);

  const lessonTotal = lessons.length || siteStats.lessonCount || 12;
  const organTotal = siteStats.organCount || organs.length;
  const quizTotal = siteStats.systemCount || systems.length || 12;
  const lessonsDone = state.completedLessons.length;
  const quizzesDone = Object.keys(state.quizBest).length;
  const explored = Math.min(exploredCount, organTotal || exploredCount);

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="home-hero" aria-labelledby="home-title">
        <div className="container home-hero__grid">
          <div className="home-hero__copy">
            <p className="eyebrow">Interactive anatomy · free forever</p>
            <h1 id="home-title" className="home-hero__title display">
              The human body,
              <br />
              <em>piece by piece</em>.
            </h1>
            <p className="lede home-hero__lede">
              A three-dimensional field guide to the systems that keep you alive. Turn the body in your hands, study
              one organ at a time, and follow the lessons that connect them.
            </p>
            <div className="home-hero__actions">
              <Button to="/explore" size="lg" iconRight={<ArrowRight size={17} />}>
                Explore the body
              </Button>
              <Button to="/learn" size="lg" variant="ghost" iconLeft={<BookOpen size={16} />}>
                Start a lesson
              </Button>
            </div>
            <StatGroup className="home-hero__stats" columns={4}>
              <Stat value={siteStats.systemCount || 12} label="Body systems" size="sm" />
              <Stat value={siteStats.organCount || organs.length || '—'} label="Structures" size="sm" />
              <Stat value={siteStats.lessonCount || lessons.length || 12} label="Guided lessons" size="sm" />
              <Stat value={siteStats.quizCount || '—'} label="Quiz questions" size="sm" />
            </StatGroup>
          </div>

          <div className="home-hero__stage">
            <ViewerStage
              variant="hero"
              autoRotate
              interactive
              controls
              showLabels={false}
              plate={{
                eyebrow: 'Fig. 01 · Anatomy theatre',
                title: 'The human body',
                meta: 'Rotatable model · all twelve systems',
              }}
              topRight={
                <span className="live">
                  <span className="live__dot" aria-hidden="true" />
                  Live model
                </span>
              }
              caption="Drag to orbit · scroll to zoom · select an organ"
              actions={
                <Button to="/explore" variant="on-dark" size="sm" iconRight={<ArrowUpRight size={14} />}>
                  Full explorer
                </Button>
              }
            />
            <p className="home-hero__caption">
              <span className="home-hero__caption-line" aria-hidden="true" />
              Ninety-odd structures, one body. No account required.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- systems */}
      <section className="section home-systems" aria-labelledby="home-systems-title">
        <div className="container">
          <Reveal>
            <SectionHeading
              id="home-systems-title"
              eyebrow="The atlas · twelve chapters"
              title="Twelve systems, one body."
              lede="Each system is a chapter. Begin with the overview, meet its structures, then test what stuck with a short quiz."
              action={{ to: '/systems', label: 'All systems' }}
            />
          </Reveal>
          {systems.length ? (
            <Reveal delay={60}>
              <div className="system-grid">
                {systems.map((system, index) => (
                  <SystemCard key={system.id} system={system} index={index + 1} />
                ))}
              </div>
            </Reveal>
          ) : (
            <EmptyState
              eyebrow="Content arriving"
              title="The systems index is being assembled."
              description="Each system entry is being written and fact-checked. In the meantime, the 3D explorer and guided lessons are ready."
              action={
                <Button to="/explore" variant="primary">
                  Open the explorer
                </Button>
              }
            />
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------ specimens */}
      <section className="section home-specimens" aria-labelledby="home-specimens-title">
        <div className="container">
          <Reveal>
            <SectionHeading
              id="home-specimens-title"
              eyebrow="Specimens · start here"
              title="Six structures worth knowing."
              lede="The heart, the brain, the lungs — entries written to be read, not skimmed. Every organ page carries its functions, its failures, and its sources."
              action={{ to: '/explore', label: 'Explore the body' }}
            />
          </Reveal>

          {featuredOrgans.length ? (
            <Reveal delay={60}>
              <ol className="specimen-list">
                {featuredOrgans.map((organ, index) => {
                  const system = systems.find((candidate) => candidate.id === organ.systemId);
                  return (
                    <li key={organ.id}>
                      <Link
                        to={`/organs/${organ.id}`}
                        className="specimen"
                        style={{ ['--sys' as string]: system?.color ?? 'var(--gold)' }}
                      >
                        <span className="specimen__index" aria-hidden="true">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="specimen__icon" aria-hidden="true">
                          <SystemIcon systemId={organ.systemId} size={22} />
                        </span>
                        <span className="specimen__body">
                          <span className="specimen__name">
                            {organ.name}
                            {organ.latin ? <em>{organ.latin}</em> : null}
                          </span>
                          <span className="specimen__tagline">{organ.tagline}</span>
                        </span>
                        <span className="specimen__meta">
                          {organ.heroStat ? (
                            <>
                              <strong className="num">{organ.heroStat.value}</strong>
                              <span>{organ.heroStat.label}</span>
                            </>
                          ) : (
                            <span>{system?.shortName ?? 'Anatomy'}</span>
                          )}
                        </span>
                        <span className="specimen__arrow" aria-hidden="true">
                          <ArrowUpRight size={18} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </Reveal>
          ) : (
            <EmptyState
              title="Organ entries are on their way."
              description="The anatomy entries are being written now. The 3D explorer already contains every structure."
              action={<Button to="/explore">Explore the body</Button>}
            />
          )}
        </div>
      </section>

      {/* ---------------------------------------------------------------- facts */}
      {featuredFacts.length ? (
        <section className="home-notes" aria-labelledby="home-notes-title">
          <div className="container">
            <Reveal>
              <SectionHeading
                id="home-notes-title"
                eyebrow="Field notes"
                title={
                  <>
                    Things the body does <em>quietly</em>.
                  </>
                }
                lede="Small, true observations gathered from the atlas. Each one links back to the structure that makes it happen."
                className="home-notes__head"
              />
            </Reveal>
            <Reveal delay={60}>
              <div className="field-grid">
                {featuredFacts.map((fact, index) => {
                  const organ = fact.organId ? getOrgan(fact.organId) : undefined;
                  const system = organ ? systems.find((candidate) => candidate.id === organ.systemId) : undefined;
                  return (
                    <figure key={fact.id} className="field-note">
                      <span className="field-note__index" aria-hidden="true">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <blockquote className="field-note__text">{fact.text}</blockquote>
                      {organ ? (
                        <figcaption className="field-note__cite">
                          <Link to={`/organs/${organ.id}`}>{organ.name}</Link>
                          {system ? <span> · {system.shortName}</span> : null}
                        </figcaption>
                      ) : null}
                    </figure>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------------- learning */}
      <section className="section home-learn-wrap" aria-labelledby="home-learn-title">
        <div className="container">
          <Reveal>
            <SectionHeading
              id="home-learn-title"
              eyebrow="Learn by doing"
              title="Read it. Then prove it."
              lede="Short, guided lessons walk you through each system. Quizzes check what stuck — and explain every answer, right or wrong."
              action={{ to: '/learn', label: 'All lessons' }}
            />
          </Reveal>

          <Reveal delay={60}>
            <div className="home-learn">
              <div className="home-learn__main">
                {featuredLessons.length ? (
                  <ol className="lesson-rows">
                    {featuredLessons.map(({ lesson, system }, index) => (
                      <li key={lesson.id}>
                        <Link
                          to={`/learn/${lesson.id}`}
                          className="lesson-row"
                          style={{ ['--sys' as string]: system?.color ?? 'var(--gold)' }}
                        >
                          <span className="lesson-row__index" aria-hidden="true">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="lesson-row__body">
                            <span className="lesson-row__kicker">
                              {system?.name ?? 'Guided lesson'}
                              <span className="lesson-row__dot" aria-hidden="true" />
                              {lesson.durationMin} min
                              <span className="lesson-row__dot" aria-hidden="true" />
                              {lesson.level}
                            </span>
                            <span className="lesson-row__title">{lesson.title}</span>
                            <span className="lesson-row__subtitle">{lesson.subtitle}</span>
                          </span>
                          <span className="lesson-row__arrow" aria-hidden="true">
                            <ArrowUpRight size={18} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <EmptyState
                    title="Guided lessons are being written."
                    description="Each of the twelve systems gets a short narrated tour. They will appear here as they are finished."
                    icon={<Sparkles size={18} />}
                    action={<Button to="/explore">Explore the body in 3D</Button>}
                  />
                )}
                <div className="home-learn__actions">
                  <Button to="/learn" iconRight={<ArrowRight size={16} />}>
                    Browse lessons
                  </Button>
                  <Button to="/quiz" variant="ghost">
                    Take a quiz
                  </Button>
                </div>
              </div>

              <aside className="home-progress" aria-labelledby="home-progress-title">
                <p className="eyebrow eyebrow--plain">Your progress</p>
                <h3 id="home-progress-title" className="home-progress__title">
                  Saved on this device.
                </h3>
                <p className="home-progress__copy">
                  No account, no tracking. Lessons, quizzes and organs you visit are remembered in this browser.
                </p>
                <div className="home-progress__rings">
                  <ProgressRing
                    value={lessonTotal ? (lessonsDone / lessonTotal) * 100 : 0}
                    label="Lessons"
                    ariaLabel={`${lessonsDone} of ${lessonTotal} lessons complete`}
                    size={68}
                  >
                    {`${lessonsDone}/${lessonTotal}`}
                  </ProgressRing>
                  <ProgressRing
                    value={organTotal ? (explored / organTotal) * 100 : 0}
                    label="Organs seen"
                    ariaLabel={`${explored} of ${organTotal} organs explored`}
                    size={68}
                    tone="gold"
                  >
                    {`${explored}/${organTotal || '—'}`}
                  </ProgressRing>
                  <ProgressRing
                    value={quizTotal ? (quizzesDone / quizTotal) * 100 : 0}
                    label="Quizzes"
                    ariaLabel={`${quizzesDone} of ${quizTotal} quizzes attempted`}
                    size={68}
                    tone="sys"
                  >
                    {`${quizzesDone}/${quizTotal}`}
                  </ProgressRing>
                </div>
                <ProgressBar
                  value={organTotal ? (explored / organTotal) * 100 : 0}
                  label="Atlas explored"
                  showValue
                />
                <p className="home-progress__foot">
                  <Compass size={13} aria-hidden="true" />
                  <Link to="/about">How this atlas is made</Link>
                </p>
              </aside>
            </div>
          </Reveal>
        </div>
      </section>

      {/* --------------------------------------------------------------- closing */}
      <section className="home-closing" aria-labelledby="home-closing-title">
        <div className="container home-closing__inner">
          <div className="home-closing__copy">
            <p className="eyebrow">About the atlas</p>
            <h2 id="home-closing-title" className="home-closing__title">
              Built to be read, <em>not skimmed</em>.
            </h2>
            <Prose
              text={
                'Anatomy Atlas is a free, ad-free field guide made for the merely curious. The writing assumes no biology background, cites authoritative public references, and never gives medical advice. Every entry is an invitation to look closer at the body you already live in.'
              }
              dropCap={false}
              className="home-closing__prose"
            />
          </div>
          <div className="home-closing__side">
            <Button to="/about" variant="ghost" iconRight={<ArrowRight size={15} />}>
              About &amp; sources
            </Button>
            <Button to="/systems" variant="quiet" iconRight={<ArrowUpRight size={14} />}>
              Browse the systems index
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
