import { createRoot } from 'react-dom/client';
import type gsap from 'gsap';
import { renderTemplate } from '@/templates';
import type { AnimationConfig } from '@/lib/types';
import { waitForTimeline } from '@/lib/timeline-ready';

export interface PreparedExportStage {
  element: HTMLDivElement;
  timeline: gsap.core.Timeline;
  cleanup: () => void;
}

interface PrepareExportStageOptions {
  config: AnimationConfig;
  width: number;
  height: number;
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function createHost(width: number, height: number): HTMLDivElement {
  const host = document.createElement('div');
  host.setAttribute('data-export-stage', 'true');
  host.style.position = 'fixed';
  host.style.left = '-100000px';
  host.style.top = '0';
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  host.style.overflow = 'hidden';
  host.style.pointerEvents = 'none';
  host.style.opacity = '0';
  host.style.zIndex = '-1';
  host.style.transform = 'none';
  host.style.transformOrigin = 'top left';
  return host;
}

async function mountTemplateStage(config: AnimationConfig, width: number, height: number): Promise<PreparedExportStage> {
  const host = createHost(width, height);
  document.body.appendChild(host);

  const root = createRoot(host);
  const TemplateComponent = renderTemplate(config);

  let disposed = false;
  let timelineResolved = false;
  let timeoutId: number | undefined;

  const timelinePromise = new Promise<gsap.core.Timeline>((resolve, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`Export timeline did not initialize for template "${config.template}"`));
    }, 7000);

    root.render(
      <TemplateComponent
        config={config}
        isPlaying={false}
        onComplete={() => undefined}
        onTimelineReady={(timeline) => {
          if (!timeline || timelineResolved || disposed) return;
          timelineResolved = true;
          if (timeoutId) window.clearTimeout(timeoutId);
          resolve(timeline);
        }}
      />,
    );
  });

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    if (timeoutId) window.clearTimeout(timeoutId);
    root.unmount();
    if (host.parentElement) {
      host.parentElement.removeChild(host);
    }
  };

  try {
    if ('fonts' in document && document.fonts?.ready) {
      await document.fonts.ready;
    }
    await waitFrame();
    await waitFrame();

    const timeline = await timelinePromise;
    await waitForTimeline(() => timeline, {
      maxRetries: 20,
      delayMs: 100,
      errorMessage: `Export timeline did not initialize for template "${config.template}"`,
    });
    timeline.pause(0);

    return {
      element: host,
      timeline,
      cleanup,
    };
  } catch (error) {
    cleanup();
    throw error;
  }
}

export async function prepareExportStage({ config, width, height }: PrepareExportStageOptions): Promise<PreparedExportStage> {
  try {
    return await mountTemplateStage(config, width, height);
  } catch (error) {
    if (config.template !== 'minimal') {
      console.warn('Template failed during export stage setup. Falling back to Minimal template.', error);
      return mountTemplateStage({ ...config, template: 'minimal' }, width, height);
    }
    throw error;
  }
}
