import type { JsonInput } from './generate-from-json';

type AiTemplate =
  | 'cinematic_intro'
  | 'luxury'
  | 'bold'
  | 'minimal'
  | 'modern_tech'
  | 'product_showcase'
  | 'kinetic_burst';

type AiMotionStyle = 'slow_dramatic' | 'energetic' | 'editorial_clean' | 'tech_precision';
type AiTextReveal = 'stagger_blur' | 'stagger_rise' | 'clean_fade' | 'impact_pop';
type AiCamera = 'zoom_in' | 'drift_left' | 'float' | 'static';
type AiBackgroundMood = 'dark_gradient' | 'warm_luxury' | 'neon_gradient' | 'grayscale';

interface OllamaGenerateResponse {
  response?: string;
}

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/generate';
const DEFAULT_MODEL = 'qwen3.5:9b';
const VALID_TEMPLATES = new Set<AiTemplate>(['cinematic_intro', 'luxury', 'bold', 'minimal', 'modern_tech', 'product_showcase', 'kinetic_burst']);
const VALID_MOTION_STYLES = new Set<AiMotionStyle>(['slow_dramatic', 'energetic', 'editorial_clean', 'tech_precision']);
const VALID_TEXT_REVEALS = new Set<AiTextReveal>(['stagger_blur', 'stagger_rise', 'clean_fade', 'impact_pop']);
const VALID_CAMERAS = new Set<AiCamera>(['zoom_in', 'drift_left', 'float', 'static']);
const VALID_BACKGROUNDS = new Set<AiBackgroundMood>(['dark_gradient', 'warm_luxury', 'neon_gradient', 'grayscale']);
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function getConfiguredModel(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_MODEL;
  }

  const configured = window.localStorage.getItem('model')?.trim();
  return configured || DEFAULT_MODEL;
}

function normalizeToken(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
}

function trimString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function normalizeTemplate(value: unknown): AiTemplate {
  const normalized = normalizeToken(value);
  if (VALID_TEMPLATES.has(normalized as AiTemplate)) {
    return normalized as AiTemplate;
  }

  if (normalized.includes('cinematic')) return 'cinematic_intro';
  if (normalized.includes('tech')) return 'modern_tech';
  if (normalized.includes('product')) return 'product_showcase';
  if (normalized.includes('kinetic')) return 'kinetic_burst';
  if (normalized.includes('lux')) return 'luxury';
  if (normalized.includes('bold')) return 'bold';
  return 'minimal';
}

function normalizeMotionStyle(value: unknown): AiMotionStyle | undefined {
  const normalized = normalizeToken(value);
  if (VALID_MOTION_STYLES.has(normalized as AiMotionStyle)) {
    return normalized as AiMotionStyle;
  }

  if (normalized.includes('energetic')) return 'energetic';
  if (normalized.includes('tech')) return 'tech_precision';
  if (normalized.includes('editorial') || normalized.includes('clean')) return 'editorial_clean';
  if (normalized.includes('dramatic') || normalized.includes('slow')) return 'slow_dramatic';
  return undefined;
}

function normalizeTextReveal(value: unknown): AiTextReveal | undefined {
  const normalized = normalizeToken(value);
  if (VALID_TEXT_REVEALS.has(normalized as AiTextReveal)) {
    return normalized as AiTextReveal;
  }

  if (normalized.includes('blur')) return 'stagger_blur';
  if (normalized.includes('rise')) return 'stagger_rise';
  if (normalized.includes('impact') || normalized.includes('pop')) return 'impact_pop';
  if (normalized.includes('clean') || normalized.includes('fade')) return 'clean_fade';
  return undefined;
}

function normalizeCamera(value: unknown): AiCamera | undefined {
  const normalized = normalizeToken(value);
  if (VALID_CAMERAS.has(normalized as AiCamera)) {
    return normalized as AiCamera;
  }

  if (normalized.includes('zoom')) return 'zoom_in';
  if (normalized.includes('drift')) return 'drift_left';
  if (normalized.includes('static')) return 'static';
  if (normalized) return 'float';
  return undefined;
}

function normalizeBackground(value: unknown): AiBackgroundMood | undefined {
  const normalized = normalizeToken(value);
  if (VALID_BACKGROUNDS.has(normalized as AiBackgroundMood)) {
    return normalized as AiBackgroundMood;
  }

  if (normalized.includes('neon') || normalized.includes('tech')) return 'neon_gradient';
  if (normalized.includes('gray') || normalized.includes('grey') || normalized.includes('minimal')) return 'grayscale';
  if (normalized.includes('warm') || normalized.includes('lux')) return 'warm_luxury';
  if (normalized.includes('dark')) return 'dark_gradient';
  return undefined;
}

function normalizeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return HEX_RE.test(trimmed) ? trimmed : undefined;
}

function normalizeTimingValue(value: unknown): number | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.min(12, Math.max(0.5, numeric));
}

function normalizeUnitInterval(value: unknown): number | undefined {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.min(1, Math.max(0, numeric));
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  const start = trimmed.indexOf('{');

  if (start === -1) {
    throw new Error('Model did not return JSON');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < trimmed.length; i += 1) {
    const char = trimmed[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return trimmed.slice(start, i + 1);
      }
    }
  }

  throw new Error('Model returned incomplete JSON');
}

function normalizeGeneratedConfig(raw: unknown): JsonInput {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Model returned an invalid payload');
  }

  const data = raw as Record<string, unknown>;
  const style = data.style && typeof data.style === 'object' ? data.style as Record<string, unknown> : undefined;
  const colors = data.colors && typeof data.colors === 'object' ? data.colors as Record<string, unknown> : undefined;
  const timing = data.timing && typeof data.timing === 'object' ? data.timing as Record<string, unknown> : undefined;

  return {
    template: normalizeTemplate(data.template),
    heading: trimString(data.heading, 72),
    subheading: trimString(data.subheading, 120),
    style: {
      motion: normalizeMotionStyle(style?.motion),
      textReveal: normalizeTextReveal(style?.textReveal),
      camera: normalizeCamera(style?.camera),
      depth: normalizeUnitInterval(style?.depth),
      parallax: normalizeUnitInterval(style?.parallax),
    },
    colors: {
      primary: normalizeColor(colors?.primary),
      background: normalizeBackground(colors?.background),
    },
    timing: {
      intro: normalizeTimingValue(timing?.intro),
      main: normalizeTimingValue(timing?.main),
      outro: normalizeTimingValue(timing?.outro),
    },
  };
}

function buildPrompt(prompt: string): string {
  return [
    'Convert user input into cinematic animation config.',
    'Think like a motion designer and cinematic motion director.',
    '',
    `Prompt: ${prompt}`,
    '',
    'Choose:',
    '- mood',
    '- motion style',
    '- pacing',
    '- camera movement',
    '',
    'Return ONLY minified JSON in this exact shape:',
    '{',
    '  "template": "cinematic_intro" | "luxury" | "bold" | "minimal" | "modern_tech" | "product_showcase" | "kinetic_burst",',
    '  "heading": "string",',
    '  "subheading": "string",',
    '  "style": {',
    '    "motion": "slow_dramatic" | "energetic" | "editorial_clean" | "tech_precision",',
    '    "textReveal": "stagger_blur" | "stagger_rise" | "clean_fade" | "impact_pop",',
    '    "camera": "zoom_in" | "drift_left" | "float" | "static",',
    '    "depth": number,',
    '    "parallax": number',
    '  },',
    '  "colors": {',
    '    "primary": "#RRGGBB",',
    '    "background": "dark_gradient" | "warm_luxury" | "neon_gradient" | "grayscale"',
    '  },',
    '  "timing": {',
    '    "intro": number,',
    '    "main": number,',
    '    "outro": number',
    '  }',
    '}',
    '',
    'Rules:',
    '- No markdown, no explanation, no extra keys.',
    '- Favor cinematic consistency over randomness.',
    '- luxury means warm gold with dark gradients.',
    '- tech means blue or neon accents with precise motion.',
    '- minimal means grayscale with restrained pacing.',
  ].join('\n');
}

export async function generateAnimationConfig(prompt: string): Promise<JsonInput> {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new Error('Prompt is required');
  }

  const MODEL = getConfiguredModel();
  console.log('Using model:', MODEL);

  const response = await fetch(OLLAMA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: buildPrompt(trimmedPrompt),
      stream: false,
    }),
  });

  if (!response.ok) {
    console.warn('AI failed, using fallback template');
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const data = await response.json() as OllamaGenerateResponse;
  if (typeof data.response !== 'string') {
    throw new Error('Ollama did not return a generated response');
  }

  const parsed = JSON.parse(extractJsonObject(data.response)) as unknown;
  return normalizeGeneratedConfig(parsed);
}
