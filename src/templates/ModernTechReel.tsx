import { useLayoutEffect, useMemo, useRef, useState, useEffect } from 'react';
import gsap from 'gsap';
import type { TemplateProps } from './template-contract';
import { getMediaEnhancement, getMotionConfig, getResponsiveTextSizes } from '@/lib/types';
import { applyTimelineControls, getMaskClipPath, sceneAt } from '@/lib/motion-utils';
import MinimalTemplate from './MinimalTemplate';

const ModernTechReel = ({ config, isPlaying, onComplete, onTimelineReady }: TemplateProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const barTopRef = useRef<HTMLDivElement>(null);
  const barBottomRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const headingCharsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  const motion = getMotionConfig(config);
  const media = getMediaEnhancement(config);
  const textSizes = getResponsiveTextSizes(config);
  const at = useMemo(() => sceneAt(config), [config]);

  const bgStyle = config.background.type === 'gradient'
    ? { background: `linear-gradient(150deg, ${config.background.value}, ${config.background.gradientEnd || '#0f172a'})` }
    : { background: config.background.value };

  const chars = config.text.heading.split('');
  headingCharsRef.current = [];

  useLayoutEffect(() => {
    if (hasFailed) return;

    const bg = bgRef.current;
    const grid = gridRef.current;
    const heading = headingRef.current;
    const sub = subRef.current;
    const caption = captionRef.current;
    const barTop = barTopRef.current;
    const barBottom = barBottomRef.current;
    const glow = glowRef.current;
    const image = imageRef.current;
    const headingChars = headingCharsRef.current.filter((node): node is HTMLSpanElement => Boolean(node));

    if (!bg || !grid || !heading || !sub || !caption || !barTop || !barBottom || !glow) {
      console.warn('Missing GSAP target');
      setHasFailed(true);
      onTimelineReady?.(null);
      return;
    }

    try {
      if (tlRef.current) {
        tlRef.current.kill();
      }

      gsap.set([heading, sub, caption, barTop, barBottom, glow], { opacity: 0 });
      gsap.set(headingChars, {
        opacity: 0,
        y: 38,
        rotateX: motion.enable3D ? 45 : 0,
        filter: media.blurTransitions ? 'blur(4px)' : 'none',
      });

      if (image) {
        gsap.set(image, { opacity: 0, scale: media.kenBurns ? 1.16 : 1.08 });
      }

      const tl = gsap.timeline({ paused: true, onComplete });

      tl.fromTo(bg, { scale: 1.1 }, { scale: 1, duration: 6.5, ease: 'power2.out' }, at(0));
      tl.fromTo(grid, { opacity: 0.1, y: 18 }, { opacity: 0.24, y: 0, duration: 1.1, ease: 'power2.out' }, at(0.1));
      tl.fromTo(glow, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' }, at(0.2));

      if (image) {
        tl.fromTo(
          image,
          { opacity: 0, clipPath: 'inset(100% 0 0 0)', filter: media.blurTransitions ? 'blur(8px)' : 'none' },
          { opacity: 0.74, clipPath: 'inset(0% 0 0 0)', filter: 'blur(0px)', duration: 0.85, ease: 'power3.out' },
          at(0.35),
        );

        if (media.kenBurns) {
          tl.to(image, { scale: 1.04, xPercent: motion.parallaxIntensity * -6, duration: 4.2, ease: 'none' }, at(1.5));
        }
      }

      tl.fromTo(barTop, { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1, duration: 0.5, ease: 'power4.out' }, at(0.5));
      tl.fromTo(barBottom, { opacity: 0, scaleX: 0 }, { opacity: 0.7, scaleX: 1, duration: 0.6, ease: 'power4.out' }, at(0.6));

      tl.to(heading, { opacity: 1, duration: 0.01 }, at(0.7));
      tl.to(
        headingChars,
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          filter: 'blur(0px)',
          duration: 0.6,
          ease: 'back.out(1.8)',
          stagger: { each: 0.03, from: 'random' },
        },
        at(0.7),
      );

      tl.fromTo(sub, { opacity: 0, x: -28 }, { opacity: 0.9, x: 0, duration: 0.55, ease: 'power2.out' }, at(1.0));
      tl.fromTo(caption, { opacity: 0, x: 28 }, { opacity: 0.8, x: 0, duration: 0.55, ease: 'power2.out' }, at(1.15));

      if (motion.animationPreset === 'glitch') {
        tl.to([heading, sub], { x: -4, duration: 0.035, ease: 'none' }, at(1.6))
          .to([heading, sub], { x: 4, duration: 0.035, ease: 'none' })
          .to([heading, sub], { x: 0, duration: 0.05, ease: 'none' });
      }

      tl.to({}, { duration: 2.3 * Math.max(0.8, motion.sceneTiming) });

      tl.to(caption, { opacity: 0, x: -20, duration: 0.35, ease: 'power2.in' })
        .to(sub, { opacity: 0, x: 20, duration: 0.35, ease: 'power2.in' }, '>-0.2')
        .to(headingChars, { opacity: 0, y: -25, duration: 0.4, stagger: { amount: 0.15, from: 'end' }, ease: 'power3.in' }, '>-0.18')
        .to([barTop, barBottom], { opacity: 0, scaleX: 0, duration: 0.35, ease: 'power4.in' }, '>-0.2')
        .to([image, glow], { opacity: 0, duration: 0.45, ease: 'power2.in' }, '>-0.25');

      applyTimelineControls(tl, config);

      tlRef.current = tl;
      onTimelineReady?.(tl);

      return () => {
        tl.kill();
        if (tlRef.current === tl) tlRef.current = null;
        onTimelineReady?.(null);
      };
    } catch (error) {
      console.warn('Template failed, fallback used', error);
      setHasFailed(true);
      onTimelineReady?.(null);
      if (tlRef.current) {
        tlRef.current.kill();
        tlRef.current = null;
      }
      return undefined;
    }
  }, [config, onComplete, onTimelineReady, motion.animationPreset, motion.enable3D, motion.parallaxIntensity, motion.sceneTiming, media.blurTransitions, media.kenBurns, at, hasFailed]);

  useEffect(() => {
    if (hasFailed) return;
    if (!tlRef.current) return;
    if (isPlaying) tlRef.current.restart();
    else tlRef.current.pause();
  }, [isPlaying, hasFailed]);

  if (hasFailed) {
    return (
      <MinimalTemplate
        config={config}
        isPlaying={isPlaying}
        onComplete={onComplete}
        onTimelineReady={onTimelineReady}
      />
    );
  }

  const maskPath = getMaskClipPath(media.mask);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden flex items-center justify-center">
      <div ref={bgRef} className="tpl-bg absolute inset-0" style={bgStyle} />
      <div ref={gridRef} className="tpl-grid absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)', backgroundSize: '54px 54px' }} />
      <div ref={glowRef} className="tpl-glow absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, ${config.colors[0]}33 0%, transparent 60%)` }} />

      {config.image && (
        <img
          ref={imageRef}
          src={config.image}
          alt=""
          className="tpl-image absolute inset-0 w-full h-full object-cover mix-blend-screen"
          style={maskPath ? { clipPath: maskPath } : undefined}
        />
      )}

      <div ref={barTopRef} className="tpl-bar-top absolute top-[26%] left-0 right-0 h-0.5" style={{ background: config.colors[0], transformOrigin: 'left center' }} />
      <div ref={barBottomRef} className="tpl-bar-bottom absolute bottom-[30%] left-0 right-0 h-0.5" style={{ background: config.colors[2] || config.colors[1], transformOrigin: 'right center' }} />

      <div className="relative z-10 text-center px-8">
        <h1 ref={headingRef} className="tpl-heading font-heading uppercase tracking-[0.04em]" style={{ color: config.colors[1] || '#e2e8f0', fontSize: `${textSizes.heading}px` }}>
          {chars.map((ch, idx) => (
            <span
              key={`${ch}-${idx}`}
              className="char inline-block"
              ref={(el) => {
                headingCharsRef.current[idx] = el;
              }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </h1>
        <p ref={subRef} className="tpl-sub mt-4 font-body uppercase tracking-[0.2em]" style={{ color: config.colors[0], fontSize: `${textSizes.subheading}px` }}>{config.text.subheading}</p>
        <p ref={captionRef} className="tpl-caption mt-6 font-body tracking-[0.18em]" style={{ color: config.colors[2] || '#bfdbfe', fontSize: `${textSizes.caption}px` }}>{config.text.caption}</p>
      </div>
    </div>
  );
};

export default ModernTechReel;
