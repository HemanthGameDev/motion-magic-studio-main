import type { AnimationConfig } from '@/lib/types';

const DEFAULT_RENDER_SERVER = 'http://127.0.0.1:5050';

interface RenderResponse {
  id?: string;
  url?: string;
  error?: string;
}

export interface ServerRenderResult {
  id: string;
  url: string;
  blob: Blob;
}

function getRenderServerUrl(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_RENDER_SERVER;
  }

  return window.localStorage.getItem('renderServer') || DEFAULT_RENDER_SERVER;
}

export async function renderVideoOnServer({
  config,
  width,
  height,
  fps = 30,
}: {
  config: AnimationConfig;
  width: number;
  height: number;
  fps?: number;
}): Promise<ServerRenderResult> {
  const serverUrl = getRenderServerUrl();
  const response = await fetch(serverUrl + '/render', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      config,
      width,
      height,
      fps,
    }),
  });

  const data = await response.json().catch(() => ({} as RenderResponse)) as RenderResponse;

  if (!response.ok) {
    throw new Error(data.error || 'Server render failed');
  }

  if (!data.id || !data.url) {
    throw new Error('Server render did not return a download URL');
  }

  const assetUrl = new URL(data.url, serverUrl + '/').toString();
  const assetResponse = await fetch(assetUrl);
  if (!assetResponse.ok) {
    throw new Error('Rendered video download failed');
  }

  const blob = await assetResponse.blob();
  return {
    id: data.id,
    url: assetUrl,
    blob,
  };
}
