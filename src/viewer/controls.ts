/**
 * Small imperative bridge for the explorer's zoom buttons.
 *
 * The public `BodyViewerProps` contract intentionally has no imperative handle, so the page
 * sends zoom requests through this tiny event bus. The viewer subscribes while mounted and
 * applies a damped camera dolly. Call `factor > 1` to zoom out and `< 1` to zoom in.
 */
type ZoomListener = (factor: number) => void;

const listeners = new Set<ZoomListener>();

export const viewerControls = {
  zoom(factor: number) {
    for (const listener of listeners) listener(factor);
  },
  subscribeZoom(listener: ZoomListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
