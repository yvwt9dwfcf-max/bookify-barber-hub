import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ScreenshotFrame } from "../components/ScreenshotFrame";

export const PainelScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textSpring = spring({ frame, fps, config: { damping: 22, stiffness: 120 } });
  const textY = interpolate(textSpring, [0, 1], [50, 0]);
  const textOpacity = interpolate(textSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill>
      {/* Text - right side */}
      <div
        style={{
          position: "absolute",
          right: 120,
          top: "50%",
          transform: `translateY(-50%) translateY(${textY}px)`,
          opacity: textOpacity,
          maxWidth: 480,
          textAlign: "right",
        }}
      >
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: "#22C55E",
            letterSpacing: 4,
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Painel
        </div>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 52,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1.15,
            letterSpacing: -1,
          }}
        >
          Gerencie tudo em{" "}
          <span style={{ color: "#22C55E" }}>um só lugar</span>
        </div>
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 18,
            color: "rgba(255,255,255,0.5)",
            marginTop: 20,
            lineHeight: 1.6,
          }}
        >
          Dashboard completo com tudo que você precisa para controlar sua barbearia.
        </div>
      </div>

      {/* Two screenshots - left side, overlapping */}
      <ScreenshotFrame
        src="IMG_6904.png"
        width={340}
        height={680}
        delay={6}
        offsetX={-420}
        offsetY={0}
        rotation={-2}
      />
      <ScreenshotFrame
        src="IMG_6905.png"
        width={340}
        height={680}
        delay={14}
        offsetX={-60}
        offsetY={20}
        rotation={1}
      />
    </AbsoluteFill>
  );
};
