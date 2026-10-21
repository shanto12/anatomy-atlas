import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Bone,
  Eye,
  Layers,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Search,
  X,
} from 'lucide-react';

import BodyViewer from '@/components/viewer/BodyViewer';
import { getOrgan } from '@/data';
import { BODY_REGIONS, SYSTEM_ORDER, type BodyRegion, type SystemId } from '@/lib/types';
import { usePageMeta } from '@/lib/seo';
import {
  CATALOG_ORGAN_BY_ID,
  CATALOG_ORGANS,
  CATALOG_SYSTEMS,
  CATALOG_SYSTEM_BY_ID,
  getCatalogOrgan,
  groupCatalogOrgans,
} from '@/viewer/catalog';
import { viewerControls } from '@/viewer/controls';
import { useReducedMotion } from '@/viewer/useReducedMotion';

const REGION_LABEL = Object.fromEntries(BODY_REGIONS.map((region) => [region.id, region.name])) as Record<
  BodyRegion,
  string
>;

function firstParagraph(text: string): string {
  const [first] = text.split('\n\n');
  return first?.trim() ?? text;
}

interface ToggleButtonProps {
  active: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
  disabledTitle?: string;
  children: React.ReactNode;
}

function ToggleButton({ active, onToggle, label, disabled, disabledTitle, children }: ToggleButtonProps) {
  return (
    <button
      type="button"
      className={`explore-toggle${active ? ' is-active' : ''}`}
      onClick={onToggle}
      aria-pressed={active}
      disabled={disabled}
      title={disabled ? disabledTitle : `${active ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

export default function ExplorePage() {
  usePageMeta({
    title: 'Body Explorer — Interactive 3D Human Anatomy',
    description:
      'Rotate, zoom, and click through a 3D human body. Filter by body system and explore every organ and structure in the anatomy atlas.',
    path: '/explore',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const reducedMotion = useReducedMotion();

  const systemParam = searchParams.get('system');
  const activeSystem = useMemo<SystemId | null>(() => {
    if (!systemParam) return null;
    return SYSTEM_ORDER.includes(systemParam as SystemId) ? (systemParam as SystemId) : null;
  }, [systemParam]);

  const selectedOrganId = useMemo(() => {
    const id = searchParams.get('organ');
    return id && CATALOG_ORGAN_BY_ID[id] ? id : null;
  }, [searchParams]);

  const [query, setQuery] = useState('');
  const [showSkin, setShowSkin] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [focusSignal, setFocusSignal] = useState(0);

  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeSystems = useMemo<SystemId[] | null>(() => (activeSystem ? [activeSystem] : null), [activeSystem]);
  const groups = useMemo(() => groupCatalogOrgans(query, activeSystem), [query, activeSystem]);
  const matchCount = useMemo(() => groups.reduce((sum, group) => sum + group.organs.length, 0), [groups]);

  const selectedOrgan = getCatalogOrgan(selectedOrganId);
  const selectedContent = selectedOrganId ? getOrgan(selectedOrganId) : undefined;
  const selectedSystem = selectedOrgan ? CATALOG_SYSTEM_BY_ID[selectedOrgan.systemId] : undefined;

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          mutate(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const selectOrgan = useCallback(
    (organId: string | null) => {
      updateParams((params) => {
        if (!organId) {
          params.delete('organ');
          return;
        }
        params.set('organ', organId);
        const organ = getCatalogOrgan(organId);
        if (organ && activeSystem && organ.systemId !== activeSystem) {
          params.set('system', organ.systemId);
        }
      });
    },
    [updateParams, activeSystem],
  );

  const selectSystem = useCallback(
    (systemId: SystemId | null) => {
      setQuery('');
      if (systemId && selectedOrgan && selectedOrgan.systemId !== systemId) {
        setResetSignal((signal) => signal + 1);
      }
      updateParams((params) => {
        if (!systemId) params.delete('system');
        else params.set('system', systemId);
        const organId = params.get('organ');
        const organ = getCatalogOrgan(organId);
        if (organ && systemId && organ.systemId !== systemId) params.delete('organ');
      });
    },
    [updateParams, selectedOrgan],
  );

  const focusSelected = useCallback(() => {
    if (selectedOrganId) setFocusSignal((signal) => signal + 1);
  }, [selectedOrganId]);

  const clearSelection = useCallback(() => {
    selectOrgan(null);
    setResetSignal((signal) => signal + 1);
  }, [selectOrgan]);

  // Selecting from the model, the list, or a deep link eases the camera to the structure.
  const lastFocused = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedOrganId) {
      lastFocused.current = null;
      return;
    }
    if (lastFocused.current === selectedOrganId) return;
    lastFocused.current = selectedOrganId;
    setFocusSignal((signal) => signal + 1);
  }, [selectedOrganId]);

  // Escape clears the selection (but leaves the search field alone).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (selectedOrganId) {
        updateParams((params) => params.delete('organ'));
        setResetSignal((signal) => signal + 1);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedOrganId, updateParams]);

  // Keep the selected row visible without scrolling the page.
  useEffect(() => {
    const list = listRef.current;
    if (!selectedOrganId || !list) return;
    const row = list.querySelector<HTMLElement>(`[data-organ-id="${selectedOrganId}"]`);
    if (!row) return;
    const listRect = list.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    if (rowRect.top < listRect.top + 6) {
      list.scrollTo({ top: list.scrollTop - (listRect.top - rowRect.top) - 10, behavior: reducedMotion ? 'auto' : 'smooth' });
    } else if (rowRect.bottom > listRect.bottom - 6) {
      list.scrollTo({ top: list.scrollTop + (rowRect.bottom - listRect.bottom) + 10, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }, [selectedOrganId, reducedMotion]);

  return (
    <div className="explore-page">
      <header className="container explore-head">
        <div>
          <p className="eyebrow">The body explorer</p>
          <h1 className="explore-title">
            Every part of you, <em>one</em> click away.
          </h1>
        </div>
        <p className="explore-intro">
          Rotate the mannequin, filter the body down to a single system, then follow any structure into its full
          entry. The body is a stylised teaching model — not a diagnostic image.
        </p>
      </header>

      <div className="container container--wide explore-layout">
        <section className="explore-main" aria-label="Interactive body">
          <div className="explore-chips" role="group" aria-label="Filter by body system">
            <button
              type="button"
              className={`sys-chip sys-chip--all${!activeSystem ? ' is-active' : ''}`}
              onClick={() => selectSystem(null)}
              aria-pressed={!activeSystem}
            >
              <span className="sys-chip__dot" aria-hidden="true" />
              <span>All systems</span>
              <span className="sys-chip__count">{CATALOG_ORGANS.length}</span>
            </button>
            {CATALOG_SYSTEMS.map((system) => {
              const active = activeSystem === system.id;
              return (
                <button
                  key={system.id}
                  type="button"
                  className={`sys-chip${active ? ' is-active' : ''}`}
                  style={{ '--sys': system.color } as CSSProperties}
                  onClick={() => selectSystem(active ? null : system.id)}
                  aria-pressed={active}
                  title={system.tagline}
                >
                  <span className="sys-chip__dot" aria-hidden="true" />
                  <span>{system.shortName}</span>
                  <span className="sys-chip__count">{system.count}</span>
                </button>
              );
            })}
          </div>

          <div className="explore-stage-wrap">
            <div className="explore-stage">
              <BodyViewer
                variant="explore"
                activeSystems={activeSystems}
                selectedOrganId={selectedOrganId}
                onSelectOrgan={selectOrgan}
                showSkin={showSkin}
                showSkeleton={showSkeleton}
                showLabels={showLabels}
                autoRotate={autoRotate}
                interactive
                controls
                resetSignal={resetSignal}
                focusOrganId={selectedOrganId}
                focusSignal={focusSignal}
              />

              <div className="explore-stage__tools" role="group" aria-label="Camera controls">
                <button
                  type="button"
                  className="stage-tool"
                  onClick={() => viewerControls.zoom(0.8)}
                  aria-label="Zoom in"
                  title="Zoom in"
                >
                  <Plus size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="stage-tool"
                  onClick={() => viewerControls.zoom(1.25)}
                  aria-label="Zoom out"
                  title="Zoom out"
                >
                  <Minus size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="stage-tool"
                  onClick={() => {
                    setResetSignal((signal) => signal + 1);
                  }}
                  aria-label="Reset camera"
                  title="Reset camera"
                >
                  <RotateCcw size={16} aria-hidden="true" />
                </button>
              </div>

              <p className="explore-stage__hint" aria-hidden="true">
                Drag to rotate · Scroll to zoom · Click an organ
              </p>
            </div>

            {selectedOrgan ? (
              <aside className="explore-detail" aria-labelledby="selected-organ-heading">
                <div className="explore-detail__bar">
                  <span
                    className="explore-detail__system"
                    style={{ '--sys': selectedSystem?.color ?? selectedOrgan.systemColor } as CSSProperties}
                  >
                    <span className="explore-detail__dot" aria-hidden="true" />
                    {selectedSystem?.shortName ?? selectedOrgan.systemShortName}
                  </span>
                  <button
                    type="button"
                    className="explore-detail__close"
                    onClick={clearSelection}
                    aria-label="Clear selection"
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                </div>

                <h2 id="selected-organ-heading" className="explore-detail__title">
                  {selectedOrgan.name}
                </h2>
                {selectedOrgan.latin ? <p className="explore-detail__latin">{selectedOrgan.latin}</p> : null}

                {selectedContent ? (
                  <>
                    <p className="explore-detail__tagline">{selectedContent.tagline}</p>
                    <p className="explore-detail__summary">{firstParagraph(selectedContent.summary)}</p>
                    {selectedContent.heroStat ? (
                      <p className="explore-detail__stat">
                        <strong>{selectedContent.heroStat.value}</strong>
                        <span>{selectedContent.heroStat.label}</span>
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="explore-detail__summary">
                    The full illustrated entry for this structure is being written. Its place in the body is ready
                    to explore in 3D.
                  </p>
                )}

                <p className="explore-detail__meta">
                  {REGION_LABEL[selectedOrgan.region] ?? selectedOrgan.region}
                  {selectedContent?.size ? <span> · {selectedContent.size}</span> : null}
                </p>

                <div className="explore-detail__actions">
                  <Link className="btn btn--primary btn--sm" to={`/organs/${selectedOrgan.id}`}>
                    Open full entry
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={focusSelected}>
                    Frame in 3D
                  </button>
                </div>
              </aside>
            ) : null}
          </div>

          <div className="explore-toolbar" role="group" aria-label="Viewer layers">
            <ToggleButton active={showSkin} onToggle={() => setShowSkin((value) => !value)} label="Skin">
              <Eye size={15} aria-hidden="true" />
            </ToggleButton>
            <ToggleButton active={showSkeleton} onToggle={() => setShowSkeleton((value) => !value)} label="Skeleton">
              <Bone size={15} aria-hidden="true" />
            </ToggleButton>
            <ToggleButton active={showLabels} onToggle={() => setShowLabels((value) => !value)} label="Labels">
              <Layers size={15} aria-hidden="true" />
            </ToggleButton>
            <ToggleButton
              active={autoRotate}
              onToggle={() => setAutoRotate((value) => !value)}
              label="Auto-rotate"
              disabled={reducedMotion}
              disabledTitle="Auto-rotate is off because your device requests reduced motion"
            >
              <RotateCw size={15} aria-hidden="true" />
            </ToggleButton>
          </div>
        </section>

        <aside className="explore-side" aria-label="Organ browser">
          <div className="explore-search">
            <Search size={16} aria-hidden="true" className="explore-search__icon" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search organs, structures, systems"
              aria-label="Search organs"
              className="explore-search__input"
            />
            {query ? (
              <button
                type="button"
                className="explore-search__clear"
                onClick={() => {
                  setQuery('');
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <X size={14} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="explore-list-head">
            <p className="caps">{activeSystem ? CATALOG_SYSTEM_BY_ID[activeSystem].name : 'All structures'}</p>
            <p className="explore-list-count">
              {matchCount} {matchCount === 1 ? 'structure' : 'structures'}
            </p>
          </div>

          <div className="explore-list" ref={listRef}>
            {groups.length === 0 ? (
              <div className="explore-empty">
                <p>No structure matches “{query}”.</p>
                {activeSystem ? (
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => selectSystem(null)}
                    style={{ marginTop: 12 }}
                  >
                    Search all systems
                  </button>
                ) : null}
              </div>
            ) : (
              groups.map((group) => (
                <section
                  key={group.system.id}
                  className="explore-group"
                  aria-labelledby={`explore-group-${group.system.id}`}
                  style={{ '--sys': group.system.color } as CSSProperties}
                >
                  <h2 id={`explore-group-${group.system.id}`} className="explore-group__title">
                    <span className="explore-group__dot" aria-hidden="true" />
                    {group.system.name}
                    <span className="explore-group__count">{group.organs.length}</span>
                  </h2>
                  <ul className="explore-group__list">
                    {group.organs.map((organ) => {
                      const selected = organ.id === selectedOrganId;
                      return (
                        <li key={organ.id}>
                          <button
                            type="button"
                            className={`organ-row${selected ? ' is-selected' : ''}`}
                            onClick={() => selectOrgan(organ.id)}
                            aria-pressed={selected}
                            data-organ-id={organ.id}
                          >
                            <span className="organ-row__dot" aria-hidden="true" />
                            <span className="organ-row__name">{organ.name}</span>
                            <span className="organ-row__region">{REGION_LABEL[organ.region] ?? organ.region}</span>
                            <ArrowRight size={14} aria-hidden="true" className="organ-row__arrow" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </div>
          <p className="explore-side__note">
            Every structure is a clickable part of the 3D body. Use the list when the stage is out of reach.
          </p>
        </aside>
      </div>
    </div>
  );
}
