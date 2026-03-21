import type gsap from 'gsap';
import html2canvas from 'html2canvas';
import { zipSync } from 'fflate';
import { waitForTimeline } from './timeline-ready';

export type ExportStatus = 'preparing' | 'recording' | 'processing';
export type ExportMode = 'auto' | 'fast' | 'smart' | 'fallback' | 'capture-stream' | 'frame-by-frame';
export type ExportRuntimeMode = 'fast-stream' | 'smart-stream' | 'frame-by-frame' | 'png-sequence';
export type ExportQuality = 'high' | 'medium' | 'low';

export interface ExportOptions {
  element: HTMLElement;
  timeline: gsap.core.Timeline;
  width: number;
  height: number;
  fps?: number;
  mode?: ExportMode;
  quality?: ExportQuality;
  onProgress?: (progress: number) => void;
  onStatusChange?: (status: ExportStatus) => void;
  onModeResolved?: (mode: ExportRuntimeMode) => void;
  onEstimatedTime?: (seconds: number) => void;
}

export interface ExportResult {
  blob: Blob;
  mode: ExportRuntimeMode;
  mimeType: string;
  fileExtension: 'webm' | 'zip';
  isVideo: boolean;
}

type CaptureElement = HTMLElement & {
  captureStream?: (fps?: number) => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

interface CaptureStreamResult {
  blob: Blob;
  mimeType: string;
}

interface SmartStyleSnapshot {
  el: HTMLElement;
  willChange: string;
  backfaceVisibility: string;
}

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return 'video/webm';
  }

  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return 'video/webm';
}

function qualityToBitrate(quality: ExportQuality): number {
  if (quality === 'high') return 8_000_000;
  if (quality === 'low') return 3_000_000;
  return 5_000_000;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function waitFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForStableLayout(element: HTMLElement): Promise<void> {
  if ('fonts' in document && document.fonts?.ready) {
    await document.fonts.ready;
  }

  await wait(300);
  await waitFrame();
  await waitFrame();

  if (!element.isConnected) {
    throw new Error('Animation stage is no longer mounted');
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    throw new Error('Animation stage is not visible yet');
  }
}

function lockStageSize(element: HTMLElement, width: number, height: number): () => void {
  const prev = {
    width: element.style.width,
    height: element.style.height,
    maxWidth: element.style.maxWidth,
    maxHeight: element.style.maxHeight,
    transform: element.style.transform,
  };

  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.maxWidth = 'none';
  element.style.maxHeight = 'none';
  element.style.transform = 'none';

  return () => {
    element.style.width = prev.width;
    element.style.height = prev.height;
    element.style.maxWidth = prev.maxWidth;
    element.style.maxHeight = prev.maxHeight;
    element.style.transform = prev.transform;
  };
}

function applySmartCaptureHints(root: HTMLElement): () => void {
  const snapshots: SmartStyleSnapshot[] = [];
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*')).slice(0, 350)];

  for (const el of nodes) {
    snapshots.push({
      el,
      willChange: el.style.willChange,
      backfaceVisibility: el.style.backfaceVisibility,
    });
    el.style.willChange = 'transform, opacity, filter';
    el.style.backfaceVisibility = 'hidden';
  }

  return () => {
    for (const snap of snapshots) {
      snap.el.style.willChange = snap.willChange;
      snap.el.style.backfaceVisibility = snap.backfaceVisibility;
    }
  };
}

function supportsElementCaptureStream(element: HTMLElement): boolean {
  const captureElement = element as CaptureElement;
  return typeof captureElement.captureStream === 'function' || typeof captureElement.mozCaptureStream === 'function';
}

function getElementStream(element: HTMLElement, fps: number): MediaStream {
  const captureElement = element as CaptureElement;
  const capture = captureElement.captureStream ?? captureElement.mozCaptureStream;
  if (!capture) {
    throw new Error('Element captureStream not available');
  }

  const stream = capture.call(captureElement, fps);
  if (!stream || stream.getVideoTracks().length === 0) {
    throw new Error('No video track from captureStream');
  }

  return stream;
}

function validateBlob(blob: Blob | null | undefined): asserts blob is Blob {
  if (!blob || blob.size < 1000) {
    throw new Error('Export output was empty or corrupted');
  }
}

async function captureStreamExport(
  element: HTMLElement,
  timeline: gsap.core.Timeline,
  fps: number,
  quality: ExportQuality,
  onProgress?: (progress: number) => void,
  onStatusChange?: (status: ExportStatus) => void,
): Promise<CaptureStreamResult> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder unavailable for capture-stream mode');
  }

  const mimeType = pickMimeType();
  const stream = getElementStream(element, fps);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: qualityToBitrate(quality),
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const durationMs = Math.max(120, Math.ceil(timeline.duration() * 1000));
  let progressTimer: number | undefined;
  let stopTimer: number | undefined;
  let safetyTimer: number | undefined;
  const startedAt = performance.now();

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('MediaRecorder failed during recording'));
    recorder.onstop = () => {
      console.log('Recording stopped');
      resolve();
    };
  });

  try {
    onStatusChange?.('recording');
    console.log('Recording started');
    recorder.start();

    timeline.pause(0);
    timeline.play();

    progressTimer = window.setInterval(() => {
      const elapsed = Math.max(0, performance.now() - startedAt);
      onProgress?.(Math.min(elapsed / durationMs, 0.98));
    }, 80);

    stopTimer = window.setTimeout(() => {
      try {
        recorder.requestData();
      } catch {
        // noop
      }

      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    }, durationMs);

    safetyTimer = window.setTimeout(() => {
      if (recorder.state !== 'inactive') {
        recorder.stop();
      }
    }, durationMs + 1500);

    await stopped;
    const blob = new Blob(chunks, { type: mimeType });
    validateBlob(blob);
    onProgress?.(1);
    onStatusChange?.('processing');
    timeline.pause(0);

    return { blob, mimeType };
  } finally {
    if (progressTimer) window.clearInterval(progressTimer);
    if (stopTimer) window.clearTimeout(stopTimer);
    if (safetyTimer) window.clearTimeout(safetyTimer);
    timeline.pause(0);
    stream.getTracks().forEach((track) => track.stop());
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to blob'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

async function captureFrames(
  element: HTMLElement,
  timeline: gsap.core.Timeline,
  width: number,
  height: number,
  fps: number,
  onProgress?: (progress: number) => void,
): Promise<HTMLCanvasElement[]> {
  const durationMs = Math.max(100, timeline.duration() * 1000);
  const frameTime = 1000 / fps;
  const totalFrames = Math.max(2, Math.ceil(durationMs / frameTime) + 1);

  if (totalFrames > 420) {
    throw new Error('Export duration is too long for frame fallback. Reduce duration to 14s or less.');
  }

  const frames: HTMLCanvasElement[] = [];
  timeline.pause(0);

  for (let currentMs = 0; currentMs <= durationMs; currentMs += frameTime) {
    const progress = Math.min(currentMs / durationMs, 1);
    timeline.seek(Math.min(currentMs, durationMs) / 1000, false);
    await waitFrame();

    const captured = await html2canvas(element, {
      width,
      height,
      scale: 1,
      useCORS: true,
      backgroundColor: null,
      logging: false,
      removeContainer: true,
    });

    const normalized = document.createElement('canvas');
    normalized.width = width;
    normalized.height = height;
    const ctx = normalized.getContext('2d');
    if (!ctx) throw new Error('Failed to initialize frame canvas');
    ctx.drawImage(captured, 0, 0, width, height);

    frames.push(normalized);
    onProgress?.(progress * 0.75);
  }

  timeline.pause(0);
  return frames;
}

async function encodeFramesWithMediaRecorder(
  frames: HTMLCanvasElement[],
  fps: number,
  quality: ExportQuality,
  onProgress?: (progress: number) => void,
): Promise<Blob> {
  if (!frames.length) {
    throw new Error('No frames available to encode');
  }
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder unavailable for frame encoding');
  }

  const width = frames[0].width;
  const height = frames[0].height;
  const playbackCanvas = document.createElement('canvas');
  playbackCanvas.width = width;
  playbackCanvas.height = height;
  const ctx = playbackCanvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to initialize playback canvas');
  }

  const capture = (playbackCanvas as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }).captureStream;
  if (!capture) {
    throw new Error('Canvas captureStream is unavailable');
  }

  const stream = capture.call(playbackCanvas, fps);
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: qualityToBitrate(quality),
  });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('Frame encoding recorder failed'));
    recorder.onstop = () => resolve();
  });

  recorder.start(200);
  const frameDelay = 1000 / fps;
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };

  try {
    for (let i = 0; i < frames.length; i += 1) {
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(frames[i], 0, 0, width, height);
      track.requestFrame?.();
      onProgress?.(0.75 + ((i + 1) / frames.length) * 0.2);
      await wait(frameDelay);
    }

    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;

    const blob = new Blob(chunks, { type: mimeType });
    validateBlob(blob);
    return blob;
  } finally {
    stream.getTracks().forEach((trackItem) => trackItem.stop());
  }
}

async function buildPngZip(frames: HTMLCanvasElement[], onProgress?: (progress: number) => void): Promise<Blob> {
  const zipEntries: Record<string, Uint8Array> = {};

  for (let i = 0; i < frames.length; i += 1) {
    const blob = await canvasToBlob(frames[i], 'image/png');
    zipEntries[`frame-${String(i + 1).padStart(4, '0')}.png`] = new Uint8Array(await blob.arrayBuffer());
    onProgress?.(0.85 + ((i + 1) / frames.length) * 0.15);
  }

  const zipData = zipSync(zipEntries, { level: 0 });
  return new Blob([zipData], { type: 'application/zip' });
}

async function frameByFrameExport(
  element: HTMLElement,
  timeline: gsap.core.Timeline,
  width: number,
  height: number,
  fps: number,
  quality: ExportQuality,
  onProgress?: (progress: number) => void,
  onStatusChange?: (status: ExportStatus) => void,
): Promise<ExportResult> {
  onStatusChange?.('recording');
  const frames = await captureFrames(element, timeline, width, height, fps, onProgress);

  onStatusChange?.('processing');

  try {
    const blob = await encodeFramesWithMediaRecorder(frames, fps, quality, onProgress);
    validateBlob(blob);
    onProgress?.(1);

    return {
      blob,
      mode: 'frame-by-frame',
      mimeType: 'video/webm',
      fileExtension: 'webm',
      isVideo: true,
    };
  } catch {
    const zipBlob = await buildPngZip(frames, onProgress);
    validateBlob(zipBlob);
    onProgress?.(1);

    return {
      blob: zipBlob,
      mode: 'png-sequence',
      mimeType: 'application/zip',
      fileExtension: 'zip',
      isVideo: false,
    };
  }
}

function resolvePreferredMode(mode: ExportMode, element: HTMLElement): ExportMode {
  if (mode === 'capture-stream') return 'fast';
  if (mode === 'frame-by-frame') return 'fallback';
  if (mode !== 'auto') return mode;
  return supportsElementCaptureStream(element) ? 'fast' : 'fallback';
}

export async function exportVideo({
  element,
  timeline,
  width,
  height,
  fps = 30,
  mode = 'auto',
  quality = 'high',
  onProgress,
  onStatusChange,
  onModeResolved,
  onEstimatedTime,
}: ExportOptions): Promise<ExportResult> {
  onStatusChange?.('preparing');
  onProgress?.(0);

  await waitForStableLayout(element);
  await waitForTimeline(() => timeline, {
    maxRetries: 20,
    delayMs: 100,
    errorMessage: 'Animation failed to initialize',
  });
  onEstimatedTime?.(Math.max(1, timeline.duration()));

  const restoreStage = lockStageSize(element, width, height);

  try {
    const preferredMode = resolvePreferredMode(mode, element);
    const hasCapture = supportsElementCaptureStream(element) && typeof MediaRecorder !== 'undefined';

    if ((preferredMode === 'fast' || preferredMode === 'smart') && hasCapture) {
      const restoreSmartHints = preferredMode === 'smart' ? applySmartCaptureHints(element) : () => undefined;
      try {
        const capture = await captureStreamExport(element, timeline, fps, quality, onProgress, onStatusChange);
        const runtimeMode: ExportRuntimeMode = preferredMode === 'smart' ? 'smart-stream' : 'fast-stream';
        onModeResolved?.(runtimeMode);
        return {
          blob: capture.blob,
          mode: runtimeMode,
          mimeType: capture.mimeType,
          fileExtension: 'webm',
          isVideo: true,
        };
      } catch {
        // fall through to fallback mode
      } finally {
        restoreSmartHints();
      }
    }

    const fallbackResult = await frameByFrameExport(element, timeline, width, height, fps, quality, onProgress, onStatusChange);
    onModeResolved?.(fallbackResult.mode);
    return fallbackResult;
  } finally {
    restoreStage();
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
