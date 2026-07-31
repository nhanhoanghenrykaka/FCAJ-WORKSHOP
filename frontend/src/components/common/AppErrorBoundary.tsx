import { Component, type ErrorInfo, type ReactNode } from "react";
import { clearAuthStorage } from "../../utils/storage";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unknown rendering error",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Shopsflow rendering error", error, info);
  }

  private reload = () => {
    window.location.reload();
  };

  private resetSession = () => {
    clearAuthStorage();
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="fatal-error-page" role="alert">
        <div className="fatal-error-card">
          <p className="section-kicker">Application recovery</p>
          <h1>Something interrupted this page.</h1>
          <p>
            The interface could not finish rendering. Reload the page first, or reset the saved
            sign-in session if the issue returns.
          </p>
          {import.meta.env.DEV && this.state.message && (
            <pre className="fatal-error-details">{this.state.message}</pre>
          )}
          <div className="fatal-error-actions">
            <button className="button button-primary" type="button" onClick={this.reload}>
              Reload page
            </button>
            <button className="button button-secondary" type="button" onClick={this.resetSession}>
              Reset session
            </button>
          </div>
        </div>
      </main>
    );
  }
}
