import type { ComponentType } from 'react';
import type gsap from 'gsap';
import type { AnimationConfig, TemplateStyle } from '@/lib/types';

export interface TemplateProps {
  config: AnimationConfig;
  isPlaying: boolean;
  onComplete?: () => void;
  onTimelineReady?: (timeline: gsap.core.Timeline | null) => void;
}

export interface TemplateDefinition {
  id: TemplateStyle;
  label: string;
  description: string;
  supports3D?: boolean;
  component: ComponentType<TemplateProps>;
}
