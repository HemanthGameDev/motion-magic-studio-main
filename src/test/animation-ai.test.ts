import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateFromJSON } from '@/lib/generate-from-json';
import { generateAnimationConfig } from '@/lib/ollama-animation';

describe('animation AI helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('falls back to the minimal template for invalid generated input', () => {
    const config = generateFromJSON({
      heading: 'Test heading',
      animationType: 'not-a-real-template',
    });

    expect(config.template).toBe('minimal');
    expect(config.text.heading).toBe('Test heading');
  });

  it('maps cinematic director JSON into runtime motion settings', () => {
    const config = generateFromJSON({
      template: 'cinematic_intro',
      heading: 'Golden Hour',
      subheading: 'Warm tones and dramatic pacing',
      style: {
        motion: 'slow_dramatic',
        textReveal: 'stagger_blur',
        camera: 'zoom_in',
        depth: 0.5,
        parallax: 0.3,
      },
      colors: {
        primary: '#D4A373',
        background: 'warm_luxury',
      },
      timing: {
        intro: 2,
        main: 5,
        outro: 2,
      },
    });

    expect(config.template).toBe('cinematic3d');
    expect(config.motion.durationSec).toBe(9);
    expect(config.motion.animationPreset).toBe('cinematic-fade');
    expect(config.motion.depthIntensity).toBe(0.5);
    expect(config.motion.parallaxIntensity).toBe(0.3);
    expect(config.background.type).toBe('gradient');
    expect(config.colors[0]).toBe('#D4A373');
  });

  it('normalizes cinematic Ollama output and defaults the template to minimal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: {
            content: '{"heading":"Luxury Candle","subheading":"Warm tones and cinematic feel","style":{"motion":"slow dramatic","textReveal":"stagger blur","camera":"zoom in","depth":0.5,"parallax":0.3},"colors":{"primary":"#C99249","background":"warm luxury"},"timing":{"intro":2,"main":5,"outro":2}}',
          },
        }),
      }),
    );

    const result = await generateAnimationConfig('Luxury candle ad with warm tones and slow fade');

    expect(result.template).toBe('minimal');
    expect(result.heading).toBe('Luxury Candle');
    expect(result.style?.motion).toBe('slow_dramatic');
    expect(result.style?.textReveal).toBe('stagger_blur');
    expect(result.style?.camera).toBe('zoom_in');
    expect(result.colors).toEqual({
      primary: '#C99249',
      background: 'warm_luxury',
    });
  });
});
