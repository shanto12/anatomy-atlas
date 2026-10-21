import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

/** Catches render errors (including WebGL init failures) and shows a graceful fallback. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Anatomy Atlas render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container section" role="alert">
          <p className="eyebrow">Something went wrong</p>
          <h1 className="h2" style={{ marginTop: 16 }}>
            The atlas lost its place.
          </h1>
          <p className="lede" style={{ marginTop: 16 }}>
            An unexpected error interrupted this view. Reload the page to keep exploring — your progress is saved on
            this device.
          </p>
          {this.state.message ? (
            <p className="small" style={{ marginTop: 12 }}>
              {this.state.message}
            </p>
          ) : null}
          <button
            type="button"
            className="btn btn--primary"
            style={{ marginTop: 24 }}
            onClick={() => window.location.assign('/')}
          >
            Back to the atlas
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
