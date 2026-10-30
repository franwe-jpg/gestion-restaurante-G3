import { Component } from 'react';
import type { ReactNode } from 'react';

import { ErrorState } from './ui/error-state';

export interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorState
          titulo="Algo salió mal"
          descripcion="Ocurrió un error inesperado en esta pantalla. Podés intentar nuevamente."
          onReintentar={() => this.setState({ error: null })}
        />
      );
    }

    return this.props.children;
  }
}
