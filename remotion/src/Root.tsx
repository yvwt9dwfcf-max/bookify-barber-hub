import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 6 scenes × 120f each = 720f, minus 5 transitions × 20f = 100f overlap = 620f
// Hook is 90f, so total ≈ 590f + 90f adjustment = ~690f
const DURATION = 690;

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
