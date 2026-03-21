export type TemplateStyle =
  | 'luxury'
  | 'bold'
  | 'minimal'
  | 'cinematic3d'
  | 'product-showcase'
  | 'modern-tech'
  | 'kinetic-burst';

export type BackgroundType = 'solid' | 'gradient';
export type AspectRatio = '9:16' | '16:9' | '1:1';
export type SizePreset = 'reel' | 'landscape' | 'square' | 'custom';
export type AnimationPreset = 'cinematic-fade' | 'kinetic-typography' | 'glitch' | 'zoom-transition';
export type ImageMask = 'none' | 'rounded' | 'circle' | 'vertical-slit';

export interface TextContent {
  heading: string;
  subheading: string;
  caption: string;
}

export interface RenderSizeConfig {
  preset: SizePreset;
  width: number;
  height: number;
}

export interface MotionConfig {
  durationSec: number;
  speedMultiplier: number;
  sceneTiming: number;
  animationPreset: AnimationPreset;
  depthIntensity: number;
  parallaxIntensity: number;
  enable3D: boolean;
}

export interface MediaEnhancementConfig {
  mask: ImageMask;
  kenBurns: boolean;
  blurTransitions: boolean;
}

export interface AnimationConfig {
  template: TemplateStyle;
  text: TextContent;
  headingSize?: number;
  subheadingSize?: number;
  captionSize?: number;
  colors: string[];
  background: {
    type: BackgroundType;
    value: string;
    gradientEnd?: string;
  };
  aspectRatio: AspectRatio;
  size?: Partial<RenderSizeConfig>;
  motion?: Partial<MotionConfig>;
  media?: Partial<MediaEnhancementConfig>;
  /** Optional image data URL or object URL for the image layer */
  image?: string | null;
}

export const SIZE_PRESETS: Record<Exclude<SizePreset, 'custom'>, RenderSizeConfig & { label: string; aspectRatio: AspectRatio }> = {
  reel: { preset: 'reel', label: '1080x1920 (Reels)', width: 1080, height: 1920, aspectRatio: '9:16' },
  landscape: { preset: 'landscape', label: '1920x1080 (Landscape)', width: 1920, height: 1080, aspectRatio: '16:9' },
  square: { preset: 'square', label: '1080x1080 (Square)', width: 1080, height: 1080, aspectRatio: '1:1' },
};

export const DEFAULT_MOTION: MotionConfig = {
  durationSec: 10,
  speedMultiplier: 1,
  sceneTiming: 1,
  animationPreset: 'cinematic-fade',
  depthIntensity: 0.45,
  parallaxIntensity: 0.35,
  enable3D: true,
};

export const DEFAULT_MEDIA_ENHANCEMENT: MediaEnhancementConfig = {
  mask: 'none',
  kenBurns: true,
  blurTransitions: true,
};

export const DEFAULT_CONFIG: AnimationConfig = {
  template: 'luxury',
  text: {
    heading: 'Timeless Elegance',
    subheading: 'Where vision meets craft',
    caption: 'Est. 2025',
  },
  headingSize: 64,
  subheadingSize: 28,
  captionSize: 18,
  colors: ['#D4A373', '#FEFAE0', '#CCD5AE'],
  background: {
    type: 'gradient',
    value: '#1a1a2e',
    gradientEnd: '#16213e',
  },
  aspectRatio: '9:16',
  size: SIZE_PRESETS.reel,
  motion: DEFAULT_MOTION,
  media: DEFAULT_MEDIA_ENHANCEMENT,
  image: null,
};

export const TEMPLATE_PRESETS: Record<TemplateStyle, Partial<AnimationConfig>> = {
  luxury: {
    colors: ['#D4A373', '#FEFAE0', '#CCD5AE'],
    background: { type: 'gradient', value: '#1a1a2e', gradientEnd: '#0f0f23' },
  },
  bold: {
    colors: ['#FF6B35', '#F7F7F7', '#004E89'],
    background: { type: 'solid', value: '#0A0A0A' },
  },
  minimal: {
    colors: ['#2D3436', '#636E72', '#B2BEC3'],
    background: { type: 'gradient', value: '#DFE6E9', gradientEnd: '#F5F6FA' },
  },
  cinematic3d: {
    colors: ['#A8DADC', '#F1FAEE', '#457B9D'],
    background: { type: 'gradient', value: '#0B1023', gradientEnd: '#1A2455' },
  },
  'product-showcase': {
    colors: ['#F4A261', '#F8F9FA', '#2A9D8F'],
    background: { type: 'gradient', value: '#0F172A', gradientEnd: '#1E293B' },
  },
  'modern-tech': {
    colors: ['#7CFFCB', '#E6F1FF', '#5B8CFF'],
    background: { type: 'gradient', value: '#030712', gradientEnd: '#111827' },
  },
  'kinetic-burst': {
    colors: ['#FF8A3D', '#F8FAFC', '#94A3B8'],
    background: { type: 'gradient', value: '#111827', gradientEnd: '#1F2937' },
  },
};

function inferAspectRatio(width: number, height: number): AspectRatio {
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.05) return '1:1';
  if (ratio > 1) return '16:9';
  return '9:16';
}

export function getRenderSize(config: AnimationConfig): RenderSizeConfig {
  const preset = config.size?.preset;
  if (preset && preset !== 'custom' && SIZE_PRESETS[preset]) {
    return SIZE_PRESETS[preset];
  }

  const width = Math.max(320, Math.floor(config.size?.width || 0));
  const height = Math.max(320, Math.floor(config.size?.height || 0));

  if (preset === 'custom' && width > 0 && height > 0) {
    return {
      preset: 'custom',
      width,
      height,
    };
  }

  if (config.aspectRatio === '16:9') return SIZE_PRESETS.landscape;
  if (config.aspectRatio === '1:1') return SIZE_PRESETS.square;
  return SIZE_PRESETS.reel;
}

export function getMotionConfig(config: AnimationConfig): MotionConfig {
  return {
    ...DEFAULT_MOTION,
    ...(config.motion || {}),
  };
}

export function getMediaEnhancement(config: AnimationConfig): MediaEnhancementConfig {
  return {
    ...DEFAULT_MEDIA_ENHANCEMENT,
    ...(config.media || {}),
  };
}

export function getResponsiveTextSizes(config: AnimationConfig): { heading: number; subheading: number; caption: number } {
  const size = getRenderSize(config);
  const scale = Math.max(0.6, Math.min(1.5, Math.min(size.width, size.height) / 1080));
  const heading = Math.round((config.headingSize ?? DEFAULT_CONFIG.headingSize ?? 64) * scale);
  const subheading = Math.round((config.subheadingSize ?? DEFAULT_CONFIG.subheadingSize ?? 28) * scale);
  const caption = Math.round((config.captionSize ?? DEFAULT_CONFIG.captionSize ?? 18) * scale);

  return {
    heading: Math.max(16, heading),
    subheading: Math.max(12, subheading),
    caption: Math.max(10, caption),
  };
}

export function withResolvedSize(config: AnimationConfig, size: RenderSizeConfig): AnimationConfig {
  return {
    ...config,
    aspectRatio: inferAspectRatio(size.width, size.height),
    size,
  };
}

