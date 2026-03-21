import { useState } from 'react';
import { Film } from 'lucide-react';
import PreviewPanel from '@/components/PreviewPanel';
import ControlPanel from '@/components/ControlPanel';
import { DEFAULT_CONFIG, type AnimationConfig } from '@/lib/types';

const Index = () => {
  const [config, setConfig] = useState<AnimationConfig>(DEFAULT_CONFIG);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center">
            <Film className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground tracking-tight">Motion Studio</h1>
            <p className="text-[10px] text-muted-foreground">AI Typography Animation</p>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground tracking-wider uppercase">Phase 1 · Templates</span>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Preview */}
        <div className="flex-1 flex items-center justify-center p-8 lg:p-12">
          <PreviewPanel config={config} />
        </div>

        {/* Controls */}
        <aside className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border p-6 lg:p-8 overflow-y-auto">
          <ControlPanel config={config} onChange={setConfig} />
        </aside>
      </main>
    </div>
  );
};

export default Index;
