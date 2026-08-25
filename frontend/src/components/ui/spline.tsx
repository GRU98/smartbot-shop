import { Component, lazy, Suspense, type ReactNode } from "react";

const Spline = lazy(
  () =>
    import("@splinetool/react-spline").catch(() => ({
      default: () => <SplineFallback />,
    })) as any
);

function SplineLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyber-cyan" />
        <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-b-digital-yellow [animation-direction:reverse] [animation-duration:1.5s]" />
      </div>
    </div>
  );
}

function SplineFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-center text-muted-foreground">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 h-10 w-10">
          <path d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5m-4.75-11.396c.251.023.501.05.75.082M5 14.5l-1.43 1.43a2.25 2.25 0 0 0 0 3.18l.97.97a2.25 2.25 0 0 0 3.18 0L9 18.81m10-4.31 1.43 1.43a2.25 2.25 0 0 1 0 3.18l-.97.97a2.25 2.25 0 0 1-3.18 0L15 18.81" />
        </svg>
        <p className="text-sm">3D unavailable</p>
      </div>
    </div>
  );
}

class SplineErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <SplineFallback />;
    }
    return this.props.children;
  }
}

interface SplineSceneProps {
  scene: string;
  className?: string;
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  return (
    <SplineErrorBoundary>
      <Suspense fallback={<SplineLoader />}>
        <Spline scene={scene} className={className} />
      </Suspense>
    </SplineErrorBoundary>
  );
}
