import type { AnimationConfig } from './types';

export interface Preset {
  id: string;
  name: string;
  config: AnimationConfig;
}

const STORAGE_KEY = 'motion-studio-presets';

export const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'luxury-brand',
    name: 'Luxury Brand Ad',
    config: {
      template: 'luxury',
      text: {
        heading: 'Timeless Elegance',
        subheading: 'Where vision meets craft',
        caption: 'Est. 2025',
      },
      colors: ['#D4A373', '#FEFAE0', '#CCD5AE'],
      background: { type: 'gradient', value: '#1a1a2e', gradientEnd: '#0f0f23' },
      aspectRatio: '9:16',
    },
  },
  {
    id: 'instagram-promo',
    name: 'Instagram Promo',
    config: {
      template: 'bold',
      text: {
        heading: 'FLASH SALE',
        subheading: 'Up to 70% off everything',
        caption: 'Limited time only · Shop now',
      },
      colors: ['#FF6B35', '#F7F7F7', '#004E89'],
      background: { type: 'solid', value: '#0A0A0A' },
      aspectRatio: '9:16',
    },
  },
  {
    id: 'minimal-quote',
    name: 'Minimal Quote',
    config: {
      template: 'minimal',
      text: {
        heading: 'Less is more',
        subheading: 'Simplicity is the ultimate sophistication',
        caption: '— Leonardo da Vinci',
      },
      colors: ['#2D3436', '#636E72', '#B2BEC3'],
      background: { type: 'gradient', value: '#DFE6E9', gradientEnd: '#F5F6FA' },
      aspectRatio: '9:16',
    },
  },
  {
    id: 'dark-editorial',
    name: 'Dark Editorial',
    config: {
      template: 'luxury',
      text: {
        heading: 'The Art of Detail',
        subheading: 'Crafted with intention',
        caption: 'Collection 2025',
      },
      colors: ['#C9A96E', '#E8E0D4', '#8B7355'],
      background: { type: 'gradient', value: '#0d0d0d', gradientEnd: '#1a1512' },
      aspectRatio: '16:9',
    },
  },
  {
    id: 'energetic-launch',
    name: 'Product Launch',
    config: {
      template: 'bold',
      text: {
        heading: 'NOW LIVE',
        subheading: 'The wait is over',
        caption: 'Available worldwide',
      },
      colors: ['#E63946', '#F1FAEE', '#457B9D'],
      background: { type: 'solid', value: '#0B0B0F' },
      aspectRatio: '9:16',
    },
  },
];

export function loadUserPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveUserPreset(preset: Preset): void {
  const existing = loadUserPresets();
  const idx = existing.findIndex(p => p.id === preset.id);
  if (idx >= 0) existing[idx] = preset;
  else existing.push(preset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function deleteUserPreset(id: string): void {
  const existing = loadUserPresets().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function getAllPresets(): Preset[] {
  return [...DEFAULT_PRESETS, ...loadUserPresets()];
}
