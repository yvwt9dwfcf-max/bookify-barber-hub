import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ScreenshotFrame } from "../components/ScreenshotFrame";
import { SceneWrapper } from "../components/SceneWrapper";

export const FluxoClienteScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textSpring = spring({ frame, fps, config: { damping: 22, stiffness: 120 } });
  const textY = interpolate(textSpring, [0, 1], [50, 0]);
  const textOpacity = interpolate(textSpring, [0, 1], [0, 1]);

  return (
    <SceneWrapper>
      <AbsoluteFill>
        <div style={{ position: "absolute", width: "100%", top: 60, display: "flex", flexDirection: "column", alignItems: "center", transform: `translateY(${textY}px)`, opacity: textOpacity }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "#22C55E", letterSpacing: 4, textTransform: "uppercase", marginBottom: 16 }}>Fluxo do Cliente</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 52, fontWeight: 700, color: "#ffffff", lineHeight: 1.15, letterSpacing: -1, textAlign: "center" }}>
            Escolhem, agendam e <span style={{ color: "#22C55E" }}>confirmam</span>
          </div>
        </div>
        <ScreenshotFrame src="IMG_6913.png" width={300} height={600} delay={6} offsetX={-380} offsetY={80} rotation={-3} />
        <ScreenshotFrame src="IMG_6914.png" width={300} height={600} delay={12} offsetX={0} offsetY={60} rotation={0} />
        <ScreenshotFrame src="IMG_6915.png" width={300} height={600} delay={18} offsetX={380} offsetY={80} rotation={3} />
      </AbsoluteFill>
    </SceneWrapper>
  );
};
