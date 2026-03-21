import gsap from 'gsap';

export function safeAnimate(target: gsap.TweenTarget | null | undefined, animation: gsap.TweenVars): gsap.core.Tween | null {
  if (!target) {
    console.warn('Missing GSAP target');
    return null;
  }

  return gsap.to(target, animation);
}

export function safeFromTo(
  timeline: gsap.core.Timeline,
  target: gsap.TweenTarget | null | undefined,
  fromVars: gsap.TweenVars,
  toVars: gsap.TweenVars,
  position?: gsap.Position,
): void {
  if (!target) {
    console.warn('Missing GSAP target');
    return;
  }

  timeline.fromTo(target, fromVars, toVars, position);
}

export function safeSet(target: gsap.TweenTarget | null | undefined, vars: gsap.TweenVars): void {
  if (!target) {
    console.warn('Missing GSAP target');
    return;
  }

  gsap.set(target, vars);
}
