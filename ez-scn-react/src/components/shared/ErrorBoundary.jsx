// ============================================
// PennyWise — Error Boundary
// Catches JS runtime errors in child components
// Shows friendly screen with [Try Again] button
// ============================================

import { Component } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to console in dev; in production this could go to Sentry/LogRocket
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          resetErrorBoundary: this.handleReset,
        });
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            {/* Message */}
            <h2 className="text-xl font-bold text-foreground mb-2">
              Something went wrong
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">
              An unexpected error occurred. This has been logged and
              we&apos;ll look into it. You can try again or go back
              to the dashboard.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 h-10 px-5 bg-[#01411C] text-white text-sm
                           font-semibold rounded-xl hover:bg-[#026b2e] active:bg-[#012e14]
                           transition-colors cursor-pointer shadow-lg shadow-[#01411C]/20"
              >
                <RefreshCcw className="w-4 h-4" />
                Try Again
              </button>

              <a
                href="/dashboard"
                className="flex items-center gap-2 h-10 px-5 bg-gray-100 text-foreground
                           text-sm font-semibold rounded-xl hover:bg-gray-200
                           transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Dashboard
              </a>
            </div>

            {/* Error detail (only in dev) */}
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 p-3 rounded-lg bg-gray-100 text-xs text-red-600 overflow-auto max-h-40">
                  {this.state.error.message}
                  {'\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
