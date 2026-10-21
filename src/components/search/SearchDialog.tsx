export interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Global search overlay. Owned by learning-dev.
 * Contract: rendered once by AppShell, opens via the `open` prop, closes via `onClose`.
 */
export default function SearchDialog({ open }: SearchDialogProps) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,17,14,.45)',
        display: 'grid',
        placeItems: 'start center',
        paddingTop: '12vh',
        zIndex: 1000,
      }}
    >
      <div style={{ background: 'var(--paper)', padding: 24, borderRadius: 12, width: 'min(560px, 92vw)' }}>
        <p className="small">Search is being assembled…</p>
      </div>
    </div>
  );
}
