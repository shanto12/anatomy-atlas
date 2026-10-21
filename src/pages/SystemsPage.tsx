import { BookOpen, Compass, ListChecks, MousePointerClick } from 'lucide-react';

import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import PageHeader from '@/components/ui/PageHeader';
import Reveal from '@/components/ui/Reveal';
import SectionHeading from '@/components/ui/SectionHeading';
import { Stat, StatGroup } from '@/components/ui/Stat';
import SystemCard from '@/components/ui/SystemCard';
import { organs, siteStats, systems } from '@/data';
import { usePageMeta } from '@/lib/seo';

export default function SystemsPage() {
  usePageMeta({
    title: 'Body Systems',
    description:
      'Browse all twelve systems of the human body — skeletal, muscular, nervous, circulatory, respiratory, digestive and more — with the organs and structures that make each one work.',
    path: '/systems',
  });

  return (
    <>
      <div className="container">
        <PageHeader
          breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Systems' }]}
          eyebrow="Reference · systems index"
          title={
            <>
              The body, in <em className="accent-serif">twelve systems</em>.
            </>
          }
          lede="Your body is not a pile of parts. It is a set of cooperating systems — each one a chapter with its own structures, its own rhythm, and its own way of failing. Start anywhere; follow the connections."
          meta={
            <StatGroup divided={false} className="page-header__statline">
              <Stat value={siteStats.systemCount || systems.length || 12} label="Systems" size="sm" />
              <Stat value={siteStats.organCount || organs.length || '—'} label="Structures" size="sm" />
              <Stat value={siteStats.lessonCount || systems.length || 12} label="Guided lessons" size="sm" />
              <Stat value={siteStats.quizCount || '—'} label="Quiz questions" size="sm" />
            </StatGroup>
          }
          actions={
            <>
              <Button to="/explore" iconLeft={<Compass size={16} />}>
                Explore in 3D
              </Button>
              <Button to="/learn" variant="ghost" iconLeft={<BookOpen size={16} />}>
                Browse lessons
              </Button>
            </>
          }
        />
      </div>

      <section className="section-tight systems-index" aria-labelledby="systems-index-title">
        <div className="container">
          <Reveal>
            <SectionHeading
              id="systems-index-title"
              eyebrow="All twelve"
              title="Choose a chapter."
              lede="Numbered in the order we teach them: from the frame you stand on, through the systems that move, sense, and sustain you."
              rule
            />
          </Reveal>

          {systems.length ? (
            <Reveal delay={60}>
              <div className="system-grid system-grid--index">
                {systems.map((system, index) => (
                  <SystemCard key={system.id} system={system} index={index + 1} />
                ))}
              </div>
            </Reveal>
          ) : (
            <EmptyState
              eyebrow="Content arriving"
              title="The systems are being written."
              description="Twelve system entries are being authored and fact-checked in parallel. The 3D explorer is already complete."
              icon={<Compass size={18} />}
              action={<Button to="/explore">Open the body explorer</Button>}
            />
          )}
        </div>
      </section>

      <section className="section systems-guide" aria-labelledby="systems-guide-title">
        <div className="container">
          <Reveal>
            <SectionHeading
              id="systems-guide-title"
              eyebrow="How to use the atlas"
              title="Three ways in."
              lede="Every system page opens onto the same three doors: look, read, and test."
              rule
            />
          </Reveal>
          <div className="guide-grid">
            <Reveal className="guide-card" delay={0}>
              <span className="guide-card__icon" aria-hidden="true">
                <MousePointerClick size={20} />
              </span>
              <span className="guide-card__index">01</span>
              <h3 className="guide-card__title">Look</h3>
              <p className="guide-card__copy">
                Each system page carries a live 3D model lit for that system alone. Rotate it, zoom in, then choose a
                structure from the list below if the model is out of reach.
              </p>
              <Button to="/explore" variant="quiet" size="sm">
                Open the body explorer
              </Button>
            </Reveal>
            <Reveal className="guide-card" delay={70}>
              <span className="guide-card__icon" aria-hidden="true">
                <BookOpen size={20} />
              </span>
              <span className="guide-card__index">02</span>
              <h3 className="guide-card__title">Read</h3>
              <p className="guide-card__copy">
                Organ entries are written as short, vivid essays: what it is, where it sits, what it does, and what can
                go wrong. Sources are listed at the foot of every entry.
              </p>
              <Button to="/systems" variant="quiet" size="sm">
                Pick a system
              </Button>
            </Reveal>
            <Reveal className="guide-card" delay={140}>
              <span className="guide-card__icon" aria-hidden="true">
                <ListChecks size={20} />
              </span>
              <span className="guide-card__index">03</span>
              <h3 className="guide-card__title">Test</h3>
              <p className="guide-card__copy">
                Eight questions per system, each with an explanation for every answer. The final exam mixes two
                questions from each of the twelve systems.
              </p>
              <Button to="/quiz" variant="quiet" size="sm">
                Take a quiz
              </Button>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
