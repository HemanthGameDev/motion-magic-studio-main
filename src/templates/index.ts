import { createElement, type ComponentType } from 'react';
import type { AnimationConfig, TemplateStyle } from '@/lib/types';
import LuxuryTemplate from './LuxuryTemplate';
import BoldTemplate from './BoldTemplate';
import MinimalTemplate from './MinimalTemplate';
import Cinematic3DIntro from './Cinematic3DIntro';
import ProductShowcase from './ProductShowcase';
import ModernTechReel from './ModernTechReel';
import KineticTypographyBurst from './KineticTypographyBurst';
import type { TemplateDefinition, TemplateProps } from './template-contract';
import TemplateErrorBoundary from './TemplateErrorBoundary';

function withTemplateGuard(Component: ComponentType<TemplateProps>, templateName: TemplateStyle): ComponentType<TemplateProps> {
  return function GuardedTemplate(props: TemplateProps) {
    const resetKey = [
      props.config.template,
      props.config.text.heading,
      props.config.text.subheading,
      props.config.text.caption,
      props.config.image || '',
    ].join('|');

    return createElement(
      TemplateErrorBoundary,
      {
        config: props.config,
        isPlaying: props.isPlaying,
        onComplete: props.onComplete,
        onTimelineReady: props.onTimelineReady,
        templateName,
        resetKey,
      },
      createElement(Component, props),
    );
  };
}

const GuardedLuxuryTemplate = withTemplateGuard(LuxuryTemplate, 'luxury');
const GuardedBoldTemplate = withTemplateGuard(BoldTemplate, 'bold');
const GuardedCinematic3DIntro = withTemplateGuard(Cinematic3DIntro, 'cinematic3d');
const GuardedProductShowcase = withTemplateGuard(ProductShowcase, 'product-showcase');
const GuardedModernTechReel = withTemplateGuard(ModernTechReel, 'modern-tech');
const GuardedKineticTypographyBurst = withTemplateGuard(KineticTypographyBurst, 'kinetic-burst');

export const TEMPLATE_REGISTRY: Record<TemplateStyle, TemplateDefinition> = {
  luxury: {
    id: 'luxury',
    label: 'Luxury',
    description: 'Elegant serif composition with cinematic pacing.',
    supports3D: true,
    component: GuardedLuxuryTemplate,
  },
  bold: {
    id: 'bold',
    label: 'Bold',
    description: 'High-impact motion and strong typography.',
    supports3D: true,
    component: GuardedBoldTemplate,
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    description: 'Clean editorial look with restrained motion.',
    supports3D: false,
    component: MinimalTemplate,
  },
  cinematic3d: {
    id: 'cinematic3d',
    label: 'Cinematic 3D Intro',
    description: 'Depth layers, perspective motion, and dramatic reveal.',
    supports3D: true,
    component: GuardedCinematic3DIntro,
  },
  'product-showcase': {
    id: 'product-showcase',
    label: 'Product Showcase',
    description: 'Hero card reveal with image masking and camera feel.',
    supports3D: true,
    component: GuardedProductShowcase,
  },
  'modern-tech': {
    id: 'modern-tech',
    label: 'Modern Tech Reel',
    description: 'Futuristic grid, clip reveals, and kinetic text.',
    supports3D: true,
    component: GuardedModernTechReel,
  },
  'kinetic-burst': {
    id: 'kinetic-burst',
    label: 'Kinetic Typography Burst',
    description: 'High-energy character bursts with staggered typography.',
    supports3D: true,
    component: GuardedKineticTypographyBurst,
  },
};

export const TEMPLATES: Record<TemplateStyle, ComponentType<TemplateProps>> = {
  luxury: GuardedLuxuryTemplate,
  bold: GuardedBoldTemplate,
  minimal: MinimalTemplate,
  cinematic3d: GuardedCinematic3DIntro,
  'product-showcase': GuardedProductShowcase,
  'modern-tech': GuardedModernTechReel,
  'kinetic-burst': GuardedKineticTypographyBurst,
};

export function renderTemplate(config: AnimationConfig): ComponentType<TemplateProps> {
  return TEMPLATE_REGISTRY[config.template]?.component || GuardedLuxuryTemplate;
}

export const TEMPLATE_OPTIONS = Object.values(TEMPLATE_REGISTRY).map((entry) => ({
  value: entry.id,
  label: entry.label,
  desc: entry.description,
}));

export {
  LuxuryTemplate,
  BoldTemplate,
  MinimalTemplate,
  Cinematic3DIntro,
  ProductShowcase,
  ModernTechReel,
  KineticTypographyBurst,
};
