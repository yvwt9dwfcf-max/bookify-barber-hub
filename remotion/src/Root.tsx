import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 8 scenes: 90+120+120+100+120+120+100+120 = 890f
// minus 7 transitions × 20f = 140f overlap
// Total: 750f (~25s at 30fps)
const DURATION = 750;

export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={DURATION}
    fps={30}
    width={1920}
    height={1080}
  />
);
