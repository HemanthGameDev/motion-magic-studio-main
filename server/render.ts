import type { AnimationConfig } from '../src/lib/types';

export interface RenderVideoResult {
  id: string;
  outputLocation: string;
  fileName: string;
}

export async function renderVideo(config: AnimationConfig): Promise<RenderVideoResult> {
  const runtime = await import('./render.mjs');
  return runtime.renderVideo(config) as Promise<RenderVideoResult>;
}
