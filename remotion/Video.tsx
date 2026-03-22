import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AnimationConfig } from '../src/lib/types';

interface VideoProps {
  config: AnimationConfig;
}

export const Video = ({ config }: VideoProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: {
      damping: 200,
      stiffness: 120,
      mass: 0.8,
    },
  });

  const outroStart = fps * 5;
  const outroOpacity = interpolate(frame, [outroStart, fps * 6], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const opacity = entrance * outroOpacity;
  const translateY = interpolate(frame, [0, 24], [48, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const background = config.background.type === 'gradient'
    ? `linear-gradient(180deg, ${config.background.value}, ${config.background.gradientEnd || '#000000'})`
    : config.background.value;

  return (
    <AbsoluteFill
      style={{
        background,
        color: config.colors[1] || '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 72,
        fontFamily: 'Georgia, serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          width: '100%',
          maxWidth: 920,
          textAlign: 'center',
          opacity,
          transform: `translateY(${translateY}px) scale(${0.96 + entrance * 0.04})`,
        }}
      >
        <div
          style={{
            width: 120,
            height: 4,
            borderRadius: 999,
            backgroundColor: config.colors[0] || '#D4A373',
            opacity: 0.9,
          }}
        />
        <div
          style={{
            fontSize: config.headingSize ?? 80,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            textShadow: '0 10px 40px rgba(0, 0, 0, 0.35)',
          }}
        >
          {config.text.heading}
        </div>
        <div
          style={{
            fontSize: config.subheadingSize ?? 28,
            color: config.colors[2] || config.colors[1] || '#D9D9D9',
            fontWeight: 400,
            lineHeight: 1.4,
            maxWidth: 760,
          }}
        >
          {config.text.subheading}
        </div>
        <div
          style={{
            fontSize: config.captionSize ?? 18,
            color: config.colors[0] || '#D4A373',
            textTransform: 'uppercase',
            letterSpacing: '0.22em',
            fontWeight: 600,
          }}
        >
          {config.text.caption}
        </div>
      </div>
    </AbsoluteFill>
  );
};
