import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  FlaskConical,
  Github,
  HeartPulse,
  Library,
  ListChecks,
  ShieldCheck,
} from 'lucide-react';

import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import Prose from '@/components/ui/Prose';
import Reveal from '@/components/ui/Reveal';
import SectionHeading from '@/components/ui/SectionHeading';
import { Stat, StatGroup } from '@/components/ui/Stat';
import { history, organs, siteStats, systems } from '@/data';
import { usePageMeta } from '@/lib/seo';

const REFERENCE_LIBRARIES = [
  {
    name: 'MedlinePlus',
    publisher: 'U.S. National Library of Medicine',
    url: 'https://medlineplus.gov/',
    note: 'Plain-language health and anatomy references.',
  },
  {
    name: 'National Institutes of Health',
    publisher: 'U.S. Department of Health & Human Services',
    url: 'https://www.nih.gov/',
    note: 'Institute pages on organs, systems, and conditions.',
  },
  {
    name: 'Cleveland Clinic',
    publisher: 'Cleveland Clinic',
    url: 'https://my.clevelandclinic.org/health',
    note: 'Detailed, reviewed anatomy and body-system guides.',
  },
  {
    name: 'Mayo Clinic',
    publisher: 'Mayo Clinic',
    url: 'https://www.mayoclinic.org/',
    note: 'Condition overviews written for general readers.',
  },
  {
    name: 'Johns Hopkins Medicine',
    publisher: 'Johns Hopkins University',
    url: 'https://www.hopkinsmedicine.org/health',
    note: 'Anatomy and physiology explainers.',
  },
  {
    name: 'Encyclopaedia Britannica',
    publisher: 'Britannica',
    url: 'https://www.britannica.com/science/anatomy',
    note: 'Historical and structural context.',
  },
];

const METHOD_STEPS = [
  {
    icon: Library,
    title: 'Written from references',
    copy: 'Each entry is drafted from stable, authoritative public pages — not from memory. The reference list at the foot of every organ entry is the working bibliography.',
  },
  {
    icon: CheckCircle2,
    title: 'Checked against the source',
    copy: 'Numbers, locations and functions are verified against those references. When a detail is uncertain across sources, it is left out rather than guessed.',
  },
  {
    icon: FlaskConical,
    title: 'Illustrated in code',
    copy: 'The 3D body is procedurally built from geometry, not a downloaded model. Every structure in the content is placed on the figure so the model and the writing stay in sync.',
  },
  {
    icon: HeartPulse,
    title: 'Kept free and quiet',
    copy: 'No accounts, no ads, no tracking. Progress is stored only in your browser. There is nothing to sign up for and nothing to sell you.',
  },
];

const READING_GUIDE = [
  {
    icon: BookOpen,
    title: 'Overview',
    copy: 'A short essay on what the structure is, where it sits and why it matters — written to be read in one sitting.',
  },
  {
    icon: ListChecks,
    title: 'Function & conditions',
    copy: 'What the organ actually does, then the common conditions that interrupt that work. Educational only, never advice.',
  },
  {
    icon: ShieldCheck,
    title: 'Sources',
    copy: 'Two authoritative references per organ entry, so you can check the atlas against the wider literature yourself.',
  },
];

export default function AboutPage() {
  usePageMeta({
    title: 'About & Sources',
    description:
      'How Anatomy Atlas is made: the editorial method, the reference libraries behind every entry, and the educational-use disclaimer.',
    path: '/about',
  });

  return (
    <div className="about-page">
      <div className="container">
        <PageHeader
          breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'About & sources' }]}
          eyebrow="About · method & sources"
          title={
            <>
              A map of you, <em className="accent-serif">made carefully</em>.
            </>
          }
          lede="Anatomy Atlas is a free, ad-free field guide to the human body for curious beginners. It exists to make the body legible — one system, one organ, one clear sentence at a time."
          meta={
            <StatGroup divided={false}>
              <Stat value={siteStats.systemCount || systems.length || 12} label="Body systems" size="sm" />
              <Stat value={siteStats.organCount || organs.length || '—'} label="Organ entries" size="sm" />
              <Stat value={siteStats.lessonCount || systems.length || 12} label="Guided lessons" size="sm" />
              <Stat value={siteStats.stepCount || '—'} label="Lesson steps" size="sm" />
            </StatGroup>
          }
        />
      </div>

      <section className="section-tight container about-intro" aria-labelledby="about-why-title">
        <div className="about-intro__grid">
          <Reveal className="about-intro__main">
            <SectionHeading
              id="about-why-title"
              eyebrow="Why this exists"
              title="Anatomy is a place you already live."
              rule
            />
            <Prose
              text={
                'Most people meet anatomy in a diagram with forty arrows and no story. The names blur, the pieces do not connect, and nothing stays. This atlas takes the opposite approach.\n\nThe body is treated as a place to walk through: twelve systems, each with its own landscape and its own logic. You can turn it in three dimensions, stop on any structure, read a short essay about it, then test whether it stuck. The aim is not to make you a clinician. It is to make the body familiar.'
              }
            />
          </Reveal>
          <Reveal className="about-intro__aside" delay={80}>
            <div className="about-pullquote">
              <p className="eyebrow eyebrow--plain">Editorial rule</p>
              <p className="about-pullquote__text">
                “Write for one curious person, not for a syllabus. If a sentence cannot be pictured, rewrite it.”
              </p>
              <p className="about-pullquote__cite">The voice guide for every entry</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section container" aria-labelledby="about-method-title">
        <Reveal>
          <SectionHeading
            id="about-method-title"
            eyebrow="The method"
            title="How the atlas is made."
            lede="Four decisions shape every page, and each one is a promise about quality."
            rule
          />
        </Reveal>
        <div className="method-grid">
          {METHOD_STEPS.map(({ icon: Icon, title, copy }, index) => (
            <Reveal key={title} className="method-card" delay={index * 60}>
              <span className="method-card__icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              <span className="method-card__index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="method-card__title">{title}</h3>
              <p className="method-card__copy">{copy}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section-tight container" aria-labelledby="about-sources-title">
        <Reveal>
          <SectionHeading
            id="about-sources-title"
            eyebrow="References"
            title="Where the information comes from."
            lede="Every organ entry cites two stable pages from the libraries below. These are the institutions the atlas leans on; no single entry depends on any one of them."
            rule
          />
        </Reveal>
        <div className="library-grid">
          {REFERENCE_LIBRARIES.map((library, index) => (
            <Reveal key={library.name} delay={index * 40}>
              <a className="library-card" href={library.url} target="_blank" rel="noreferrer">
                <span className="library-card__index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="library-card__name">{library.name}</span>
                <span className="library-card__publisher">{library.publisher}</span>
                <span className="library-card__note">{library.note}</span>
                <span className="library-card__arrow" aria-hidden="true">
                  <ArrowUpRight size={15} />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section container" aria-labelledby="about-reading-title">
        <Reveal>
          <SectionHeading
            id="about-reading-title"
            eyebrow="How to read an entry"
            title="Every organ page, in three movements."
            lede="The same structure everywhere, so you can read the atlas quickly and trust what you find."
            rule
          />
        </Reveal>
        <div className="reading-grid">
          {READING_GUIDE.map(({ icon: Icon, title, copy }, index) => (
            <Reveal key={title} className="reading-card" delay={index * 60}>
              <Icon size={19} aria-hidden="true" className="reading-card__icon" />
              <h3>{title}</h3>
              <p>{copy}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {history.length ? (
        <section className="section-tight container" aria-labelledby="about-history-title">
          <Reveal>
            <SectionHeading
              id="about-history-title"
              eyebrow="A longer view"
              title="Anatomy has a history."
              lede="Milestones from the centuries of looking, drawing and arguing that produced the maps we use today."
              rule
            />
          </Reveal>
          <ol className="history-list">
            {history.map((event) => (
              <li key={`${event.year}-${event.title}`} className="history-item">
                <span className="history-item__year num">{event.year}</span>
                <div className="history-item__body">
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                  {event.figure ? <p className="history-item__figure">{event.figure}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="section-tight container" aria-labelledby="about-disclaimer-title">
        <div id="disclaimer" className="disclaimer" role="note" aria-labelledby="about-disclaimer-title">
          <div className="disclaimer__head">
            <span className="disclaimer__icon" aria-hidden="true">
              <ShieldCheck size={22} />
            </span>
            <div>
              <p className="eyebrow eyebrow--plain">Please read</p>
              <h2 id="about-disclaimer-title" className="disclaimer__title">
                Educational use only.
              </h2>
            </div>
          </div>
          <div className="disclaimer__body">
            <p>
              Anatomy Atlas is for learning. It is not medical advice, diagnosis, or treatment, and it cannot account
              for your history or your body. Content describes typical anatomy and common conditions in general terms.
            </p>
            <p>
              Bodies vary. If something worries you — a symptom, a diagnosis, a decision — talk with a qualified
              clinician who knows you. In an emergency, contact your local emergency services.
            </p>
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="about-corrections-title">
        <div className="corrections">
          <div>
            <SectionHeading
              id="about-corrections-title"
              eyebrow="Corrections & source"
              title="No atlas is finished."
              lede="If you find an inaccuracy, an outdated reference, or a sentence that could be clearer, the source is open and corrections are welcome."
              rule
            />
            <div className="corrections__actions">
              <Button
                href="https://github.com/shanto12/anatomy-atlas"
                target="_blank"
                rel="noreferrer"
                iconLeft={<Github size={16} />}
              >
                View source on GitHub
              </Button>
              <Button to="/systems" variant="ghost" iconRight={<ArrowUpRight size={15} />}>
                Browse the systems
              </Button>
            </div>
          </div>
          <div className="corrections__facts">
            <div>
              <span className="caps">Built with</span>
              <p>React, TypeScript, Three.js, and the Fraunces &amp; Inter typefaces.</p>
            </div>
            <div>
              <span className="caps">Content</span>
              <p>Authored from public reference libraries. Every organ entry lists its own sources.</p>
            </div>
            <div>
              <span className="caps">Privacy</span>
              <p>No accounts, no analytics, no advertising. Progress stays in your browser.</p>
            </div>
            <div>
              <span className="caps">Cost</span>
              <p>Free. Always.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-tight container about-closing">
        <p className="eyebrow">Start anywhere</p>
        <h2 className="about-closing__title">
          The body is waiting. <em>Go look.</em>
        </h2>
        <div className="cluster">
          <Button to="/explore" size="lg">
            Open the body explorer
          </Button>
          <Button to="/learn" size="lg" variant="ghost">
            Browse guided lessons
          </Button>
          <Link className="text-link about-closing__link" to="/glossary">
            Or check the glossary
          </Link>
        </div>
      </section>
    </div>
  );
}
