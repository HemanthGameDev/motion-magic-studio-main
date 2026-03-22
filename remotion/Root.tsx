import { Composition } from 'remotion';
import { Video } from './Video';
import { DEFAULT_CONFIG } from '../src/lib/types';
import {
  REMOTION_RENDER_DURATION_IN_FRAMES,
  REMOTION_RENDER_FPS,
  REMOTION_RENDER_HEIGHT,
  REMOTION_RENDER_WIDTH,
} from '../src/lib/render-constants';

export const RemotionRoot = () => {
  return (
    <Composition
      id="Video"
      component={Video}
      durationInFrames={REMOTION_RENDER_DURATION_IN_FRAMES}
      fps={REMOTION_RENDER_FPS}
      width={REMOTION_RENDER_WIDTH}
      height={REMOTION_RENDER_HEIGHT}
      defaultProps={{
        config: DEFAULT_CONFIG,
      }}
    />
  );
};
