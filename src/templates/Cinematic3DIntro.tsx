import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import type { TemplateProps } from './template-contract';
import { getMediaEnhancement, getMotionConfig, getResponsiveTextSizes } from '@/lib/types';
import { applyTimelineControls, getMaskClipPath, sceneAt } from '@/lib/motion-utils';

const Cinematic3DIntro = ({ config, isPlaying, onComplete, onTimelineReady }: TemplateProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const noiseRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const headingCharsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const motion = getMotionConfig(config);
  const media = getMediaEnhancement(config);
  const textSizes = getResponsiveTextSizes(config);
  const at = useMemo(() => sceneAt(config), [config]);

  const bgStyle = config.background.type === 'gradient'
    ? { background: `radial-gradient(circle at 20% 20%, ${config.background.gradientEnd || '#1a2455'} 0%, ${config.background.value} 70%)` }
    : { background: config.background.value };

  const chars = config.text.heading.split('');
  headingCharsRef.current = [];

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const bg = bgRef.current;
    const noise = noiseRef.current;
    const heading = headingRef.current;
    const sub = subRef.current;
    const caption = captionRef.current;
    const frame = frameRef.current;
    const glow = glowRef.current;
    const image = imageRef.current;
    const headingChars = headingCharsRef.current.filter((node): node is HTMLSpanElement => Boolean(node));

    if (!stage || !bg || !noise || !heading || !sub || !caption || !frame || !glow) {
      console.warn('Missing GSAP target');
      onTimelineReady?.(null);
      return;
    }

    if (tlRef.current) tlRef.current.kill();

    gsap.set([heading, sub, caption, frame, glow, noise], { opacity: 0 });
    if (headingChars.length > 0) {
      gsap.set(headingChars, {
        opacity: 0,
        y: 30,
        rotateX: motion.enable3D ? 70 : 0,
        filter: media.blurTransitions ? 'blur(6px)' : 'none',
        transformOrigin: '50% 50% -25',
      });
    }

    const tl = gsap.timeline({ paused: true, onComplete });

    tl.fromTo(bg, { scale: 1.15, rotate: -2 }, { scale: 1, rotate: 0, duration: 7, ease: 'sine.inOut' }, at(0));
    tl.fromTo(noise, { opacity: 0 }, { opacity: 0.2, duration: 0.7, ease: 'power2.out' }, at(0.1));
    tl.fromTo(glow, { opacity: 0, scale: 0.8 }, { opacity: 0.8, scale: 1, duration: 1.3, ease: 'power3.out' }, at(0.2));
    tl.fromTo(frame, { opacity: 0, rotateX: 18, z: -120 }, { opacity: 1, rotateX: 0, z: 0, duration: 1.2, ease: 'expo.out' }, at(0.4));

    if (image) {
      tl.fromTo(
        image,
        {
          opacity: 0,
          scale: media.kenBurns ? 1.2 : 1.08,
          z: -80,
          filter: media.blurTransitions ? 'blur(8px)' : 'none',
        },
        {
          opacity: 0.8,
          scale: 1,
          z: 0,
          filter: 'blur(0px)',
          duration: 1.4,
          ease: 'power3.out',
        },
        at(0.45),
      );
      if (media.kenBurns) {
        tl.to(image, { scale: 1.06, xPercent: motion.parallaxIntensity * -8, yPercent: motion.parallaxIntensity * 4, duration: 4.4, ease: 'sine.inOut' }, at(1.8));
      }
    }

    tl.to(heading, { opacity: 1, duration: 0.01 }, at(0.8));
    tl.to(
      headingChars,
      {
        opacity: 1,
        y: 0,
        rotateX: 0,
        filter: 'blur(0px)',
        duration: 0.8,
        stagger: { amount: 0.55, from: 'center' },
        ease: 'power3.out',
      },
      at(0.8),
    );

    tl.fromTo(sub, { opacity: 0, y: 20, z: -30 }, { opacity: 0.85, y: 0, z: 0, duration: 0.8, ease: 'power2.out' }, at(1.3));
    tl.fromTo(caption, { opacity: 0, clipPath: 'inset(0 0 100% 0)' }, { opacity: 0.7, clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'power2.out' }, at(1.7));

    tl.to(frame, {
      rotateY: motion.enable3D ? motion.depthIntensity * 14 : 0,
      rotateX: motion.enable3D ? motion.depthIntensity * -6 : 0,
      duration: 2.2,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 1,
    }, at(1.9));

    if (motion.animationPreset === 'glitch') {
      tl.to(heading, { x: -2, duration: 0.04, ease: 'none' }, at(2.2))
        .to(heading, { x: 2, duration: 0.04, ease: 'none' })
        .to(heading, { x: 0, duration: 0.05, ease: 'none' });
    }

    tl.to({}, { duration: 2.2 * Math.max(0.8, motion.sceneTiming) });

    tl.to(caption, { opacity: 0, y: -8, duration: 0.4, ease: 'power2.in' })
      .to(sub, { opacity: 0, y: -16, duration: 0.5, ease: 'power2.in' }, '>-0.2')
      .to(headingChars, { opacity: 0, y: -18, rotateX: -22, duration: 0.5, stagger: { amount: 0.2, from: 'edges' }, ease: 'power3.in' }, '>-0.2')
      .to([frame, glow], { opacity: 0, scale: 0.92, duration: 0.6, ease: 'power2.in' }, '>-0.25');

    applyTimelineControls(tl, config);

    tlRef.current = tl;
    onTimelineReady?.(tl);

    return () => {
      tl.kill();
      if (tlRef.current === tl) tlRef.current = null;
      onTimelineReady?.(null);
    };
  }, [config, onComplete, onTimelineReady, motion.animationPreset, motion.depthIntensity, motion.enable3D, motion.parallaxIntensity, motion.sceneTiming, media.blurTransitions, media.kenBurns, at]);

  useEffect(() => {
    if (!tlRef.current) return;
    if (isPlaying) tlRef.current.restart();
    else tlRef.current.pause();
  }, [isPlaying]);

  const maskPath = getMaskClipPath(media.mask);

  return (
    <div ref={stageRef} className="w-full h-full relative overflow-hidden flex items-center justify-center" style={{ perspective: motion.enable3D ? 1200 : undefined }}>
      <div ref={bgRef} className="tpl-bg absolute inset-0" style={bgStyle} />
      <div ref={noiseRef} className="tpl-noise absolute inset-0 mix-blend-soft-light" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px)', backgroundSize: '3px 3px' }} />
      <div ref={glowRef} className="tpl-glow absolute inset-0" style={{ background: `radial-gradient(circle at 50% 20%, ${config.colors[0]}55 0%, transparent 60%)` }} />

      {config.image && (
        <img
          ref={imageRef}
          src={config.image}
          alt=""
          className="tpl-image absolute inset-6 object-cover w-[calc(100%-3rem)] h-[calc(100%-3rem)] will-change-transform"
          style={maskPath ? { clipPath: maskPath } : { borderRadius: '20px' }}
        />
      )}

      <div ref={frameRef} className="tpl-frame absolute inset-5 border border-white/20 rounded-2xl pointer-events-none" />

      <div className="relative z-10 text-center px-10">
        <h1 ref={headingRef} className="tpl-heading font-display tracking-tight" style={{ color: config.colors[1] || '#f8fafc', fontSize: `${textSizes.heading}px` }}>
          {chars.map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="char inline-block"
              ref={(el) => {
                headingCharsRef.current[i] = el;
              }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </h1>
        <p ref={subRef} className="tpl-sub mt-4 font-body uppercase tracking-[0.35em]" style={{ color: config.colors[0], fontSize: `${textSizes.subheading}px` }}>{config.text.subheading}</p>
        <p ref={captionRef} className="tpl-caption mt-6 font-body tracking-[0.2em]" style={{ color: config.colors[2] || config.colors[1] || '#cbd5e1', fontSize: `${textSizes.caption}px` }}>{config.text.caption}</p>
      </div>
    </div>
  );
};

export default Cinematic3DIntro;
