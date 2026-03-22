import { useState, useCallback } from 'react';
import { Play, RotateCcw, Pause } from 'lucide-react';
import { renderTemplate } from '@/templates';
import type { AnimationConfig } from '@/lib/types';
import { getRenderSize } from '@/lib/types';
import ExportButton from './ExportButton';

interface Props {
  config: AnimationConfig;
}

const PreviewPanel = ({ config }: Props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [key, setKey] = useState(0);
  const [exportBusy, setExportBusy] = useState(false);

  const TemplateComponent = renderTemplate(config);

  const handlePlay = useCallback(() => {
    if (exportBusy) return;
    setIsPlaying(true);
  }, [exportBusy]);

  const handleRestart = useCallback(() => {
    if (exportBusy) return;
    setKey((k) => k + 1);
    setIsPlaying(true);
  }, [exportBusy]);

  const handleTemplateComplete = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const renderSize = getRenderSize(config);
  const viewportMaxWidth = 500;
  const viewportMaxHeight = 560;
  const scale = Math.min(viewportMaxWidth / renderSize.width, viewportMaxHeight / renderSize.height);
  const viewportWidth = Math.round(renderSize.width * scale);
  const viewportHeight = Math.round(renderSize.height * scale);

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        className="preview-frame rounded-lg overflow-hidden relative"
        style={{
          width: viewportWidth,
          height: viewportHeight,
        }}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{
            width: renderSize.width,
            height: renderSize.height,
            transform: `scale(${scale})`,
            fontSize: `${Math.max(12, (Math.min(renderSize.width, renderSize.height) / 1080) * 16)}px`,
          }}
        >
          <TemplateComponent
            key={key}
            config={config}
            isPlaying={isPlaying}
            onComplete={handleTemplateComplete}
          />

          {!isPlaying && !exportBusy && (
            <button
              onClick={handlePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-transform shadow-lg">
                <Play className="w-6 h-6 text-primary-foreground ml-0.5" />
              </div>
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
          disabled={exportBusy}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={handleRestart}
          disabled={exportBusy}
          className="flex items-center gap-2 px-4 py-2 rounded-md bg-secondary text-secondary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:pointer-events-none"
        >
          <RotateCcw className="w-4 h-4" />
          Restart
        </button>
        <ExportButton
          config={config}
          onExportBusyChange={setExportBusy}
        />
      </div>

      <span className="text-xs text-muted-foreground tracking-wide">
        {renderSize.width} x {renderSize.height} - Preview canvas
      </span>
    </div>
  );
};

export default PreviewPanel;
