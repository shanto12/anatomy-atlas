import { Link } from 'react-router-dom';

import { siteStats } from '@/data';
import { usePageMeta } from '@/lib/seo';

export default function AboutPage() {
  usePageMeta({
    title: 'About & Sources',
    description: 'How Anatomy Atlas was built, where its information comes from, and how to use it responsibly.',
    path: '/about',
  });

  return (
    <div className="container container--narrow section">
      <p className="eyebrow">About</p>
      <h1 className="h1" style={{ marginTop: 16 }}>
        A map of you.
      </h1>
      <p className="lede" style={{ marginTop: 20 }}>
        Anatomy Atlas is a free, interactive guide to the human body: {siteStats.organCount} organs and structures
        across {siteStats.systemCount} systems, written to be understood.
      </p>

      <h2 className="h2" style={{ marginTop: 56 }}>
        Where the information comes from
      </h2>
      <p style={{ marginTop: 16 }}>
        Content is written for a general audience and checked against authoritative public references, including
        MedlinePlus (U.S. National Library of Medicine), the National Institutes of Health, Cleveland Clinic, Mayo
        Clinic, Johns Hopkins Medicine, and Encyclopaedia Britannica. Every organ entry lists its own sources.
      </p>

      <h2 className="h2" style={{ marginTop: 48 }}>
        Educational use only
      </h2>
      <p style={{ marginTop: 16 }}>
        This atlas is for learning. It is not medical advice, diagnosis, or treatment. Bodies vary, and only a
        qualified clinician who knows your history can interpret symptoms. If something worries you, talk to a
        healthcare professional.
      </p>

      <h2 className="h2" style={{ marginTop: 48 }}>
        How to use it
      </h2>
      <ol className="about-steps">
        <li>
          <strong>Explore.</strong> Rotate and zoom the body, choose a system, and click any organ.
        </li>
        <li>
          <strong>Learn.</strong> Follow a guided lesson for a narrative tour of each system.
        </li>
        <li>
          <strong>Test.</strong> Take the quiz and read the explanation for every answer.
        </li>
      </ol>

      <p className="small" style={{ marginTop: 56 }}>
        Built with React, Three.js, and a lot of curiosity. View the{' '}
        <a className="text-link" href="https://github.com/shanto12/anatomy-atlas" target="_blank" rel="noreferrer">
          source on GitHub
        </a>
        .
      </p>
      <p className="small" style={{ marginTop: 16 }}>
        <Link className="text-link" to="/explore">
          Start exploring →
        </Link>
      </p>
    </div>
  );
}
