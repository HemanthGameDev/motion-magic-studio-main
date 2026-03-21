import type gsap from 'gsap';

interface WaitForTimelineOptions {
  maxRetries?: number;
  delayMs?: number;
  errorMessage?: string;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function waitForTimeline(
  getTimeline: () => gsap.core.Timeline | null,
  {
    maxRetries = 20,
    delayMs = 100,
    errorMessage = 'Timeline failed to initialize',
  }: WaitForTimelineOptions = {},
): Promise<gsap.core.Timeline> {
  let retries = 0;
  let timeline = getTimeline();

  while (
    (!timeline || timeline.duration() === 0 || !Number.isFinite(timeline.duration()))
    && retries < maxRetries
  ) {
    await wait(delayMs);
    retries += 1;
    timeline = getTimeline();
  }

  if (!timeline || timeline.duration() === 0 || !Number.isFinite(timeline.duration())) {
    throw new Error(errorMessage);
  }

  return timeline;
}
