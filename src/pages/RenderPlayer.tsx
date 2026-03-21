import { useEffect, useMemo, useRef, useState } from 'react';
import type gsap from 'gsap';
import { renderTemplate } from '@/templates';
import { DEFAULT_CONFIG, getRenderSize, type AnimationConfig } from '@/lib/types';
import { generateFromJSON } from '@/lib/generate-from-json';

declare global {
  interface Window {
    __MOTION_RENDER__?: {
      ready: boolean;
      getDurationMs: () => number;
      seek: (seconds: number) => Promise<void>;
      play: () => void;
    };
  }
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hydrateRenderConfig(raw: unknown): AnimationConfig {
  if (!isObject(raw)) {
    return DEFAULT_CONFIG;
  }

  const input = raw as Record<string, unknown>;
  const text = isObject(input.text) ? input.text : undefined;
  const size = isObject(input.size) ? input.size : undefined;
  const motion = isObject(input.motion) ? input.motion : undefined;
  const media = isObject(input.media) ? input.media : undefined;
  const base = generateFromJSON({
    template: typeof input.template === 'string' ? input.template : undefined,
    heading: typeof text?.heading === 'string' ? text.heading : (typeof input.heading === 'string' ? input.heading : undefined),
    subheading: typeof text?.subheading === 'string' ? text.subheading : (typeof input.subheading === 'string' ? input.subheading : undefined),
    caption: typeof text?.caption === 'string' ? text.caption : (typeof input.caption === 'string' ? input.caption : undefined),
    colors: Array.isArray(input.colors) ? input.colors.filter((value): value is string => typeof value === 'string') : undefined,
    background: isObject(input.background) || typeof input.background === 'string' ? input.background as never : undefined,
    aspectRatio: typeof input.aspectRatio === 'string' ? input.aspectRatio : undefined,
    size: size ? {
      preset: typeof size.preset === 'string' ? size.preset : undefined,
      width: typeof size.width === 'number' ? size.width : undefined,
      height: typeof size.height === 'number' ? size.height : undefined,
    } : undefined,
    headingSize: typeof input.headingSize === 'number' ? input.headingSize : undefined,
    subheadingSize: typeof input.subheadingSize === 'number' ? input.subheadingSize : undefined,
    captionSize: typeof input.captionSize === 'number' ? input.captionSize : undefined,
    motion: motion ? {
      durationSec: typeof motion.durationSec === 'number' ? motion.durationSec : undefined,
      speedMultiplier: typeof motion.speedMultiplier === 'number' ? motion.speedMultiplier : undefined,
      sceneTiming: typeof motion.sceneTiming === 'number' ? motion.sceneTiming : undefined,
      animationPreset: typeof motion.animationPreset === 'string' ? motion.animationPreset : undefined,
      depthIntensity: typeof motion.depthIntensity === 'number' ? motion.depthIntensity : undefined,
      parallaxIntensity: typeof motion.parallaxIntensity === 'number' ? motion.parallaxIntensity : undefined,
      enable3D: typeof motion.enable3D === 'boolean' ? motion.enable3D : undefined,
    } : undefined,
    media: media ? {
      mask: typeof media.mask === 'string' ? media.mask : undefined,
      kenBurns: typeof media.kenBurns === 'boolean' ? media.kenBurns : undefined,
      blurTransitions: typeof media.blurTransitions === 'boolean' ? media.blurTransitions : undefined,
    } : undefined,
  });

  return {
    ...base,
    image: typeof input.image === 'string' ? input.image : null,
  };
}

const RenderPlayer = () => {
  const [config, setConfig] = useState<AnimationConfig>(DEFAULT_CONFIG);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const configId = params.get('configId');
        const payload = params.get('payload');

        if (configId) {
          const response = await fetch(`/render-config/${encodeURIComponent(configId)}`);
          if (!response.ok) {
            throw new Error(`Failed to load render config ${configId}`);
          }
          const data = await response.json() as { config?: unknown };
          setConfig(hydrateRenderConfig(data.config));
          return;
        }

        if (payload) {
          setConfig(hydrateRenderConfig(JSON.parse(payload)));
          return;
        }

        setConfig(DEFAULT_CONFIG);
      } catch (loadError) {
        console.warn('RenderPlayer failed to load config. Falling back to defaults.', loadError);
        setError('Failed to load render config');
        setConfig(DEFAULT_CONFIG);
      }
    };

    void loadConfig();
  }, []);

  const renderSize = getRenderSize(config);
  const TemplateComponent = useMemo(() => renderTemplate(config), [config]);

  useEffect(() => {
    window.__MOTION_RENDER__ = {
      ready,
      getDurationMs: () => Math.max(0, (timelineRef.current?.duration() ?? 0) * 1000),
      seek: async (seconds: number) => {
        const timeline = timelineRef.current;
        if (!timeline) {
          throw new Error('Timeline not ready');
        }

        timeline.pause();
        timeline.seek(Math.max(0, seconds), false);
        await waitFrame();
        await waitFrame();
      },
      play: () => {
        timelineRef.current?.pause(0);
        timelineRef.current?.play();
      },
    };

    return () => {
      delete window.__MOTION_RENDER__;
    };
  }, [ready]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div
        data-render-stage="true"
        style={{
          width: renderSize.width,
          height: renderSize.height,
          position: 'relative',
          overflow: 'hidden',
          background: '#000',
        }}
      >
        <TemplateComponent
          config={config}
          isPlaying={false}
          onComplete={() => undefined}
          onTimelineReady={(timeline) => {
            timelineRef.current = timeline;
            setReady(Boolean(timeline && timeline.duration() > 0 && Number.isFinite(timeline.duration())));
          }}
        />
      </div>
      {error && (
        <div className="fixed bottom-4 left-4 text-xs text-white/70 font-mono">
          {error}
        </div>
      )}
    </div>
  );
};

export default RenderPlayer;
