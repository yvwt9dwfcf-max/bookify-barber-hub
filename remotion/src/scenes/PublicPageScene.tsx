import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ScreenshotFrame } from "../components/ScreenshotFrame";
import { SceneWrapper } from "../components/SceneWrapper";

export const PublicPageScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textSpring = spring({ frame, fps, config: { damping: 22, stiffness: 120 } });
  const textY = interpolate(textSpring, [0, 1], [50, 0]);
  const textOpacity = interpolate(textSpring, [0, 1], [0, 1]);

  return (
    <SceneWrapper>
      <AbsoluteFill>
        <div style={{ position: "absolute", left: 120, top: "50%", transform: `translateY(-50%) translateY(${textY}px)`, opacity: textOpacity, maxWidth: 500 }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "#22C55E", letterSpacing: 4, textTransform: "uppercase", marginBottom: 16 }}>Página pública</div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 52, fontWeight: 700, color: "#ffffff", lineHeight: 1.15, letterSpacing: -1 }}>
            Seus clientes te encontram <span style={{ color: "#22C55E" }}>online</span>
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 18, color: "rgba(255,255,255,0.5)", marginTop: 20, lineHeight: 1.6 }}>
            Sua barbearia com presença digital profissional, mapa e informações completas.
          </div>
        </div>
        <ScreenshotFrame src="IMG_6912-2.png" width={380} height={760} delay={8} offsetX={380} offsetY={0} />
      </AbsoluteFill>
    </SceneWrapper>
  );
};
