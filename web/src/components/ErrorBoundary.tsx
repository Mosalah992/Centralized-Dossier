// A render error anywhere below this point unmounts the whole React tree,
// leaving a blank page with no explanation — which is exactly what happened to
// the calendar and roster volumes. The archive should fail like an archive:
// say what went wrong and stay navigable.

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Notice } from './Notice';

interface Props {
  children: ReactNode;
  /** Changing this resets the boundary — used to clear the error on navigation. */
  resetKey?: string;
}

interface State {
  message: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { message: null };

  static getDerivedStateFromError(error: unknown): State {
    return {
      message: error instanceof Error ? error.message : String(error),
    };
  }

  override componentDidUpdate(prev: Props) {
    // Moving to another volume should clear a previous volume's failure.
    if (prev.resetKey !== this.props.resetKey && this.state.message) {
      this.setState({ message: null });
    }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the component stack in the console for diagnosis; the reader gets
    // the notice above, not a stack trace.
    console.error('Volume failed to render:', error, info.componentStack);
  }

  override render() {
    if (this.state.message !== null) {
      return (
        <Notice
          kind="error"
          title="This register could not be set out"
          body={`The archivist found the volume damaged: ${this.state.message}`}
        />
      );
    }
    return this.props.children;
  }
}
