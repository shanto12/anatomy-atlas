import { Link } from 'react-router-dom';

import GlossaryExplorer from '@/components/learn/GlossaryExplorer';
import { glossary } from '@/data';
import { usePageMeta } from '@/lib/seo';

export default function GlossaryPage() {
  usePageMeta({
    title: 'Anatomy Glossary',
    description:
      'Plain-English definitions of the anatomical terms used across the atlas, with related words and topic filters.',
    path: '/glossary',
  });

  return (
    <div className="glossary-page">
      <div className="container glossary-page__inner">
        <header className="glossary-page__header">
          <p className="eyebrow">Glossary</p>
          <h1 className="display glossary-page__title">
            The words of
            <br />
            <em>anatomy.</em>
          </h1>
          <p className="lede glossary-page__lede">
            {glossary.length > 0
              ? `${glossary.length} terms, explained in plain English. Look one up, follow the related words, or wander from A to Z.`
              : 'Plain-English definitions of the words anatomists use. The glossary is being written and checked now.'}
          </p>
          <p className="small glossary-page__link">
            New to the vocabulary? <Link to="/learn" className="text-link">Start with a guided lesson</Link>.
          </p>
        </header>

        <GlossaryExplorer terms={glossary} />
      </div>
    </div>
  );
}
