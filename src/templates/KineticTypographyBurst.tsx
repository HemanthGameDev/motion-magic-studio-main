import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import type { TemplateProps } from './template-contract';
import { getMediaEnhancement, getMotionConfig, getResponsiveTextSizes } from '@/lib/types';
import { applyTimelineControls, getMaskClipPath, sceneAt } from '@/lib/motion-utils';

const KineticTypographyBurst = ({ config, isPlaying, onComplete, onTimelineReady }: TemplateProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const charsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const motion = getMotionConfig(config);
  const media = getMediaEnhancement(config);
  const textSizes = getResponsiveTextSizes(config);
  const at = useMemo(() => sceneAt(config), [config]);

  const bgStyle = config.background.type === 'gradient'
    ? { background: `linear-gradient(140deg, ${config.background.value}, ${config.background.gradientEnd || '#121212'})` }
    : { background: config.background.value };

  const chars = config.text.heading.split('');
  charsRef.current = [];

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const bg = bgRef.current;
    const image = imageRef.current;
    const heading = headingRef.current;
    const sub = subRef.current;
    const caption = captionRef.current;
    const charNodes = charsRef.current.filter((node): node is HTMLSpanElement => Boolean(node));

    if (!gsap || !stage || !bg || !heading || !sub || !caption || charNodes.length === 0) {
      console.warn('GSAP or element missing');
      onTimelineReady?.(null);
      return;
    }

    try {
      if (tlRef.current) tlRef.current.kill();

    gsap.set([heading, sub, caption], { opacity: 0 });
    gsap.set(charNodes, {
      opacity: 0,
      scale: 0,
      rotate: 10,
      y: 28,
      transformOrigin: '50% 60%',
      filter: media.blurTransitions ? 'blur(4px)' : 'none',
    });
    if (image) {
      gsap.set(image, {
        opacity: 0,
        scale: media.kenBurns ? 1.18 : 1.08,
      });
    }

    const tl = gsap.timeline({ paused: true, onComplete });

    tl.fromTo(bg, { scale: 1.1 }, { scale: 1, duration: 5.5, ease: 'power2.out' }, at(0));

    if (image) {
      tl.fromTo(
        image,
        {
          opacity: 0,
          scale: media.kenBurns ? 1.18 : 1.08,
          filter: media.blurTransitions ? 'blur(8px)' : 'none',
        },
        {
          opacity: 0.5,
          scale: 1,
          filter: 'blur(0px)',
          duration: 1.1,
          ease: 'power2.out',
        },
        at(0.08),
      );

      if (media.kenBurns) {
        tl.to(
          image,
          {
            scale: 1.05,
            xPercent: motion.parallaxIntensity * -6,
            yPercent: motion.parallaxIntensity * 3,
            duration: 3.6,
            ease: 'none',
          },
          at(1.2),
        );
      }
    }

    tl.to(heading, { opacity: 1, duration: 0.01 }, at(0.2));
    tl.from(
      charNodes,
      {
        opacity: 0,
        scale: 0,
        rotate: 10,
        y: 20,
        stagger: 0.05,
        ease: 'back.out(1.7)',
        duration: 0.5,
      },
      at(0.2),
    );
    tl.to(
      charNodes,
      {
        scale: 1.2,
        duration: 0.14,
        stagger: 0.02,
        ease: 'power2.out',
      },
      at(0.62),
    );
    tl.to(
      charNodes,
      {
        scale: 1,
        duration: 0.2,
        stagger: 0.02,
        ease: 'power2.inOut',
      },
      '>-0.05',
    );
    tl.to(
      charNodes,
      {
        filter: 'blur(0px)',
        y: 0,
        duration: 0.25,
        stagger: 0.01,
        ease: 'power2.out',
      },
      '<',
    );

    tl.fromTo(
      sub,
      { opacity: 0, y: 16 },
      { opacity: 0.9, y: 0, duration: 0.5, ease: 'power2.out' },
      at(0.9),
    );
    tl.fromTo(
      caption,
      { opacity: 0, y: 14 },
      { opacity: 0.78, y: 0, duration: 0.45, ease: 'power2.out' },
      at(1.1),
    );

    tl.to({}, { duration: 1.8 * Math.max(0.8, motion.sceneTiming) });

    tl.to(caption, { opacity: 0, y: -12, duration: 0.35, ease: 'power2.in' })
      .to(sub, { opacity: 0, y: -14, duration: 0.4, ease: 'power2.in' }, '>-0.15')
      .to(
        charNodes,
        {
          opacity: 0,
          y: -34,
          rotate: -8,
          duration: 0.45,
          stagger: { each: 0.02, from: 'end' },
          ease: 'power3.in',
        },
        '>-0.18',
      );

    if (image) {
      tl.to(image, { opacity: 0, duration: 0.45, ease: 'power2.in' }, '>-0.25');
    }

    applyTimelineControls(tl, config);
    tlRef.current = tl;
    onTimelineReady?.(tl);

    return () => {
      tl.kill();
      if (tlRef.current === tl) tlRef.current = null;
      onTimelineReady?.(null);
    };
    } catch (error) {
      console.warn('Template animation failed', error);
      if (tlRef.current) {
        tlRef.current.kill();
        tlRef.current = null;
      }
      onTimelineReady?.(null);
      return;
    }
  }, [config, onComplete, onTimelineReady, motion.parallaxIntensity, motion.sceneTiming, media.blurTransitions, media.kenBurns, at]);

  useEffect(() => {
    if (!tlRef.current) return;
    if (isPlaying) tlRef.current.restart();
    else tlRef.current.pause();
  }, [isPlaying]);

  const maskPath = getMaskClipPath(media.mask);

  return (
    <div ref={stageRef} className="w-full h-full relative overflow-hidden flex items-center justify-center px-8">
      <div ref={bgRef} className="absolute inset-0" style={bgStyle} />

      {config.image && (
        <>
          <img
            ref={imageRef}
            src={config.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={maskPath ? { clipPath: maskPath } : undefined}
          />
          <div className="absolute inset-0 bg-black/35 pointer-events-none" />
        </>
      )}

      <div className="relative z-10 text-center max-w-[90%]">
        <h1
          ref={headingRef}
          className="font-heading leading-[0.95] tracking-[-0.01em] break-words"
          style={{
            color: config.colors[1] || '#F8FAFC',
            fontSize: `${textSizes.heading}px`,
            fontWeight: 800,
            textWrap: 'balance',
          }}
        >
          {chars.map((ch, index) => (
            <span
              key={`${ch}-${index}`}
              className="inline-block will-change-transform"
              style={ch === ' ' ? { width: '0.25em' } : undefined}
              ref={(el) => {
                charsRef.current[index] = el;
              }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </h1>
        <p
          ref={subRef}
          className="mt-4 font-body uppercase tracking-[0.16em]"
          style={{
            color: config.colors[0],
            fontSize: `${textSizes.subheading}px`,
            fontWeight: 600,
          }}
        >
          {config.text.subheading}
        </p>
        <p
          ref={captionRef}
          className="mt-5 font-body tracking-[0.12em]"
          style={{
            color: config.colors[2] || config.colors[1] || '#CBD5E1',
            fontSize: `${textSizes.caption}px`,
          }}
        >
          {config.text.caption}
        </p>
      </div>
    </div>
  );
};

export default KineticTypographyBurst;
