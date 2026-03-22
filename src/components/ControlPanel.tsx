import { useState } from 'react';
import {
  type AnimationConfig,
  type TemplateStyle,
  type AnimationPreset,
  type ImageMask,
  TEMPLATE_PRESETS,
  SIZE_PRESETS,
  getRenderSize,
  getMotionConfig,
  getMediaEnhancement,
  withResolvedSize,
} from '@/lib/types';
import { generateFromJSON } from '@/lib/generate-from-json';
import { generateAnimationConfig } from '@/lib/ollama-animation';
import { Sparkles, Clapperboard, Type, ImageIcon, Gauge, Expand, TimerReset, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import PresetSelector from './PresetSelector';
import ImageUpload from './ImageUpload';
import { TEMPLATE_OPTIONS, resolveTemplateDebugName } from '@/templates';

interface Props {
  config: AnimationConfig;
  onChange: (config: AnimationConfig) => void;
}

const ANIMATION_PRESETS: { value: AnimationPreset; label: string }[] = [
  { value: 'cinematic-fade', label: 'Cinematic Fade' },
  { value: 'kinetic-typography', label: 'Kinetic Typography' },
  { value: 'glitch', label: 'Glitch' },
  { value: 'zoom-transition', label: 'Zoom Transition' },
];

const IMAGE_MASKS: { value: ImageMask; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'circle', label: 'Circle' },
  { value: 'vertical-slit', label: 'Vertical Slit' },
];

const AI_FALLBACK_TEMPLATE: TemplateStyle = 'minimal';

const ControlPanel = ({ config, onChange }: Props) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastAiConfig, setLastAiConfig] = useState<Record<string, unknown> | null>(null);
  const size = getRenderSize(config);
  const motion = getMotionConfig(config);
  const media = getMediaEnhancement(config);

  const update = (partial: Partial<AnimationConfig>) => onChange({ ...config, ...partial });

  const updateText = (field: keyof AnimationConfig['text'], value: string) =>
    onChange({ ...config, text: { ...config.text, [field]: value } });
  const updateTextSize = (field: 'headingSize' | 'subheadingSize' | 'captionSize', value: number) =>
    onChange({ ...config, [field]: value });

  const updateBg = (partial: Partial<AnimationConfig['background']>) =>
    onChange({ ...config, background: { ...config.background, ...partial } });

  const updateColor = (index: number, value: string) => {
    const colors = [...config.colors];
    colors[index] = value;
    update({ colors });
  };

  const updateMotion = (partial: Partial<typeof motion>) => {
    onChange({
      ...config,
      motion: {
        ...motion,
        ...partial,
      },
    });
  };

  const updateMedia = (partial: Partial<typeof media>) => {
    onChange({
      ...config,
      media: {
        ...media,
        ...partial,
      },
    });
  };

  const switchTemplate = (template: TemplateStyle) => {
    const preset = TEMPLATE_PRESETS[template];
    onChange({
      ...config,
      template,
      colors: preset.colors || config.colors,
      background: preset.background || config.background,
      motion: {
        ...motion,
        ...(preset.motion || {}),
      },
      media: {
        ...media,
        ...(preset.media || {}),
      },
    });
  };

  const applySizePreset = (preset: keyof typeof SIZE_PRESETS) => {
    onChange(withResolvedSize(config, SIZE_PRESETS[preset]));
  };

  const updateCustomSize = (field: 'width' | 'height', raw: string) => {
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value)) {
      return;
    }

    const nextSize = {
      preset: 'custom' as const,
      width: field === 'width' ? Math.max(320, value) : size.width,
      height: field === 'height' ? Math.max(320, value) : size.height,
    };

    onChange(withResolvedSize({ ...config, size: nextSize }, nextSize));
  };

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt || isGenerating) {
      return;
    }

    setIsGenerating(true);

    try {
      const aiConfig = await generateAnimationConfig(trimmedPrompt);
      const nextConfig = generateFromJSON({
        ...aiConfig,
        caption: config.text.caption,
        headingSize: config.headingSize,
        subheadingSize: config.subheadingSize,
        captionSize: config.captionSize,
        aspectRatio: config.aspectRatio,
        size: config.size
          ? {
              preset: config.size.preset,
              width: config.size.width,
              height: config.size.height,
            }
          : undefined,
      });

      console.log('AI CONFIG:', aiConfig);
      console.log('Using template:', nextConfig.template);
      setLastAiConfig(aiConfig as Record<string, unknown>);

      onChange({
        ...nextConfig,
        image: config.image,
        media: {
          ...nextConfig.media,
          mask: config.media?.mask ?? nextConfig.media?.mask,
        },
      });

      toast.success('Cinematic direction generated', {
        description: 'Preview updated with motion, camera, color mood, and pacing from local Qwen.',
      });
    } catch (error) {
      console.warn('AI generation failed. Applying minimal template fallback.', error);
      const fallbackConfig = generateFromJSON({
        template: AI_FALLBACK_TEMPLATE,
        caption: config.text.caption,
        aspectRatio: config.aspectRatio,
        size: config.size
          ? {
              preset: config.size.preset,
              width: config.size.width,
              height: config.size.height,
            }
          : undefined,
      });

      console.log('AI CONFIG:', {
        error: error instanceof Error ? error.message : 'Unknown AI error',
        fallbackTemplate: fallbackConfig.template,
      });
      console.log('Using template:', fallbackConfig.template);
      setLastAiConfig({
        error: error instanceof Error ? error.message : 'Unknown AI error',
        fallbackTemplate: fallbackConfig.template,
      });

      onChange({
        ...fallbackConfig,
        image: config.image,
        media: {
          ...fallbackConfig.media,
          mask: config.media?.mask ?? fallbackConfig.media?.mask,
        },
      });
      toast.warning('AI generation failed', {
        description: 'Using the minimal cinematic fallback. Start Ollama with `ollama run qwen3.5:9b` and try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <PresetSelector config={config} onApply={onChange} />

      <section>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <Sparkles className="w-3.5 h-3.5" /> AI Prompt
        </label>
        <div className="surface-raised rounded-lg p-3 flex flex-col gap-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your video"
            rows={4}
            className="w-full resize-none rounded-md bg-secondary border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isGenerating ? 'Generating...' : 'Generate Cinematic'}
          </button>
          <p className="text-[10px] text-muted-foreground">
            Uses local Ollama on <span className="font-mono">http://localhost:11434</span> to direct template, motion, text reveal, camera, depth, and pacing.
          </p>
        </div>
      </section>

      <section>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <Clapperboard className="w-3.5 h-3.5" /> Style
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATE_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => switchTemplate(s.value)}
              className={`px-3 py-2.5 rounded-md text-left transition-all active:scale-[0.97] ${
                config.template === s.value
                  ? 'bg-primary/15 ring-1 ring-primary/40 text-foreground'
                  : 'surface-raised text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="block text-sm font-medium leading-tight">{s.label}</span>
              <span className="block text-[10px] mt-1 opacity-60 leading-snug">{s.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <Type className="w-3.5 h-3.5" /> Text Content
        </label>
        <div className="flex flex-col gap-2.5">
          <input value={config.text.heading} onChange={(e) => updateText('heading', e.target.value)} placeholder="Heading" className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <input value={config.text.subheading} onChange={(e) => updateText('subheading', e.target.value)} placeholder="Subheading" className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
          <input value={config.text.caption} onChange={(e) => updateText('caption', e.target.value)} placeholder="Caption" className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        </div>

        <div className="space-y-3 mt-4">
          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Heading Size</span>
              <span>{Math.round(config.headingSize ?? 64)}px</span>
            </div>
            <input type="range" min={24} max={120} step={1} value={config.headingSize ?? 64} onChange={(e) => updateTextSize('headingSize', Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Subheading Size</span>
              <span>{Math.round(config.subheadingSize ?? 28)}px</span>
            </div>
            <input type="range" min={16} max={72} step={1} value={config.subheadingSize ?? 28} onChange={(e) => updateTextSize('subheadingSize', Number(e.target.value))} className="w-full" />
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Caption Size</span>
              <span>{Math.round(config.captionSize ?? 18)}px</span>
            </div>
            <input type="range" min={12} max={48} step={1} value={config.captionSize ?? 18} onChange={(e) => updateTextSize('captionSize', Number(e.target.value))} className="w-full" />
          </div>
        </div>
      </section>

      <section>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <Expand className="w-3.5 h-3.5" /> Canvas Size
        </label>
        <div className="grid grid-cols-1 gap-2">
          {(Object.keys(SIZE_PRESETS) as Array<keyof typeof SIZE_PRESETS>).map((presetKey) => {
            const preset = SIZE_PRESETS[presetKey];
            const isActive = size.preset === preset.preset;
            return (
              <button
                key={presetKey}
                onClick={() => applySizePreset(presetKey)}
                className={`px-3 py-2 rounded-md text-xs text-left transition-all active:scale-[0.97] ${
                  isActive ? 'bg-primary/15 text-foreground ring-1 ring-primary/40' : 'surface-raised text-muted-foreground'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
          <button
            onClick={() => onChange({ ...config, size: { ...size, preset: 'custom' } })}
            className={`px-3 py-2 rounded-md text-xs text-left transition-all active:scale-[0.97] ${
              size.preset === 'custom' ? 'bg-primary/15 text-foreground ring-1 ring-primary/40' : 'surface-raised text-muted-foreground'
            }`}
          >
            Custom
          </button>
        </div>

        {size.preset === 'custom' && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <input
              type="number"
              min={320}
              value={size.width}
              onChange={(e) => updateCustomSize('width', e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
              aria-label="Custom width"
            />
            <input
              type="number"
              min={320}
              value={size.height}
              onChange={(e) => updateCustomSize('height', e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm text-foreground"
              aria-label="Custom height"
            />
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-2">Applied to preview, animation layout, and export output.</p>
      </section>

      <section>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <TimerReset className="w-3.5 h-3.5" /> Timeline Controls
        </label>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Duration</span>
              <span>{motion.durationSec.toFixed(1)}s</span>
            </div>
            <input type="range" min={4} max={20} step={0.5} value={motion.durationSec} onChange={(e) => updateMotion({ durationSec: Number(e.target.value) })} className="w-full" />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Speed</span>
              <span>{motion.speedMultiplier.toFixed(2)}x</span>
            </div>
            <input type="range" min={0.5} max={2} step={0.05} value={motion.speedMultiplier} onChange={(e) => updateMotion({ speedMultiplier: Number(e.target.value) })} className="w-full" />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Scene Timing</span>
              <span>{motion.sceneTiming.toFixed(2)}</span>
            </div>
            <input type="range" min={0.6} max={1.6} step={0.05} value={motion.sceneTiming} onChange={(e) => updateMotion({ sceneTiming: Number(e.target.value) })} className="w-full" />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Depth</span>
              <span>{motion.depthIntensity.toFixed(2)}</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={motion.depthIntensity} onChange={(e) => updateMotion({ depthIntensity: Number(e.target.value) })} className="w-full" />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
              <span>Parallax</span>
              <span>{motion.parallaxIntensity.toFixed(2)}</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={motion.parallaxIntensity} onChange={(e) => updateMotion({ parallaxIntensity: Number(e.target.value) })} className="w-full" />
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {ANIMATION_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => updateMotion({ animationPreset: preset.value })}
                className={`px-2 py-2 rounded-md text-[11px] transition-all active:scale-[0.97] ${
                  motion.animationPreset === preset.value
                    ? 'bg-primary/15 text-foreground ring-1 ring-primary/40'
                    : 'surface-raised text-muted-foreground'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={motion.enable3D} onChange={(e) => updateMotion({ enable3D: e.target.checked })} />
            Enable 3D transforms
          </label>
        </div>
      </section>

      <section>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <ImageIcon className="w-3.5 h-3.5" /> Image Layer
        </label>
        <ImageUpload image={config.image} onChange={(img) => update({ image: img })} />

        <div className="grid grid-cols-2 gap-2 mt-3">
          {IMAGE_MASKS.map((mask) => (
            <button
              key={mask.value}
              onClick={() => updateMedia({ mask: mask.value })}
              className={`px-2 py-2 rounded-md text-[11px] transition-all active:scale-[0.97] ${
                media.mask === mask.value ? 'bg-primary/15 text-foreground ring-1 ring-primary/40' : 'surface-raised text-muted-foreground'
              }`}
            >
              {mask.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 mt-3">
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={media.kenBurns} onChange={(e) => updateMedia({ kenBurns: e.target.checked })} />
            Ken Burns zoom/pan
          </label>
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={media.blurTransitions} onChange={(e) => updateMedia({ blurTransitions: e.target.checked })} />
            Blur transitions
          </label>
        </div>
      </section>

      <section>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Colors
        </label>
        <div className="flex gap-3">
          {config.colors.map((c, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <label className="w-9 h-9 rounded-md cursor-pointer ring-1 ring-border hover:ring-primary/40 transition-all overflow-hidden" style={{ background: c }}>
                <input type="color" value={c} onChange={(e) => updateColor(i, e.target.value)} className="opacity-0 w-full h-full cursor-pointer" />
              </label>
              <span className="text-[9px] text-muted-foreground font-mono">{i === 0 ? 'Accent' : i === 1 ? 'Text' : 'Detail'}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <Gauge className="w-3.5 h-3.5" /> Background
        </label>
        <div className="flex gap-2 mb-3">
          {(['solid', 'gradient'] as const).map((t) => (
            <button key={t} onClick={() => updateBg({ type: t })} className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-all active:scale-[0.97] ${config.background.type === t ? 'bg-primary/15 text-foreground ring-1 ring-primary/40' : 'surface-raised text-muted-foreground'}`}>{t}</button>
          ))}
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <label className="w-9 h-9 rounded-md cursor-pointer ring-1 ring-border overflow-hidden" style={{ background: config.background.value }}>
              <input type="color" value={config.background.value} onChange={(e) => updateBg({ value: e.target.value })} className="opacity-0 w-full h-full cursor-pointer" />
            </label>
            <span className="text-[9px] text-muted-foreground">Start</span>
          </div>
          {config.background.type === 'gradient' && (
            <div className="flex flex-col items-center gap-1.5">
              <label className="w-9 h-9 rounded-md cursor-pointer ring-1 ring-border overflow-hidden" style={{ background: config.background.gradientEnd || '#000' }}>
                <input type="color" value={config.background.gradientEnd || '#000000'} onChange={(e) => updateBg({ gradientEnd: e.target.value })} className="opacity-0 w-full h-full cursor-pointer" />
              </label>
              <span className="text-[9px] text-muted-foreground">End</span>
            </div>
          )}
        </div>
      </section>

      <section>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          <Sparkles className="w-3.5 h-3.5" /> Debug
        </label>
        <div className="debug-panel surface-raised rounded-lg p-3 flex flex-col gap-2">
          <p className="text-[10px] text-muted-foreground">
            Using template: <span className="font-mono text-foreground">{config.template}</span> ({resolveTemplateDebugName(config.template)})
          </p>
          <pre className="max-h-64 overflow-auto rounded-md bg-secondary p-3 text-[10px] leading-relaxed text-foreground whitespace-pre-wrap break-all">
            {JSON.stringify({
              currentTemplate: config.template,
              currentTemplateComponent: resolveTemplateDebugName(config.template),
              lastAiConfig,
              currentConfig: config,
            }, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
};

export default ControlPanel;
