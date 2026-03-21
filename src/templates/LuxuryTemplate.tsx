import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import type { TemplateProps } from './template-contract';
import { getMediaEnhancement, getMotionConfig, getResponsiveTextSizes } from '@/lib/types';
import { applyPresetPulse, applyTimelineControls, getMaskClipPath, sceneAt } from '@/lib/motion-utils';

const LuxuryTemplate = ({ config, isPlaying, onComplete, onTimelineReady }: TemplateProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const ornamentRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const headingCharsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const motion = getMotionConfig(config);
  const media = getMediaEnhancement(config);
  const textSizes = getResponsiveTextSizes(config);
  const at = useMemo(() => sceneAt(config), [config]);

  const bgStyle = config.background.type === 'gradient'
    ? { background: `linear-gradient(160deg, ${config.background.value}, ${config.background.gradientEnd || '#0f0f23'})` }
    : { background: config.background.value };

  const chars = config.text.heading.split('');
  headingCharsRef.current = [];

  useLayoutEffect(() => {
    const bg = bgRef.current;
    const heading = headingRef.current;
    const sub = subRef.current;
    const caption = captionRef.current;
    const line = lineRef.current;
    const ornament = ornamentRef.current;
    const vignette = vignetteRef.current;
    const stage = stageRef.current;
    const image = imageRef.current;
    const headingChars = headingCharsRef.current.filter((node): node is HTMLSpanElement => Boolean(node));

    if (!bg || !heading || !sub || !caption || !line || !ornament || !vignette || !stage) {
      console.warn('Missing GSAP target');
      onTimelineReady?.(null);
      return;
    }

    if (tlRef.current) tlRef.current.kill();

    const targets: gsap.TweenTarget[] = [heading, sub, caption, line, ornament, vignette];
    if (image) targets.push(image);

    gsap.set(targets, { opacity: 0 });
    gsap.set(stage, {
      transformPerspective: motion.enable3D ? 1100 : 0,
      transformStyle: motion.enable3D ? 'preserve-3d' : 'flat',
    });

    if (headingChars.length > 0) {
      gsap.set(headingChars, {
        opacity: 0,
        y: 25,
        rotateX: motion.enable3D ? 45 : 0,
        filter: media.blurTransitions ? 'blur(4px)' : 'none',
      });
    }

    const tl = gsap.timeline({ paused: true, onComplete });

    tl.fromTo(
      bg,
      {
        scale: 1.12 + motion.parallaxIntensity * 0.05,
        x: 10,
        y: 6,
        filter: media.blurTransitions ? 'blur(2px)' : 'none',
      },
      {
        scale: 1,
        x: 0,
        y: 0,
        filter: 'blur(0px)',
        duration: 8,
        ease: 'power1.inOut',
      },
      0,
    );

    tl.fromTo(vignette, { opacity: 0 }, { opacity: 1, duration: 2, ease: 'power2.out' }, at(0));

    if (image) {
      tl.fromTo(
        image,
        {
          opacity: 0,
          scale: media.kenBurns ? 1.18 : 1.06,
          filter: media.blurTransitions ? 'blur(5px)' : 'none',
        },
        {
          opacity: 0.74,
          scale: media.kenBurns ? 1.03 : 1,
          filter: 'blur(0px)',
          duration: 2.5,
          ease: 'power2.out',
        },
        at(0.2),
      );

      if (media.kenBurns) {
        tl.to(
          image,
          {
            scale: 1,
            xPercent: motion.parallaxIntensity * -2,
            yPercent: motion.parallaxIntensity * 1.5,
            duration: 5.8,
            ease: 'none',
          },
          at(2.2),
        );
      }
    }

    tl.fromTo(
      ornament,
      { opacity: 0, scale: 0.3, rotation: -90 },
      { opacity: 0.85, scale: 1, rotation: 0, duration: 1.2, ease: 'expo.out' },
      at(0.3),
    );

    tl.fromTo(
      line,
      { opacity: 0, scaleX: 0 },
      { opacity: 0.5, scaleX: 1, duration: 1.4, ease: 'power3.inOut' },
      at(0.6),
    );

    if (headingChars.length > 0) {
      tl.to(heading, { opacity: 1, duration: 0.01 }, at(1.0));
      tl.to(
        headingChars,
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          filter: 'blur(0px)',
          duration: 0.8,
          ease: 'power3.out',
          stagger: { amount: 0.6, from: 'start' },
        },
        at(1.0),
      );
      applyPresetPulse(tl, headingChars, config, at(1.4));
    } else {
      tl.fromTo(
        heading,
        { opacity: 0, y: 35, filter: media.blurTransitions ? 'blur(6px)' : 'none' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.3, ease: 'power3.out' },
        at(1.0),
      );
      applyPresetPulse(tl, heading, config, at(1.2));
    }

    tl.fromTo(
      sub,
      { opacity: 0, y: 18, filter: media.blurTransitions ? 'blur(4px)' : 'none' },
      { opacity: 0.82, y: 0, filter: 'blur(0px)', duration: 1.0, ease: 'power2.out' },
      at(1.6),
    );

    tl.fromTo(
      caption,
      { opacity: 0, letterSpacing: '0.05em', y: 8 },
      { opacity: 0.65, letterSpacing: '0.35em', y: 0, duration: 1.2, ease: 'power2.out' },
      at(2.0),
    );

    tl.to(stage, {
      rotateX: motion.enable3D ? motion.depthIntensity * -3 : 0,
      rotateY: motion.enable3D ? motion.depthIntensity * 3 : 0,
      duration: 2.3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 1,
    }, at(2.2));

    tl.to({}, { duration: 2.4 * Math.max(0.8, motion.sceneTiming) });

    const exitStart = '>';
    tl.to(caption, { opacity: 0, y: -6, duration: 0.6, ease: 'power2.in' }, exitStart);
    tl.to(sub, { opacity: 0, y: -10, filter: media.blurTransitions ? 'blur(3px)' : 'none', duration: 0.7, ease: 'power2.in' }, '>-0.4');

    if (headingChars.length > 0) {
      tl.to(
        headingChars,
        {
          opacity: 0,
          y: -15,
          rotateX: motion.enable3D ? -22 : 0,
          duration: 0.6,
          ease: 'power3.in',
          stagger: { amount: 0.3, from: 'end' },
        },
        '>-0.5',
      );
    } else {
      tl.to(heading, { opacity: 0, y: -20, filter: media.blurTransitions ? 'blur(4px)' : 'none', duration: 0.7, ease: 'power3.in' }, '>-0.5');
    }

    tl.to([line, ornament], { opacity: 0, scale: 0.8, duration: 0.6, ease: 'power2.in' }, '>-0.4');
    if (image) tl.to(image, { opacity: 0, scale: 1.06, duration: 0.8, ease: 'power2.in' }, '>-0.5');
    tl.to(vignette, { opacity: 0, duration: 0.5 }, '>-0.3');

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
            className="tpl-image absolute inset-0 w-full h-full object-cover will-change-transform"
            style={maskPath ? { clipPath: maskPath } : undefined}
          />
          <div className="absolute inset-0 bg-black/50 pointer-events-none" />
        </>
      )}

      <div
        ref={vignetteRef}
        className="tpl-vignette absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)' }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center">
        <div ref={ornamentRef} className="tpl-ornament mb-6" style={{ color: config.colors[0] }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M20 0L23.5 16.5L40 20L23.5 23.5L20 40L16.5 23.5L0 20L16.5 16.5L20 0Z" fill="currentColor" opacity="0.7" />
          </svg>
        </div>
        <div ref={lineRef} className="tpl-line w-24 h-px mb-8" style={{ background: config.colors[0], transformOrigin: 'center' }} />
        <h1
          ref={headingRef}
          className="tpl-heading font-display text-center px-8 leading-tight"
          style={{
            color: config.colors[1] || '#FEFAE0',
            fontSize: `${textSizes.heading}px`,
            fontWeight: 700,
            lineHeight: 1.1,
            perspective: motion.enable3D ? '700px' : 'none',
          }}
        >
          {chars.map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="char inline-block will-change-transform"
              style={ch === ' ' ? { width: '0.25em' } : undefined}
              ref={(el) => {
                headingCharsRef.current[i] = el;
              }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </h1>
        <p ref={subRef} className="tpl-sub font-body text-center mt-4 px-10" style={{ color: config.colors[1] || '#FEFAE0', fontSize: `${textSizes.subheading}px`, fontWeight: 300, lineHeight: 1.6 }}>
          {config.text.subheading}
        </p>
        <p ref={captionRef} className="tpl-caption font-body text-center mt-8 uppercase tracking-widest" style={{ color: config.colors[0], fontSize: `${textSizes.caption}px`, fontWeight: 500, letterSpacing: '0.2em' }}>
          {config.text.caption}
        </p>
      </div>
    </div>
  );
};

export default LuxuryTemplate;
