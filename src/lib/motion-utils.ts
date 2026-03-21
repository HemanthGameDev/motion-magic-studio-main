import gsap from 'gsap';
import type { AnimationConfig } from './types';
import { getMotionConfig } from './types';

export function sceneAt(config: AnimationConfig): (seconds: number) => number {
  const motion = getMotionConfig(config);
  const spacing = Math.max(0.6, motion.sceneTiming);
  return (seconds: number) => seconds * spacing;
}

export function applyTimelineControls(timeline: gsap.core.Timeline, config: AnimationConfig): void {
  const motion = getMotionConfig(config);
  const baseDuration = Math.max(0.001, timeline.duration());
  const targetDuration = Math.max(2, motion.durationSec);
  const durationScale = baseDuration / targetDuration;
  const speedScale = Math.max(0.25, motion.speedMultiplier);
  timeline.timeScale(durationScale * speedScale);
}

export function applyPresetPulse(
  timeline: gsap.core.Timeline,
  target: gsap.TweenTarget,
  config: AnimationConfig,
  at: number,
): void {
  const motion = getMotionConfig(config);

  if (motion.animationPreset === 'cinematic-fade') {
    timeline.fromTo(
      target,
      { opacity: 0, y: 16, scale: 1.02, filter: 'blur(10px)' },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)',
        duration: 0.85,
        ease: 'power3.out',
        stagger: 0.05,
      },
      at,
    );
    return;
  }

  if (motion.animationPreset === 'kinetic-typography') {
    timeline.fromTo(
      target,
      { scale: 0.9, filter: 'blur(4px)' },
      { scale: 1, filter: 'blur(0px)', duration: 0.55, ease: 'back.out(1.9)' },
      at,
    );
    return;
  }

  if (motion.animationPreset === 'glitch') {
    timeline
      .to(target, { x: -3, duration: 0.04, ease: 'none' }, at)
      .to(target, { x: 3, duration: 0.04, ease: 'none' })
      .to(target, { x: -2, duration: 0.03, ease: 'none' })
      .to(target, { x: 0, duration: 0.05, ease: 'none' });
    return;
  }

  if (motion.animationPreset === 'zoom-transition') {
    timeline.fromTo(
      target,
      { scale: 1.12, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.7, ease: 'power3.out' },
      at,
    );
  }
}

export function getMaskClipPath(mask: 'none' | 'rounded' | 'circle' | 'vertical-slit'): string | undefined {
  if (mask === 'circle') return 'circle(45% at 50% 50%)';
  if (mask === 'vertical-slit') return 'inset(0 28% 0 28% round 24px)';
  return undefined;
}
