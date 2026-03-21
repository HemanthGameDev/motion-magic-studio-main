import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateFromJSON } from './generate-from-json';
import { generateAnimationConfig } from './ollama-animation';

describe('generateFromJSON', () => {
  it('maps top-level animationType to the motion preset', () => {
    const config = generateFromJSON({
      template: 'minimal',
      animationType: 'zoom-transition',
    });

    expect(config.template).toBe('minimal');
    expect(config.motion.animationPreset).toBe('zoom-transition');
  });

  it('normalizes descriptive animation labels', () => {
    const config = generateFromJSON({
      template: 'bold',
      animationType: 'slow cinematic fade',
    });

    expect(config.motion.animationPreset).toBe('cinematic-fade');
  });
});

describe('generateAnimationConfig', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses the configured Ollama model name', async () => {
    window.localStorage.setItem('model', 'qwen3.5:9b');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        response: '{"heading":"Luxury Candle","subheading":"Warm tones","style":{"motion":"slow dramatic"}}',
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    await generateAnimationConfig('Luxury candle ad');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    expect(JSON.parse(String(options?.body)).model).toBe('qwen3.5:9b');
  });

  it('normalizes cinematic Ollama JSON and defaults the template safely', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          response: '{"heading":"Luxury Candle","subheading":"Warm tones and slow fade","style":{"motion":"slow dramatic","textReveal":"stagger blur","camera":"zoom in","depth":0.5,"parallax":0.3},"colors":{"primary":"#C99249","background":"warm luxury"},"timing":{"intro":2,"main":5,"outro":2}}',
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
    expect(result.timing).toEqual({
      intro: 2,
      main: 5,
      outro: 2,
    });
  });
});
