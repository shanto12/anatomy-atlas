import clsx from 'clsx';

/** Split authored multi-paragraph prose (content uses blank lines) into paragraphs. */
export function splitParagraphs(text?: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** Short, human-readable excerpt for meta descriptions and card blurbs. */
export function excerpt(text: string | null | undefined, max = 155): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= max) return clean;
  const clipped = clean.slice(0, max);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, lastSpace > 40 ? lastSpace : max).trimEnd()}…`;
}

export interface ProseProps {
  text?: string | null;
  className?: string;
  /** Set the first letter of the first paragraph as an illuminated drop cap. */
  dropCap?: boolean;
  /** Optional heading id already rendered by the caller — nothing extra is emitted. */
  id?: string;
}

/**
 * Typeset article body for the authored summaries. Never rewrites content:
 * paragraphs are rendered exactly as written.
 */
export default function Prose({ text, className, dropCap = true, id }: ProseProps) {
  const paragraphs = splitParagraphs(text);
  if (!paragraphs.length) return null;
  return (
    <div id={id} className={clsx('prose', dropCap && 'prose--dropcap', className)}>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}
