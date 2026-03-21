import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import type { TemplateProps } from './template-contract';
import { getMediaEnhancement, getMotionConfig, getResponsiveTextSizes } from '@/lib/types';
import { applyTimelineControls, getMaskClipPath, sceneAt } from '@/lib/motion-utils';

const ProductShowcase = ({ config, isPlaying, onComplete, onTimelineReady }: TemplateProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const captionRef = useRef<HTMLSpanElement>(null);
  const priceRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const motion = getMotionConfig(config);
  const media = getMediaEnhancement(config);
  const textSizes = getResponsiveTextSizes(config);
  const at = useMemo(() => sceneAt(config), [config]);

  const bgStyle = config.background.type === 'gradient'
    ? { background: `linear-gradient(145deg, ${config.background.value}, ${config.background.gradientEnd || '#1f2937'})` }
    : { background: config.background.value };

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const bg = bgRef.current;
    const card = cardRef.current;
    const image = imageRef.current;
    const glow = glowRef.current;
    const heading = headingRef.current;
    const sub = subRef.current;
    const caption = captionRef.current;
    const price = priceRef.current;

    if (!stage || !bg || !card || !glow || !heading || !sub || !caption || !price) {
      console.warn('Missing GSAP target');
      onTimelineReady?.(null);
      return;
    }

    if (tlRef.current) tlRef.current.kill();

    gsap.set([card, heading, sub, caption, price, glow], { opacity: 0 });
    if (image) gsap.set(image, { opacity: 0, scale: media.kenBurns ? 1.14 : 1.05 });

    const tl = gsap.timeline({ paused: true, onComplete });

    tl.fromTo(bg, { scale: 1.08 }, { scale: 1, duration: 5, ease: 'power2.out' }, at(0));
    tl.fromTo(glow, { opacity: 0 }, { opacity: 0.9, duration: 1, ease: 'power2.out' }, at(0.1));

    tl.fromTo(card, { opacity: 0, y: 55, rotateX: 20, transformPerspective: 1200 }, { opacity: 1, y: 0, rotateX: 0, duration: 1, ease: 'expo.out' }, at(0.3));

    if (image) {
      tl.fromTo(
        image,
        { opacity: 0, clipPath: 'inset(0 0 100% 0)', filter: media.blurTransitions ? 'blur(8px)' : 'none' },
        { opacity: 1, clipPath: 'inset(0 0 0% 0)', filter: 'blur(0px)', duration: 0.9, ease: 'power3.out' },
        at(0.5),
      );

      if (media.kenBurns) {
        tl.to(image, { scale: 1.06, xPercent: motion.parallaxIntensity * -5, yPercent: motion.parallaxIntensity * 4, duration: 4.5, ease: 'sine.inOut' }, at(1.7));
      }
    }

    tl.fromTo(heading, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, at(0.85));
    tl.fromTo(sub, { opacity: 0, y: 18 }, { opacity: 0.85, y: 0, duration: 0.6, ease: 'power2.out' }, at(1.1));
    tl.fromTo(price, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(1.8)' }, at(1.3));
    tl.fromTo(caption, { opacity: 0, x: -16 }, { opacity: 0.76, x: 0, duration: 0.5, ease: 'power2.out' }, at(1.45));

    if (motion.animationPreset === 'zoom-transition') {
      tl.to(card, { scale: 1.03, duration: 0.5, yoyo: true, repeat: 1, ease: 'power2.inOut' }, at(2.2));
    }

    tl.to({}, { duration: 2.2 * Math.max(0.8, motion.sceneTiming) });

    tl.to(caption, { opacity: 0, y: -8, duration: 0.4, ease: 'power2.in' })
      .to(price, { opacity: 0, scale: 0.94, duration: 0.35, ease: 'power2.in' }, '>-0.2')
      .to(sub, { opacity: 0, y: -14, duration: 0.4, ease: 'power2.in' }, '>-0.15')
      .to(heading, { opacity: 0, y: -20, duration: 0.45, ease: 'power3.in' }, '>-0.2')
      .to(card, { opacity: 0, y: -25, rotateX: -10, duration: 0.6, ease: 'power3.in' }, '>-0.3');

    applyTimelineControls(tl, config);

    tlRef.current = tl;
    onTimelineReady?.(tl);

    return () => {
      tl.kill();
      if (tlRef.current === tl) tlRef.current = null;
      onTimelineReady?.(null);
    };
  }, [config, onComplete, onTimelineReady, motion.animationPreset, motion.parallaxIntensity, motion.sceneTiming, media.blurTransitions, media.kenBurns, at]);

  useEffect(() => {
    if (!tlRef.current) return;
    if (isPlaying) tlRef.current.restart();
    else tlRef.current.pause();
  }, [isPlaying]);

  const maskPath = getMaskClipPath(media.mask);

  return (
    <div ref={stageRef} className="w-full h-full relative overflow-hidden flex items-center justify-center p-10">
      <div ref={bgRef} className="tpl-bg absolute inset-0" style={bgStyle} />
      <div ref={glowRef} className="tpl-glow absolute inset-0" style={{ background: `radial-gradient(circle at 80% 20%, ${config.colors[0]}44 0%, transparent 55%)` }} />

      <div ref={cardRef} className="tpl-card relative z-10 w-full max-w-[78%] rounded-3xl border border-white/20 bg-black/30 backdrop-blur-md overflow-hidden shadow-2xl">
        {config.image && (
          <img
            ref={imageRef}
            src={config.image}
            alt=""
            className="tpl-image w-full h-[56%] object-cover"
            style={maskPath ? { clipPath: maskPath } : undefined}
          />
        )}

        <div className="p-6 md:p-8 flex flex-col gap-3">
          <h1 ref={headingRef} className="tpl-heading font-heading" style={{ color: config.colors[1] || '#f9fafb', fontSize: `${textSizes.heading}px` }}>
            {config.text.heading}
          </h1>
          <p ref={subRef} className="tpl-sub font-body" style={{ color: config.colors[2] || '#cbd5e1', fontSize: `${textSizes.subheading}px` }}>
            {config.text.subheading}
          </p>
          <div className="flex items-center justify-between mt-3">
            <span ref={priceRef} className="tpl-price font-display text-xl md:text-2xl" style={{ color: config.colors[0] }}>NEW DROP</span>
            <span ref={captionRef} className="tpl-caption font-body uppercase tracking-[0.2em]" style={{ color: config.colors[1] || '#e2e8f0', fontSize: `${textSizes.caption}px` }}>
              {config.text.caption}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductShowcase;
