import type { ComponentType } from 'react';
import type { AnimationConfig, TemplateStyle } from '@/lib/types';
import LuxuryTemplate from './LuxuryTemplate';
import BoldTemplate from './BoldTemplate';
import MinimalTemplate from './MinimalTemplate';
import Cinematic3DIntro from './Cinematic3DIntro';
import ProductShowcase from './ProductShowcase';
import ModernTechReel from './ModernTechReel';
import KineticTypographyBurst from './KineticTypographyBurst';
import type { TemplateDefinition, TemplateProps } from './template-contract';

export const TEMPLATE_REGISTRY: Record<TemplateStyle, TemplateDefinition> = {
  luxury: {
    id: 'luxury',
    label: 'Luxury',
    description: 'Elegant serif composition with cinematic pacing.',
    supports3D: true,
    component: LuxuryTemplate,
  },
  bold: {
    id: 'bold',
    label: 'Bold',
    description: 'High-impact motion and strong typography.',
    supports3D: true,
    component: BoldTemplate,
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
    component: Cinematic3DIntro,
  },
  'product-showcase': {
    id: 'product-showcase',
    label: 'Product Showcase',
    description: 'Hero card reveal with image masking and camera feel.',
    supports3D: true,
    component: ProductShowcase,
  },
  'modern-tech': {
    id: 'modern-tech',
    label: 'Modern Tech Reel',
    description: 'Futuristic grid, clip reveals, and kinetic text.',
    supports3D: true,
    component: ModernTechReel,
  },
  'kinetic-burst': {
    id: 'kinetic-burst',
    label: 'Kinetic Typography Burst',
    description: 'High-energy character bursts with staggered typography.',
    supports3D: true,
    component: KineticTypographyBurst,
  },
};

export const TEMPLATES: Record<TemplateStyle, ComponentType<TemplateProps>> = {
  luxury: LuxuryTemplate,
  bold: BoldTemplate,
  minimal: MinimalTemplate,
  cinematic3d: Cinematic3DIntro,
  'product-showcase': ProductShowcase,
  'modern-tech': ModernTechReel,
  'kinetic-burst': KineticTypographyBurst,
};

export function renderTemplate(config: AnimationConfig): ComponentType<TemplateProps> {
  return TEMPLATE_REGISTRY[config.template]?.component || LuxuryTemplate;
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
