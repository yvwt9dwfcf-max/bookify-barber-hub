import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ScreenshotFrame } from "../components/ScreenshotFrame";

export const ServicesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textSpring = spring({ frame, fps, config: { damping: 22, stiffness: 120 } });
  const textY = interpolate(textSpring, [0, 1], [50, 0]);
  const textOpacity = interpolate(textSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill>
      {/* Text - center top */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: 80,
          transform: `translateY(${textY}px)`,
          opacity: textOpacity,
          maxWidth: 500,
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
          Serviços
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
          Escolhem o{" "}
          <span style={{ color: "#22C55E" }}>serviço</span>
        </div>
      </div>

      {/* Two screenshots side by side with slight overlap */}
      <ScreenshotFrame
        src="IMG_6913.png"
        width={340}
        height={680}
        delay={6}
        offsetX={-100}
        offsetY={60}
        rotation={-2}
      />
      <ScreenshotFrame
        src="IMG_6914.png"
        width={340}
        height={680}
        delay={14}
        offsetX={280}
        offsetY={40}
        rotation={2}
      />
    </AbsoluteFill>
  );
};
