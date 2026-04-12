import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
interface ErrorBoundary {
  props: Props;
  state: State;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif', textAlign: 'center', backgroundColor: '#020617', color: '#e2e8f0', minHeight: '100dvh' }}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>Something went wrong</h1>
          <p style={{ color: '#94a3b8', marginBottom: 16 }}>{this.state.error?.message}</p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              padding: '12px 24px',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              cursor: 'pointer',
            }}
          >
            Clear Data &amp; Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
