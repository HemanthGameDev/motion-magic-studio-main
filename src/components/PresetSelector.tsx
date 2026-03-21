import { useState, useMemo } from 'react';
import { Bookmark, Save, Trash2 } from 'lucide-react';
import type { AnimationConfig } from '@/lib/types';
import { DEFAULT_PRESETS, loadUserPresets, saveUserPreset, deleteUserPreset, type Preset } from '@/lib/presets';

interface Props {
  config: AnimationConfig;
  onApply: (config: AnimationConfig) => void;
}

const PresetSelector = ({ config, onApply }: Props) => {
  const [userPresets, setUserPresets] = useState<Preset[]>(() => loadUserPresets());
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);

  const allPresets = useMemo(() => [...DEFAULT_PRESETS, ...userPresets], [userPresets]);

  const handleSave = () => {
    if (!saveName.trim()) return;
    const preset: Preset = {
      id: `user-${Date.now()}`,
      name: saveName.trim(),
      config: { ...config },
    };
    saveUserPreset(preset);
    setUserPresets(loadUserPresets());
    setSaveName('');
    setShowSave(false);
  };

  const handleDelete = (id: string) => {
    deleteUserPreset(id);
    setUserPresets(loadUserPresets());
  };

  return (
    <section>
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        <Bookmark className="w-3.5 h-3.5" /> Presets
      </label>

      {/* Preset list */}
      <div className="flex flex-col gap-1.5 mb-3">
        {allPresets.map(p => (
          <div key={p.id} className="flex items-center gap-1.5">
            <button
              onClick={() => onApply(p.config)}
              className="flex-1 text-left px-3 py-2 rounded-md text-sm transition-all active:scale-[0.97] surface-raised text-muted-foreground hover:text-foreground"
            >
              {p.name}
            </button>
            {p.id.startsWith('user-') && (
              <button
                onClick={() => handleDelete(p.id)}
                className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Save new */}
      {showSave ? (
        <div className="flex gap-2">
          <input
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="Preset name"
            className="flex-1 px-3 py-1.5 rounded-md bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={!saveName.trim()}
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-40"
          >
            Save
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowSave(true)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Save className="w-3 h-3" /> Save current as preset
        </button>
      )}
    </section>
  );
};

export default PresetSelector;
