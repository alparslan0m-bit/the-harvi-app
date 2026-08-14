/**
 * @file ErrorBoundary.tsx
 * @description React Class Component error boundary wrapper.
 * Catches unhandled JS runtime exceptions rendered in child component trees, logs error details,
 * and renders a safe fallback UI (`ErrorFallback`) to prevent total application crashes.
 */
import React, { Component, ComponentType, PropsWithChildren } from "react";

import { ErrorFallback, ErrorFallbackProps } from "./ErrorFallback";

/** Props for the React ErrorBoundary component */
export type ErrorBoundaryProps = PropsWithChildren<{
  /** Optional custom fallback component to render when an exception is caught */
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Optional logging callback invoked when an error is caught in the component tree */
  onError?: (error: Error, stackTrace: string) => void;
}>;

/** Internal state tracking caught rendering errors */
type ErrorBoundaryState = { error: Error | null };

/**
 * Class Component handling React rendering error boundaries.
 * Class components are required here because React only provides error boundary functionality 
 * through static `getDerivedStateFromError` and `componentDidCatch` lifecycle methods.
 * 
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  override state: ErrorBoundaryState = { error: null };

  static defaultProps: {
    FallbackComponent: ComponentType<ErrorFallbackProps>;
  } = {
    FallbackComponent: ErrorFallback,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(
    error: Error,
    info: { componentStack?: string },
  ): void {
    if (typeof this.props.onError === "function") {
      this.props.onError(error, info.componentStack || "");
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  override render() {
    const { FallbackComponent } = this.props;

    return this.state.error && FallbackComponent ? (
      <FallbackComponent
        error={this.state.error}
        resetError={this.resetError}
      />
    ) : (
      this.props.children
    );
  }
}
