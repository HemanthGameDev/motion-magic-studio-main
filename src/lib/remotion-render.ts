import {
  REMOTION_RENDER_DURATION_IN_FRAMES,
  REMOTION_RENDER_FPS,
  REMOTION_RENDER_HEIGHT,
  REMOTION_RENDER_MAX_DURATION,
  REMOTION_RENDER_WIDTH,
} from './render-constants';
import { withResolvedSize, type AnimationConfig } from './types';

interface RenderResponse {
  id?: string;
  url?: string;
  error?: string;
}

export type RemotionRenderStatus = 'uploading' | 'rendering' | 'finalizing' | 'downloading';

export interface RemotionRenderResult {
  id: string;
  url: string;
  blob: Blob;
  config: AnimationConfig;
}

export function sanitizeConfigForRemotion(config: AnimationConfig): AnimationConfig {
  const durationSec = Math.min(
    config.motion?.durationSec ?? REMOTION_RENDER_MAX_DURATION,
    REMOTION_RENDER_MAX_DURATION,
  );

  return withResolvedSize({
    ...config,
    motion: {
      ...config.motion,
      durationSec,
    },
  }, {
    preset: 'custom',
    width: REMOTION_RENDER_WIDTH,
    height: REMOTION_RENDER_HEIGHT,
  });
}

export async function renderVideoWithRemotion({
  config,
  onStatusChange,
}: {
  config: AnimationConfig;
  onStatusChange?: (status: RemotionRenderStatus) => void;
}): Promise<RemotionRenderResult> {
  const renderConfig = sanitizeConfigForRemotion(config);

  onStatusChange?.('uploading');
  const responsePromise = fetch('/api/render', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config: renderConfig,
      width: REMOTION_RENDER_WIDTH,
      height: REMOTION_RENDER_HEIGHT,
      fps: REMOTION_RENDER_FPS,
      durationInFrames: REMOTION_RENDER_DURATION_IN_FRAMES,
    }),
  });

  onStatusChange?.('rendering');
  const response = await responsePromise;
  const data = await response.json().catch(() => ({} as RenderResponse)) as RenderResponse;

  if (!response.ok) {
    throw new Error(data.error || 'Remotion render failed');
  }

  if (!data.id || !data.url) {
    throw new Error('Remotion render failed');
  }

  onStatusChange?.('finalizing');
  const assetUrl = data.url;
  onStatusChange?.('downloading');
  const assetResponse = await fetch(assetUrl);
  if (!assetResponse.ok) {
    throw new Error('Remotion render failed');
  }

  const blob = await assetResponse.blob();
  return {
    id: data.id,
    url: assetUrl,
    blob,
    config: renderConfig,
  };
}
