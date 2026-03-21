import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import type { TemplateProps } from './template-contract';
import { getMediaEnhancement, getMotionConfig, getResponsiveTextSizes } from '@/lib/types';
import { applyPresetPulse, applyTimelineControls, getMaskClipPath, sceneAt } from '@/lib/motion-utils';

const MinimalTemplate = ({ config, isPlaying, onComplete, onTimelineReady }: TemplateProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const ruleRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const headingWordsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const motion = getMotionConfig(config);
  const media = getMediaEnhancement(config);
  const textSizes = getResponsiveTextSizes(config);
  const at = useMemo(() => sceneAt(config), [config]);

  const bgStyle = config.background.type === 'gradient'
    ? { background: `linear-gradient(180deg, ${config.background.value}, ${config.background.gradientEnd || '#F5F6FA'})` }
    : { background: config.background.value };

  const words = config.text.heading.split(' ');
  headingWordsRef.current = [];

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const bg = bgRef.current;
    const heading = headingRef.current;
    const sub = subRef.current;
    const caption = captionRef.current;
    const dot = dotRef.current;
    const rule = ruleRef.current;
    const image = imageRef.current;
    const headingWords = headingWordsRef.current.filter((node): node is HTMLSpanElement => Boolean(node));

    if (!stage || !bg || !heading || !sub || !caption || !dot || !rule) {
      console.warn('Missing GSAP target');
      onTimelineReady?.(null);
      return;
    }

    if (tlRef.current) tlRef.current.kill();
    const targets: gsap.TweenTarget[] = [heading, sub, caption, dot, rule];
    if (image) targets.push(image);
    gsap.set(targets, { opacity: 0 });
    if (headingWords.length > 0) gsap.set(headingWords, { opacity: 0, y: 14, filter: media.blurTransitions ? 'blur(4px)' : 'none' });
    gsap.set(stage, {
      transformPerspective: motion.enable3D ? 800 : 0,
      rotateX: motion.enable3D ? 2 : 0,
      rotateY: motion.enable3D ? -2 : 0,
    });

    const tl = gsap.timeline({ paused: true, onComplete });

    tl.fromTo(bg, { scale: 1.06, y: 8 }, { scale: 1, y: 0, duration: 9, ease: 'power1.inOut' }, at(0));

    if (image) {
      tl.fromTo(
        image,
        { opacity: 0, y: 12, scale: media.kenBurns ? 1.15 : 1.05, filter: media.blurTransitions ? 'blur(6px)' : 'none' },
        { opacity: 0.55, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.2, ease: 'power2.out' },
        at(0.3),
      );
      if (media.kenBurns) {
        tl.to(image, { scale: 1.06, xPercent: motion.parallaxIntensity * 4, duration: 3.8, ease: 'sine.inOut', yoyo: true, repeat: 1 }, at(1.5));
      }
    }

    tl.fromTo(dot, { opacity: 0, scale: 0, filter: media.blurTransitions ? 'blur(6px)' : 'none' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out' }, at(0.4));
    tl.fromTo(rule, { opacity: 0, scaleX: 0 }, { opacity: 0.3, scaleX: 1, duration: 1.0, ease: 'power2.inOut' }, at(0.7));

    if (headingWords.length > 0) {
      tl.to(heading, { opacity: 1, duration: 0.01 }, at(1.0));
      tl.to(headingWords, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.7, ease: 'power3.out', stagger: 0.12 }, at(1.0));
      applyPresetPulse(tl, headingWords, config, at(1.25));
    } else {
      tl.fromTo(heading, { opacity: 0, x: -30, filter: media.blurTransitions ? 'blur(4px)' : 'none' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 1.0, ease: 'power3.out' }, at(1.0));
      applyPresetPulse(tl, heading, config, at(1.2));
    }

    tl.fromTo(sub, { opacity: 0, x: 20, filter: media.blurTransitions ? 'blur(3px)' : 'none' }, { opacity: 0.6, x: 0, filter: 'blur(0px)', duration: 0.9, ease: 'power2.out' }, at(1.5));
    tl.fromTo(caption, { opacity: 0, y: 6, clipPath: 'inset(0 100% 0 0)' }, { opacity: 0.45, y: 0, clipPath: 'inset(0 0% 0 0)', duration: 0.8, ease: 'power2.out' }, at(2.0));

    tl.to(stage, {
      rotateY: motion.enable3D ? motion.depthIntensity * 4 : 0,
      duration: 2.5,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: 1,
    }, at(2.1));

    tl.to({}, { duration: 2.6 * Math.max(0.8, motion.sceneTiming) });

    const exitStart = '>';
    tl.to(caption, { opacity: 0, y: -4, duration: 0.6, ease: 'power2.in' }, exitStart);
    tl.to(sub, { opacity: 0, x: -12, filter: media.blurTransitions ? 'blur(2px)' : 'none', duration: 0.7, ease: 'power2.in' }, '>-0.4');
    if (headingWords.length > 0) {
      tl.to(headingWords, { opacity: 0, y: -8, filter: media.blurTransitions ? 'blur(3px)' : 'none', duration: 0.6, ease: 'power2.in', stagger: { amount: 0.25, from: 'end' } }, '>-0.5');
    } else {
      tl.to(heading, { opacity: 0, x: 20, filter: media.blurTransitions ? 'blur(3px)' : 'none', duration: 0.7, ease: 'power2.in' }, '>-0.5');
    }
    tl.to(rule, { opacity: 0, scaleX: 0, duration: 0.5, ease: 'power2.in' }, '>-0.3');
    tl.to(dot, { opacity: 0, scale: 0.5, filter: media.blurTransitions ? 'blur(4px)' : 'none', duration: 0.5, ease: 'power2.in' }, '>-0.3');
    if (image) tl.to(image, { opacity: 0, y: -8, duration: 0.6, ease: 'power2.in' }, '>-0.4');

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
    <div ref={stageRef} className="tpl-stage w-full h-full flex flex-col items-start justify-center relative overflow-hidden px-10">
      <div ref={bgRef} className="tpl-bg absolute inset-0 will-change-transform" style={bgStyle} />

      {config.image && (
        <img
          ref={imageRef}
          src={config.image}
          alt=""
          className="tpl-image absolute bottom-6 right-6 w-20 h-20 object-cover rounded-md ring-1 ring-white/10 will-change-transform"
          style={maskPath ? { clipPath: maskPath } : undefined}
        />
      )}

      <div className="relative z-10 flex flex-col items-start">
        <div ref={dotRef} className="tpl-dot w-2.5 h-2.5 rounded-full mb-6 will-change-transform" style={{ background: config.colors[0] }} />
        <div ref={ruleRef} className="tpl-rule w-12 h-px mb-6" style={{ background: config.colors[0], transformOrigin: 'left center' }} />
        <h1 ref={headingRef} className="tpl-heading font-body font-semibold leading-tight" style={{ color: config.colors[0], fontSize: `${textSizes.heading}px`, lineHeight: 1.15, letterSpacing: '-0.01em' }}>
          {words.map((word, i) => (
            <span
              key={`${word}-${i}`}
              className="word inline-block will-change-transform"
              style={{ marginRight: '0.3em' }}
              ref={(el) => {
                headingWordsRef.current[i] = el;
              }}
            >
              {word}
            </span>
          ))}
        </h1>
        <p ref={subRef} className="tpl-sub font-body mt-3" style={{ color: config.colors[1] || '#636E72', fontSize: `${textSizes.subheading}px`, fontWeight: 300, lineHeight: 1.6 }}>
          {config.text.subheading}
        </p>
        <p ref={captionRef} className="tpl-caption font-body mt-8 uppercase tracking-widest" style={{ color: config.colors[1] || '#B2BEC3', fontSize: `${textSizes.caption}px`, fontWeight: 500, letterSpacing: '0.2em' }}>
          {config.text.caption}
        </p>
      </div>
    </div>
  );
};

export default MinimalTemplate;
