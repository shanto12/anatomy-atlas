import { highlightSegments } from '@/lib/search';

export interface HighlightProps {
  text: string;
  query: string;
}

/** Renders a string with matched query tokens wrapped in <mark>. */
export default function Highlight({ text, query }: HighlightProps) {
  if (!query.trim()) return <>{text}</>;
  const segments = highlightSegments(text, query);
  return (
    <>
      {segments.map((segment, index) =>
        segment.match ? (
          <mark key={index} className="search-highlight">
            {segment.text}
          </mark>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}
