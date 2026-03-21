import type {
  AnimationConfig,
  TemplateStyle,
  BackgroundType,
  AspectRatio,
  AnimationPreset,
  ImageMask,
  SizePreset,
} from './types';
import {
  DEFAULT_CONFIG,
  TEMPLATE_PRESETS,
  SIZE_PRESETS,
  getMotionConfig,
  getMediaEnhancement,
  withResolvedSize,
} from './types';

/**
 * AI-ready configuration interface.
 * Accepts a loose JSON object (e.g. from an LLM) and produces
 * a valid, type-safe AnimationConfig.
 */
export interface JsonInput {
  template?: string;
  animationType?: string;
  animation?: string;
  style?: {
    motion?: string;
    textReveal?: string;
    camera?: string;
    depth?: number;
    parallax?: number;
  };
  text?: {
    heading?: string;
    subheading?: string;
    caption?: string;
  };
  heading?: string;
  subheading?: string;
  caption?: string;
  colors?: string[] | {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
  };
  background?: string | { type?: string; value?: string; gradientEnd?: string };
  timing?: {
    intro?: number;
    main?: number;
    outro?: number;
  };
  aspectRatio?: string;
  size?: {
    preset?: string;
    width?: number;
    height?: number;
  };
  width?: number;
  height?: number;
  headingSize?: number;
  subheadingSize?: number;
  captionSize?: number;
  motion?: {
    durationSec?: number;
    speedMultiplier?: number;
    sceneTiming?: number;
    animationPreset?: string;
    depthIntensity?: number;
    parallaxIntensity?: number;
    enable3D?: boolean;
  };
  media?: {
    mask?: string;
    kenBurns?: boolean;
    blurTransitions?: boolean;
  };
}

const VALID_TEMPLATES: TemplateStyle[] = ['luxury', 'bold', 'minimal', 'cinematic3d', 'product-showcase', 'modern-tech', 'kinetic-burst'];
const VALID_BG_TYPES: BackgroundType[] = ['solid', 'gradient'];
const VALID_RATIOS: AspectRatio[] = ['9:16', '16:9', '1:1'];
const VALID_ANIMATION_PRESETS: AnimationPreset[] = ['cinematic-fade', 'kinetic-typography', 'glitch', 'zoom-transition'];
const VALID_MASKS: ImageMask[] = ['none', 'rounded', 'circle', 'vertical-slit'];
const VALID_SIZE_PRESETS: SizePreset[] = ['reel', 'landscape', 'square', 'custom'];
const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

type ColorMood = 'luxury-dark' | 'tech-neon' | 'minimal-gray' | 'bold-impact';

const TEMPLATE_ALIASES: Record<string, TemplateStyle> = {
  cinematic_intro: 'cinematic3d',
  'cinematic-intro': 'cinematic3d',
  cinematic3d: 'cinematic3d',
  product_showcase: 'product-showcase',
  modern_tech: 'modern-tech',
  kinetic_burst: 'kinetic-burst',
};

const COLOR_MOOD_PRESETS: Record<ColorMood, { colors: string[]; background: { type: BackgroundType; value: string; gradientEnd?: string } }> = {
  'luxury-dark': {
    colors: ['#D4A373', '#FEFAE0', '#CCD5AE'],
    background: { type: 'gradient', value: '#120D12', gradientEnd: '#2A1F27' },
  },
  'tech-neon': {
    colors: ['#63E6FF', '#E6F1FF', '#5B8CFF'],
    background: { type: 'gradient', value: '#030712', gradientEnd: '#111827' },
  },
  'minimal-gray': {
    colors: ['#E5E7EB', '#9CA3AF', '#4B5563'],
    background: { type: 'gradient', value: '#111827', gradientEnd: '#374151' },
  },
  'bold-impact': {
    colors: ['#FF6B35', '#F7F7F7', '#004E89'],
    background: { type: 'gradient', value: '#0A0A0A', gradientEnd: '#1F2937' },
  },
};

const DIRECTOR_STYLES = {
  slow_dramatic: {
    animationPreset: 'cinematic-fade' as AnimationPreset,
    durationSec: 10,
    speedMultiplier: 0.82,
    sceneTiming: 1.2,
    depthIntensity: 0.55,
    parallaxIntensity: 0.3,
    blurTransitions: true,
    kenBurns: true,
  },
  energetic: {
    animationPreset: 'kinetic-typography' as AnimationPreset,
    durationSec: 6.5,
    speedMultiplier: 1.2,
    sceneTiming: 0.78,
    depthIntensity: 0.4,
    parallaxIntensity: 0.24,
    blurTransitions: false,
    kenBurns: true,
  },
  editorial_clean: {
    animationPreset: 'cinematic-fade' as AnimationPreset,
    durationSec: 7.5,
    speedMultiplier: 0.95,
    sceneTiming: 1.02,
    depthIntensity: 0.18,
    parallaxIntensity: 0.08,
    blurTransitions: false,
    kenBurns: false,
  },
  tech_precision: {
    animationPreset: 'zoom-transition' as AnimationPreset,
    durationSec: 7.2,
    speedMultiplier: 1.05,
    sceneTiming: 0.86,
    depthIntensity: 0.42,
    parallaxIntensity: 0.18,
    blurTransitions: true,
    kenBurns: false,
  },
};

const TEXT_REVEAL_PRESETS = {
  stagger_blur: {
    animationPreset: 'cinematic-fade' as AnimationPreset,
    blurTransitions: true,
  },
  stagger_rise: {
    animationPreset: 'kinetic-typography' as AnimationPreset,
    blurTransitions: false,
  },
  clean_fade: {
    animationPreset: 'cinematic-fade' as AnimationPreset,
    blurTransitions: false,
  },
  impact_pop: {
    animationPreset: 'kinetic-typography' as AnimationPreset,
    blurTransitions: false,
  },
};

const CAMERA_STYLES = {
  zoom_in: {
    animationPreset: 'zoom-transition' as AnimationPreset,
    depthIntensity: 0.58,
    parallaxIntensity: 0.34,
  },
  drift_left: {
    depthIntensity: 0.46,
    parallaxIntensity: 0.26,
  },
  float: {
    depthIntensity: 0.4,
    parallaxIntensity: 0.2,
  },
  static: {
    depthIntensity: 0.12,
    parallaxIntensity: 0.04,
  },
};

function isValidHex(v: string): boolean {
  return HEX_RE.test(v);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizeToken(value?: string): string {
  return value?.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_') || '';
}

function resolveTemplateStyle(value?: string): TemplateStyle {
  const normalized = normalizeToken(value);

  if (VALID_TEMPLATES.includes(normalized as TemplateStyle)) {
    return normalized as TemplateStyle;
  }

  if (TEMPLATE_ALIASES[normalized]) {
    return TEMPLATE_ALIASES[normalized];
  }

  if (normalized.includes('cinematic')) return 'cinematic3d';
  if (normalized.includes('tech')) return 'modern-tech';
  if (normalized.includes('product')) return 'product-showcase';
  if (normalized.includes('kinetic')) return 'kinetic-burst';
  if (normalized.includes('lux')) return 'luxury';
  if (normalized.includes('bold')) return 'bold';
  return 'minimal';
}

function resolveDefaultDirectorStyle(template: TemplateStyle): keyof typeof DIRECTOR_STYLES {
  if (template === 'modern-tech') return 'tech_precision';
  if (template === 'bold' || template === 'kinetic-burst') return 'energetic';
  if (template === 'minimal') return 'editorial_clean';
  return 'slow_dramatic';
}

function resolveDirectorStyle(styleMotion: string | undefined, template: TemplateStyle) {
  const normalized = normalizeToken(styleMotion);

  if (normalized && normalized in DIRECTOR_STYLES) {
    return DIRECTOR_STYLES[normalized as keyof typeof DIRECTOR_STYLES];
  }

  if (normalized.includes('energetic')) return DIRECTOR_STYLES.energetic;
  if (normalized.includes('tech')) return DIRECTOR_STYLES.tech_precision;
  if (normalized.includes('editorial') || normalized.includes('clean')) return DIRECTOR_STYLES.editorial_clean;
  return DIRECTOR_STYLES[resolveDefaultDirectorStyle(template)];
}

function resolveTextReveal(value?: string) {
  const normalized = normalizeToken(value);

  if (normalized && normalized in TEXT_REVEAL_PRESETS) {
    return TEXT_REVEAL_PRESETS[normalized as keyof typeof TEXT_REVEAL_PRESETS];
  }

  if (normalized.includes('blur')) return TEXT_REVEAL_PRESETS.stagger_blur;
  if (normalized.includes('rise')) return TEXT_REVEAL_PRESETS.stagger_rise;
  if (normalized.includes('impact') || normalized.includes('pop')) return TEXT_REVEAL_PRESETS.impact_pop;
  return undefined;
}

function resolveCameraStyle(value?: string) {
  const normalized = normalizeToken(value);

  if (normalized && normalized in CAMERA_STYLES) {
    return CAMERA_STYLES[normalized as keyof typeof CAMERA_STYLES];
  }

  if (normalized.includes('zoom')) return CAMERA_STYLES.zoom_in;
  if (normalized.includes('drift')) return CAMERA_STYLES.drift_left;
  if (normalized.includes('static')) return CAMERA_STYLES.static;
  if (normalized) return CAMERA_STYLES.float;
  return undefined;
}

function resolveColorMood(template: TemplateStyle, backgroundHint?: string): ColorMood {
  const normalized = normalizeToken(backgroundHint);

  if (normalized.includes('neon') || normalized.includes('tech')) return 'tech-neon';
  if (normalized.includes('gray') || normalized.includes('grey') || normalized.includes('minimal')) return 'minimal-gray';
  if (normalized.includes('bold')) return 'bold-impact';
  if (normalized.includes('warm') || normalized.includes('luxury') || normalized.includes('dark')) return 'luxury-dark';

  if (template === 'modern-tech') return 'tech-neon';
  if (template === 'minimal') return 'minimal-gray';
  if (template === 'bold' || template === 'kinetic-burst') return 'bold-impact';
  return 'luxury-dark';
}

function resolveTimingDuration(timing?: JsonInput['timing']): { durationSec?: number; sceneTiming?: number } {
  const intro = Number(timing?.intro ?? NaN);
  const main = Number(timing?.main ?? NaN);
  const outro = Number(timing?.outro ?? NaN);

  if (![intro, main, outro].every(Number.isFinite)) {
    return {};
  }

  const durationSec = clamp(intro + main + outro, 3, 20);
  const averageSegment = durationSec / 3;
  const sceneTiming = clamp(main / Math.max(0.5, averageSegment), 0.6, 1.8);

  return { durationSec, sceneTiming };
}

function resolveAnimationPreset(value?: string): AnimationPreset | undefined {
  if (!value) return undefined;

  const normalized = value.trim().toLowerCase();
  if (VALID_ANIMATION_PRESETS.includes(normalized as AnimationPreset)) {
    return normalized as AnimationPreset;
  }

  if (normalized.includes('glitch')) return 'glitch';
  if (normalized.includes('kinetic')) return 'kinetic-typography';
  if (normalized.includes('zoom')) return 'zoom-transition';
  if (normalized.includes('fade') || normalized.includes('cinematic')) return 'cinematic-fade';

  return undefined;
}

/**
 * Convert a loose JSON config (e.g. from AI) into a validated AnimationConfig.
 * Invalid or missing fields fall back to defaults.
 */
export function generateFromJSON(input: JsonInput): AnimationConfig {
  const templateHint = input.template || input.animationType || input.animation;
  const template = resolveTemplateStyle(templateHint);

  const preset = TEMPLATE_PRESETS[template];
  const directorStyle = resolveDirectorStyle(input.style?.motion, template);
  const textReveal = resolveTextReveal(input.style?.textReveal);
  const cameraStyle = resolveCameraStyle(input.style?.camera);
  const timingProfile = resolveTimingDuration(input.timing);

  const textInput = input.text || {};
  const text = {
    heading: textInput.heading?.trim() || input.heading?.trim() || DEFAULT_CONFIG.text.heading,
    subheading: textInput.subheading?.trim() || input.subheading?.trim() || DEFAULT_CONFIG.text.subheading,
    caption: textInput.caption?.trim() || input.caption?.trim() || DEFAULT_CONFIG.text.caption,
  };

  const colorInput = input.colors;
  const colorMood = resolveColorMood(
    template,
    !Array.isArray(colorInput) && colorInput && typeof colorInput === 'object' ? colorInput.background : undefined,
  );
  const moodPreset = COLOR_MOOD_PRESETS[colorMood];
  const fallbackColors = moodPreset.colors || preset.colors || DEFAULT_CONFIG.colors;

  let colors = Array.isArray(colorInput) && colorInput.length >= 2
    ? colorInput.slice(0, 3).map((c, i) => (isValidHex(c) ? c : fallbackColors[i] || fallbackColors[0]))
    : [...fallbackColors];

  if (!Array.isArray(colorInput) && colorInput && typeof colorInput === 'object') {
    if (colorInput.primary && isValidHex(colorInput.primary)) colors[0] = colorInput.primary;
    if (colorInput.secondary && isValidHex(colorInput.secondary)) colors[1] = colorInput.secondary;
    if (colorInput.accent && isValidHex(colorInput.accent)) colors[2] = colorInput.accent;
  }

  while (colors.length < 3) colors.push(fallbackColors[colors.length] || fallbackColors[0]);

  let background = moodPreset.background || preset.background || DEFAULT_CONFIG.background;
  if (typeof input.background === 'string') {
    if (input.background === 'gradient') {
      background = { type: 'gradient', value: background.value, gradientEnd: background.gradientEnd };
    } else if (input.background === 'solid') {
      background = { type: 'solid', value: background.value };
    } else if (isValidHex(input.background)) {
      background = { type: 'solid', value: input.background };
    }
  } else if (input.background && typeof input.background === 'object') {
    const bgType: BackgroundType = VALID_BG_TYPES.includes(input.background.type as BackgroundType)
      ? (input.background.type as BackgroundType)
      : background.type;
    const bgValue = input.background.value && isValidHex(input.background.value)
      ? input.background.value
      : background.value;
    const bgEnd = input.background.gradientEnd && isValidHex(input.background.gradientEnd)
      ? input.background.gradientEnd
      : background.gradientEnd;
    background = { type: bgType, value: bgValue, gradientEnd: bgEnd };
  }

  const aspectRatio: AspectRatio = VALID_RATIOS.includes(input.aspectRatio as AspectRatio)
    ? (input.aspectRatio as AspectRatio)
    : DEFAULT_CONFIG.aspectRatio;

  const motionDefaults = getMotionConfig(DEFAULT_CONFIG);
  const mediaDefaults = getMediaEnhancement(DEFAULT_CONFIG);

  const motionInput = input.motion || {};
  const animationPreset = resolveAnimationPreset(input.animationType || input.animation)
    || textReveal?.animationPreset
    || cameraStyle?.animationPreset
    || resolveAnimationPreset(motionInput.animationPreset)
    || directorStyle.animationPreset;
  const motion = {
    ...motionDefaults,
    durationSec: clamp(Number(timingProfile.durationSec ?? motionInput.durationSec ?? directorStyle.durationSec ?? motionDefaults.durationSec), 2, 20),
    speedMultiplier: clamp(Number(motionInput.speedMultiplier ?? directorStyle.speedMultiplier ?? motionDefaults.speedMultiplier), 0.25, 2.5),
    sceneTiming: clamp(Number(timingProfile.sceneTiming ?? motionInput.sceneTiming ?? directorStyle.sceneTiming ?? motionDefaults.sceneTiming), 0.5, 1.8),
    animationPreset: animationPreset ?? motionDefaults.animationPreset,
    depthIntensity: clamp(Number(input.style?.depth ?? motionInput.depthIntensity ?? cameraStyle?.depthIntensity ?? directorStyle.depthIntensity ?? motionDefaults.depthIntensity), 0, 1),
    parallaxIntensity: clamp(Number(input.style?.parallax ?? motionInput.parallaxIntensity ?? cameraStyle?.parallaxIntensity ?? directorStyle.parallaxIntensity ?? motionDefaults.parallaxIntensity), 0, 1),
    enable3D: typeof motionInput.enable3D === 'boolean'
      ? motionInput.enable3D
      : template !== 'minimal',
  };

  const mediaInput = input.media || {};
  const media = {
    ...mediaDefaults,
    mask: VALID_MASKS.includes(mediaInput.mask as ImageMask) ? (mediaInput.mask as ImageMask) : mediaDefaults.mask,
    kenBurns: typeof mediaInput.kenBurns === 'boolean' ? mediaInput.kenBurns : directorStyle.kenBurns,
    blurTransitions: typeof mediaInput.blurTransitions === 'boolean'
      ? mediaInput.blurTransitions
      : (textReveal?.blurTransitions ?? directorStyle.blurTransitions ?? mediaDefaults.blurTransitions),
  };

  const baseConfig: AnimationConfig = {
    ...DEFAULT_CONFIG,
    template,
    text,
    headingSize: clamp(Number(input.headingSize ?? DEFAULT_CONFIG.headingSize), 24, 120),
    subheadingSize: clamp(Number(input.subheadingSize ?? DEFAULT_CONFIG.subheadingSize), 16, 72),
    captionSize: clamp(Number(input.captionSize ?? DEFAULT_CONFIG.captionSize), 12, 48),
    colors,
    background,
    aspectRatio,
    motion,
    media,
  };

  const sizePreset = input.size?.preset;
  if (VALID_SIZE_PRESETS.includes(sizePreset as SizePreset) && sizePreset !== 'custom') {
    return withResolvedSize(baseConfig, SIZE_PRESETS[sizePreset as Exclude<SizePreset, 'custom'>]);
  }

  const customWidth = Number(input.size?.width ?? input.width ?? 0);
  const customHeight = Number(input.size?.height ?? input.height ?? 0);
  if (customWidth > 0 && customHeight > 0) {
    return withResolvedSize(baseConfig, {
      preset: 'custom',
      width: Math.max(320, Math.floor(customWidth)),
      height: Math.max(320, Math.floor(customHeight)),
    });
  }

  if (aspectRatio === '16:9') {
    return withResolvedSize(baseConfig, SIZE_PRESETS.landscape);
  }
  if (aspectRatio === '1:1') {
    return withResolvedSize(baseConfig, SIZE_PRESETS.square);
  }
  return withResolvedSize(baseConfig, SIZE_PRESETS.reel);
}
