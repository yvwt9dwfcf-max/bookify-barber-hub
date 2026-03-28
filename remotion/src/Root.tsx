import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 8 scenes: 110+150+150+120+150+150+120+140 = 1090f
// No overlap (fade-through-black via SceneWrapper)
// Total: 1090f (~36s at 30fps)
const DURATION = 1090;

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
