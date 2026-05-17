import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class WebGLErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#000008',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,229,255,0.3) 0%, transparent 70%)',
              border: '1px solid rgba(0,229,255,0.4)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          <div style={{ color: '#00e5ff', fontFamily: 'Orbitron, monospace', fontSize: '1rem', letterSpacing: '0.2em' }}>
            WebGL Required
          </div>
          <div style={{ color: '#667788', fontFamily: 'Space Grotesk, sans-serif', fontSize: '0.8rem', textAlign: 'center', maxWidth: 300 }}>
            Please open this page in a modern browser with hardware acceleration enabled to experience the cosmos.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
