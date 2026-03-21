import { useState, useRef, useCallback } from 'react';
import { Check, Download, Loader2, X } from 'lucide-react';
import {
  exportVideo,
  downloadBlob,
  type ExportRuntimeMode,
  type ExportStatus,
  type ExportMode,
  type ExportQuality,
} from '@/lib/video-export';
import type { PreparedExportStage } from '@/lib/export-stage';
import { Progress } from '@/components/ui/progress';
import { renderVideoOnServer } from '@/lib/server-render';
import type { AnimationConfig } from '@/lib/types';

interface Props {
  config: AnimationConfig;
  prepareExportStage: () => Promise<PreparedExportStage>;
  width: number;
  height: number;
  isAnimationReady: boolean;
  waitForPreviewTimeline?: () => Promise<unknown>;
  onExportBusyChange?: (isBusy: boolean) => void;
}

type ExportState = 'idle' | 'preparing' | 'recording' | 'processing' | 'done' | 'preview' | 'error';
type UiExportMode = 'auto' | 'fast' | 'smart' | 'fallback' | 'server';

const STATUS_TO_STATE: Record<ExportStatus, ExportState> = {
  preparing: 'preparing',
  recording: 'recording',
  processing: 'processing',
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const ExportButton = ({
  config,
  prepareExportStage,
  width,
  height,
  isAnimationReady,
  waitForPreviewTimeline,
  onExportBusyChange,
}: Props) => {
  const [state, setState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [runtimeMode, setRuntimeMode] = useState<ExportRuntimeMode | null>(null);
  const [fps, setFps] = useState<24 | 30>(30);
  const [quality, setQuality] = useState<ExportQuality>('high');
  const [mode, setMode] = useState<UiExportMode>('auto');
  const [estimatedSeconds, setEstimatedSeconds] = useState<number | null>(null);
  const retryCount = useRef(0);

  const busy = state === 'preparing' || state === 'recording' || state === 'processing';

  const cleanup = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoBlob(null);
    setRuntimeMode(null);
    setEstimatedSeconds(null);
  }, [videoUrl]);

  const runServerExportAttempt = useCallback(async () => {
    setState('preparing');
    setProgress(0.1);
    setEstimatedSeconds(null);
    setRuntimeMode('server-mp4');

    const result = await renderVideoOnServer({
      config,
      width,
      height,
      fps,
    });

    if (result.blob.size < 1000) {
      throw new Error('Server render returned an empty video');
    }

    setState('processing');
    setProgress(0.95);

    const filename = `motion-${Date.now()}.mp4`;
    const url = URL.createObjectURL(result.blob);
    setVideoBlob(result.blob);
    setVideoUrl(url);
    setState('done');
    setProgress(1);
    await wait(250);
    downloadBlob(result.blob, filename);
    setState('preview');
    retryCount.current = 0;
  }, [config, width, height, fps]);

  const runExportAttempt = useCallback(async () => {
    setState('preparing');

    const exportStage = await prepareExportStage();

    try {
      const result = await exportVideo({
        element: exportStage.element,
        timeline: exportStage.timeline,
        width,
        height,
        fps,
        mode: mode as ExportMode,
        quality,
        onProgress: setProgress,
        onStatusChange: (status) => setState(STATUS_TO_STATE[status]),
        onModeResolved: (resolvedMode) => setRuntimeMode(resolvedMode),
        onEstimatedTime: (seconds) => setEstimatedSeconds(Math.ceil(seconds)),
      });

      if (result.blob.size < 1000) {
        throw new Error('Recording failed or corrupted');
      }

      const filename = `motion-${Date.now()}.${result.fileExtension}`;

      if (result.isVideo) {
        const url = URL.createObjectURL(result.blob);
        setVideoBlob(result.blob);
        setVideoUrl(url);
        setState('done');
        await wait(250);
        downloadBlob(result.blob, filename);
        setState('preview');
      } else {
        setState('done');
        await wait(250);
        downloadBlob(result.blob, filename);
        await wait(600);
        setState('idle');
      }

      retryCount.current = 0;
    } finally {
      exportStage.cleanup();
    }
  }, [prepareExportStage, width, height, fps, mode, quality]);

  const doRecord = useCallback(async () => {
    cleanup();
    setProgress(0);
    setErrorMsg('');
    retryCount.current = 0;
    onExportBusyChange?.(true);
    setState('preparing');

    try {
      if (!isAnimationReady) {
        console.warn('Animation delayed, waiting...');
      }

      try {
        await waitForPreviewTimeline?.();
      } catch (error) {
        console.warn('Preview timeline wait failed, continuing with export-stage timeline fallback.', error);
      }

      if (mode === 'server') {
        await runServerExportAttempt();
        return;
      }

      while (true) {
        try {
          await runExportAttempt();
          return;
        } catch (error) {
          if (retryCount.current < 1) {
            retryCount.current += 1;
            await wait(350);
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      setErrorMsg('Export failed after all fallback attempts. Please try a shorter duration or lower resolution.');
      setState('error');
    } finally {
      onExportBusyChange?.(false);
    }
  }, [cleanup, isAnimationReady, mode, onExportBusyChange, runExportAttempt, runServerExportAttempt, waitForPreviewTimeline]);

  const handleDownload = () => {
    if (!videoBlob) return;
    const extension = runtimeMode === 'server-mp4' ? 'mp4' : 'webm';
    downloadBlob(videoBlob, `motion-${Date.now()}.${extension}`);
  };

  const handleDismiss = () => {
    cleanup();
    setState('idle');
    retryCount.current = 0;
    setErrorMsg('');
    setProgress(0);
  };

  if (state === 'preview' && videoUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
        <div className="bg-card rounded-xl shadow-2xl p-5 max-w-lg w-full mx-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Preview Export</h3>
              {runtimeMode && <p className="text-[10px] text-muted-foreground">Mode: {runtimeMode}</p>}
            </div>
            <button onClick={handleDismiss} className="p-1 rounded hover:bg-secondary active:scale-95 transition-all">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            className="rounded-lg w-full max-h-80 bg-black object-contain"
          />
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all"
            >
              <Download className="w-4 h-4" />
              Download Again
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleDismiss}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-destructive/15 text-destructive text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all"
        >
          <X className="w-4 h-4" />
          {errorMsg || 'Export failed'}
        </button>
      </div>
    );
  }

  if (busy) {
    const label = state === 'preparing'
      ? 'Preparing...'
      : state === 'recording'
        ? 'Recording...'
        : 'Processing...';

    return (
      <div className="flex flex-col items-center gap-2 min-w-[200px]">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {label}
        </div>
        <Progress value={Math.round(progress * 100)} className="h-1.5 w-full" />
        <span className="text-[10px] text-muted-foreground">{Math.round(progress * 100)}%</span>
        {estimatedSeconds !== null && (
          <span className="text-[10px] text-muted-foreground">Exporting (~{estimatedSeconds}s)</span>
        )}
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-500/15 text-green-300 text-sm font-medium">
        <Check className="w-4 h-4" />
        Done
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex items-center gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as UiExportMode)}
          className="px-2 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs border border-border"
          aria-label="Export mode"
        >
          <option value="auto">Auto</option>
          <option value="fast">Fast</option>
          <option value="smart">Smart</option>
          <option value="fallback">Fallback</option>
          <option value="server">Server MP4</option>
        </select>

        <select
          value={fps}
          onChange={(e) => setFps(Number(e.target.value) as 24 | 30)}
          className="px-2 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs border border-border"
          aria-label="Export frame rate"
        >
          <option value={30}>30fps</option>
          <option value={24}>24fps</option>
        </select>

        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value as ExportQuality)}
          className="px-2 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs border border-border"
          aria-label="Export quality"
        >
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <button
        onClick={doRecord}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all"
      >
        <Download className="w-4 h-4" />
        Export
      </button>

      {!isAnimationReady && mode !== 'server' && (
        <span className="text-[10px] text-muted-foreground">Preparing animation...</span>
      )}
      {mode === 'server' ? (
        <span className="text-[10px] text-muted-foreground">Server MP4 uses <span className="font-mono">npm run render:server</span> and FFmpeg on port 5050.</span>
      ) : (
        <span className="text-[10px] text-muted-foreground">Best performance in Chrome.</span>
      )}
    </div>
  );
};

export default ExportButton;
