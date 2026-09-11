import { Component, type ErrorInfo, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

const VercelTelemetry = dynamic(
  () => import('./VercelTelemetry').catch(() => ({ default: () => null })),
  { ssr: false, loading: () => null },
);

class TelemetryErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production')
      console.warn('[telemetry] provider render failed', error, info.componentStack);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function TelemetryRoot() {
  if (process.env.NEXT_PUBLIC_TELEMETRY_PROVIDER !== 'vercel') return null;
  return (
    <TelemetryErrorBoundary>
      <VercelTelemetry />
    </TelemetryErrorBoundary>
  );
}
