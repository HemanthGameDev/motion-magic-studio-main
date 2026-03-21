import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import type { TemplateProps } from './template-contract';
import { getMediaEnhancement, getMotionConfig, getResponsiveTextSizes } from '@/lib/types';
import { applyPresetPulse, applyTimelineControls, getMaskClipPath, sceneAt } from '@/lib/motion-utils';

const BoldTemplate = ({ config, isPlaying, onComplete, onTimelineReady }: TemplateProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const stripeRef = useRef<HTMLDivElement>(null);
  const stripeBottomRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const headingCharsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const motion = getMotionConfig(config);
  const media = getMediaEnhancement(config);
  const textSizes = getResponsiveTextSizes(config);
  const at = useMemo(() => sceneAt(config), [config]);

  const bgStyle = config.background.type === 'gradient'
    ? { background: `linear-gradient(160deg, ${config.background.value}, ${config.background.gradientEnd || '#000'})` }
    : { background: config.background.value };

  const chars = config.text.heading.split('');
  headingCharsRef.current = [];

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const bg = bgRef.current;
    const heading = headingRef.current;
    const sub = subRef.current;
    const caption = captionRef.current;
    const stripe = stripeRef.current;
    const stripeBottom = stripeBottomRef.current;
    const flash = flashRef.current;
    const image = imageRef.current;
    const headingChars = headingCharsRef.current.filter((node): node is HTMLSpanElement => Boolean(node));

    if (!stage || !bg || !heading || !sub || !caption || !stripe || !stripeBottom || !flash) {
      console.warn('Missing GSAP target');
      onTimelineReady?.(null);
      return;
    }

    if (tlRef.current) tlRef.current.kill();

    const targets: gsap.TweenTarget[] = [heading, sub, caption, stripe, stripeBottom, flash];
    if (image) targets.push(image);
    gsap.set(targets, { opacity: 0 });
    if (headingChars.length > 0) gsap.set(headingChars, { opacity: 0, y: 80, scaleY: 1.4 });

    gsap.set(stage, {
      transformPerspective: motion.enable3D ? 900 : 0,
      rotateX: motion.enable3D ? -3 : 0,
    });

    const tl = gsap.timeline({ paused: true, onComplete });

    tl.fromTo(bg, { scale: 1.2, x: -8 }, { scale: 1, x: 0, duration: 6.2, ease: 'power2.out' }, at(0));

    if (image) {
      tl.fromTo(
        image,
        { opacity: 0, scale: media.kenBurns ? 1.3 : 1.18, x: 40, filter: media.blurTransitions ? 'blur(4px)' : 'none' },
        { opacity: 0.86, scale: 1, x: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power4.out' },
        at(0.1),
      );
      if (media.kenBurns) {
        tl.to(image, { xPercent: motion.parallaxIntensity * -5, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: 1 }, at(1.5));
      }
    }

    tl.fromTo(flash, { opacity: 0 }, { opacity: 0.9, duration: 0.08, ease: 'none' }, at(0.1))
      .to(flash, { opacity: 0, duration: 0.25, ease: 'power2.out' }, at(0.18));

    tl.fromTo(stripe, { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.35, ease: 'power4.out' }, at(0.15));
    tl.fromTo(stripeBottom, { opacity: 0, scaleX: 0 }, { opacity: 0.6, scaleX: 1, duration: 0.4, ease: 'power4.out' }, at(0.22));

    if (headingChars.length > 0) {
      tl.to(heading, { opacity: 1, duration: 0.01 }, at(0.35));
      tl.to(headingChars, { opacity: 1, y: 0, scaleY: 1, duration: 0.55, ease: 'back.out(2.2)', stagger: { amount: 0.4, from: 'start' } }, at(0.35));
      applyPresetPulse(tl, headingChars, config, at(0.74));
    } else {
      tl.fromTo(heading, { opacity: 0, scale: 1.5, y: 50 }, { opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'back.out(1.6)' }, at(0.35));
      applyPresetPulse(tl, heading, config, at(0.55));
    }

    tl.fromTo(sub, { opacity: 0, x: -50, skewX: 8 }, { opacity: 0.95, x: 0, skewX: 0, duration: 0.55, ease: 'power3.out' }, at(0.75));
    tl.fromTo(caption, { opacity: 0, y: 25, clipPath: 'inset(0 0 100% 0)' }, { opacity: 0.82, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 0.5, ease: 'expo.out' }, at(1.0));

    tl.to(stage, {
      rotateY: motion.enable3D ? motion.depthIntensity * 8 : 0,
      duration: 1.4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 1,
    }, at(1.2));

    tl.to({}, { duration: 2.1 * Math.max(0.8, motion.sceneTiming) });

    const exitStart = '>';
    tl.to(caption, { opacity: 0, y: 15, duration: 0.3, ease: 'power3.in' }, exitStart);
    tl.to(sub, { opacity: 0, x: 40, skewX: -5, duration: 0.35, ease: 'power3.in' }, '>-0.15');
    if (headingChars.length > 0) {
      tl.to(headingChars, { opacity: 0, y: -60, scaleY: 0.7, duration: 0.4, ease: 'power4.in', stagger: { amount: 0.2, from: 'end' } }, '>-0.2');
    } else {
      tl.to(heading, { opacity: 0, scale: 0.85, y: -30, duration: 0.4, ease: 'power4.in' }, '>-0.2');
    }
    tl.to([stripe, stripeBottom], { opacity: 0, scaleX: 0, duration: 0.3, ease: 'power4.in' }, '>-0.2');
    if (image) tl.to(image, { opacity: 0, x: -30, duration: 0.4, ease: 'power3.in' }, '>-0.3');

    applyTimelineControls(tl, config);

    tlRef.current = tl;
    onTimelineReady?.(tl);
    return () => {
      tl.kill();
      if (tlRef.current === tl) tlRef.current = null;
      onTimelineReady?.(null);
    };
  }, [config, onComplete, onTimelineReady, motion.enable3D, motion.depthIntensity, motion.parallaxIntensity, motion.sceneTiming, media.blurTransitions, media.kenBurns, at]);

  useEffect(() => {
    if (!tlRef.current) return;
    if (isPlaying) tlRef.current.restart();
    else tlRef.current.pause();
  }, [isPlaying]);

  const maskPath = getMaskClipPath(media.mask);

  return (
    <div ref={stageRef} className="tpl-stage w-full h-full flex flex-col items-center justify-center relative overflow-hidden">
      <div ref={bgRef} className="tpl-bg absolute inset-0 will-change-transform" style={bgStyle} />

      {config.image && (
        <>
          <img
            ref={imageRef}
            src={config.image}
            alt=""
            className="tpl-image absolute right-0 top-0 w-1/2 h-full object-cover will-change-transform"
            style={{ clipPath: maskPath || 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }}
          />
          <div className="absolute right-0 top-0 w-1/2 h-full bg-black/40 pointer-events-none" style={{ clipPath: maskPath || 'polygon(20% 0, 100% 0, 100% 100%, 0% 100%)' }} />
        </>
      )}

      <div ref={flashRef} className="tpl-flash absolute inset-0 pointer-events-none" style={{ background: config.colors[0] }} />
      <div ref={stripeRef} className="tpl-stripe absolute left-0 w-full h-1.5" style={{ background: config.colors[0], top: '28%', transformOrigin: 'left center' }} />
      <div ref={stripeBottomRef} className="tpl-stripe-bottom absolute left-0 w-full h-1" style={{ background: config.colors[0], bottom: '30%', transformOrigin: 'right center' }} />

      <div className="relative z-10 flex flex-col items-center justify-center">
        <h1 ref={headingRef} className="tpl-heading font-heading text-center px-6 relative" style={{ color: config.colors[1] || '#F7F7F7', fontSize: `${textSizes.heading}px`, lineHeight: 0.95, letterSpacing: '-0.02em' }}>
          {chars.map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="char inline-block will-change-transform"
              style={ch === ' ' ? { width: '0.3em' } : undefined}
              ref={(el) => {
                headingCharsRef.current[i] = el;
              }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </h1>
        <p ref={subRef} className="tpl-sub font-body text-center mt-4 px-8 font-semibold uppercase tracking-wider" style={{ color: config.colors[0], fontSize: `${textSizes.subheading}px`, letterSpacing: '0.15em' }}>
          {config.text.subheading}
        </p>
        <p ref={captionRef} className="tpl-caption font-body text-center mt-6 px-10" style={{ color: config.colors[2] || config.colors[1] || '#999', fontSize: `${textSizes.caption}px`, fontWeight: 400, lineHeight: 1.5 }}>
          {config.text.caption}
        </p>
      </div>
    </div>
  );
};

export default BoldTemplate;
