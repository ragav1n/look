import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Last line of defence. Without this, one bad value — a `look.wishlist` entry
 * that isn't an array, say — throws during render of every product card and
 * blanks the whole site with no way back. React still has no hook equivalent,
 * so this stays a class.
 */

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-page px-6 text-center">
        <p className="text-[12px] tracking-[0.08em] text-accent uppercase">Something went wrong</p>
        <h1 className="max-w-[520px] font-display text-[28px] leading-tight font-medium text-white">
          We hit an unexpected error rendering this page.
        </h1>
        <p className="max-w-[420px] text-[15px] text-body">
          Reloading usually clears it. If it keeps happening, let us know what you were doing.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded-full bg-accent px-6 py-3 text-[13px] font-medium tracking-[0.08em] text-white uppercase transition-colors hover:bg-accent-bright"
          >
            Reload
          </button>
          {/* Full navigation, not a router link — the router may be the thing
              that just threw. */}
          <a
            href="/"
            className="cursor-pointer rounded-full border border-line px-6 py-3 text-[13px] font-medium tracking-[0.08em] text-white uppercase transition-colors hover:border-accent hover:text-accent"
          >
            Back to home
          </a>
        </div>
      </div>
    );
  }
}
