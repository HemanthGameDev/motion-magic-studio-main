import { useState, useRef, useCallback } from 'react';
import { Check, Download, Loader2, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { AnimationConfig } from '@/lib/types';
import {
  REMOTION_RENDER_FPS,
  REMOTION_RENDER_HEIGHT,
  REMOTION_RENDER_MAX_DURATION,
  REMOTION_RENDER_WIDTH,
} from '@/lib/render-constants';
import {
  renderVideoWithRemotion,
  type RemotionRenderStatus,
} from '@/lib/remotion-render';

interface Props {
  config: AnimationConfig;
  onExportBusyChange?: (isBusy: boolean) => void;
}

type ExportState = 'idle' | 'uploading' | 'rendering' | 'finalizing' | 'downloading' | 'done' | 'preview' | 'error';

const STATUS_TO_STATE: Record<RemotionRenderStatus, ExportState> = {
  uploading: 'uploading',
  rendering: 'rendering',
  finalizing: 'finalizing',
  downloading: 'downloading',
};

const STATUS_TO_PROGRESS: Record<RemotionRenderStatus, number> = {
  uploading: 0.16,
  rendering: 0.6,
  finalizing: 0.82,
  downloading: 0.96,
};

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const ExportButton = ({
  config,
  onExportBusyChange,
}: Props) => {
  const [state, setState] = useState<ExportState>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const requestId = useRef(0);

  const busy = state === 'uploading' || state === 'rendering' || state === 'finalizing' || state === 'downloading';

  const cleanup = useCallback(() => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoBlob(null);
  }, [videoUrl]);

  const handleRemotionStatus = useCallback((status: RemotionRenderStatus) => {
    setState(STATUS_TO_STATE[status]);
    setProgress(STATUS_TO_PROGRESS[status]);
  }, []);

  const doExport = useCallback(async () => {
    cleanup();
    setProgress(0);
    setErrorMsg('');
    requestId.current += 1;
    const currentRequestId = requestId.current;
    onExportBusyChange?.(true);

    try {
      const result = await renderVideoWithRemotion({
        config,
        onStatusChange: handleRemotionStatus,
      });

      if (currentRequestId !== requestId.current) {
        return;
      }

      if (result.blob.size < 1000) {
        throw new Error('Remotion render failed');
      }

      const filename = `motion-${Date.now()}.mp4`;
      const url = URL.createObjectURL(result.blob);
      setVideoBlob(result.blob);
      setVideoUrl(url);
      setProgress(1);
      setState('done');
      await wait(250);
      downloadBlob(result.blob, filename);
      setState('preview');
    } catch (error) {
      console.error('Remotion export failed:', error);
      setErrorMsg(error instanceof Error ? error.message : 'Remotion render failed');
      setState('error');
    } finally {
      onExportBusyChange?.(false);
    }
  }, [cleanup, config, handleRemotionStatus, onExportBusyChange]);

  const handleDownload = () => {
    if (!videoBlob) return;
    downloadBlob(videoBlob, `motion-${Date.now()}.mp4`);
  };

  const handleDismiss = () => {
    cleanup();
    setState('idle');
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
              <p className="text-[10px] text-muted-foreground">Mode: remotion-mp4</p>
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
          {errorMsg || 'Remotion render failed'}
        </button>
      </div>
    );
  }

  if (busy) {
    const label = state === 'uploading'
      ? 'Uploading render job...'
      : state === 'rendering'
        ? 'Rendering video...'
        : state === 'finalizing'
          ? 'Finalizing...'
          : 'Downloading MP4...';

    return (
      <div className="flex flex-col items-center gap-2 min-w-[220px]">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {label}
        </div>
        <Progress value={Math.round(progress * 100)} className="h-1.5 w-full" />
        <span className="text-[10px] text-muted-foreground">{Math.round(progress * 100)}%</span>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-green-500/15 text-green-300 text-sm font-medium">
        <Check className="w-4 h-4" />
        Download ready
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={doExport}
        className="flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all"
      >
        <Download className="w-4 h-4" />
        Export MP4 (Remotion)
      </button>

      <span className="text-[10px] text-muted-foreground">
        Stable frame-based rendering via Remotion. No browser recording or MediaRecorder fallback.
      </span>
      <span className="text-[10px] text-muted-foreground">
        Render defaults: {REMOTION_RENDER_WIDTH}x{REMOTION_RENDER_HEIGHT} at {REMOTION_RENDER_FPS}fps, capped to {REMOTION_RENDER_MAX_DURATION}s.
      </span>
    </div>
  );
};

export default ExportButton;
