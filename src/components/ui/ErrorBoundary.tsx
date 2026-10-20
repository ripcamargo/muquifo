import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** O que mostrar no lugar do conteúdo que quebrou. Recebe uma função para tentar de novo. */
  fallback: (retry: () => void) => ReactNode;
  children: ReactNode;
}

/** Impede que um erro inesperado num trecho (agendamento, painel) derrube a página inteira. */
export class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro na interface', error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback(() => this.setState({ failed: false })) : this.props.children;
  }
}
