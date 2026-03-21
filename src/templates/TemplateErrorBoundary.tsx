import React from 'react';
import MinimalTemplate from './MinimalTemplate';
import type { TemplateProps } from './template-contract';

interface Props extends TemplateProps {
  children: React.ReactNode;
  templateName: string;
  resetKey: string;
}

interface State {
  hasError: boolean;
}

class TemplateErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn(`Template render failed for "${this.props.templateName}". Falling back to MinimalTemplate.`, error);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <MinimalTemplate
          config={this.props.config}
          isPlaying={this.props.isPlaying}
          onComplete={this.props.onComplete}
          onTimelineReady={this.props.onTimelineReady}
        />
      );
    }

    return this.props.children;
  }
}

export default TemplateErrorBoundary;
