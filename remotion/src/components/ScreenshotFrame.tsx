import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from "remotion";

interface ScreenshotFrameProps {
  src: string;
  width?: number;
  height?: number;
  delay?: number;
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
}

export const ScreenshotFrame: React.FC<ScreenshotFrameProps> = ({
  src,
  width = 340,
  height = 680,
  delay = 0,
  offsetX = 0,
  offsetY = 0,
  rotation = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: frame - delay,
    fps,
    config: { damping: 20, stiffness: 120, mass: 1.2 },
  });

  const translateY = interpolate(entrance, [0, 1], [80, 0]);
  const scale = interpolate(entrance, [0, 1], [0.9, 1]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  // Subtle floating
  const float = Math.sin((frame - delay) * 0.04) * 4;

  return (
    <div
      style={{
        position: "absolute",
        left: `calc(50% + ${offsetX}px)`,
        top: `calc(50% + ${offsetY}px)`,
        transform: `translate(-50%, -50%) translateY(${translateY + float}px) scale(${scale}) rotate(${rotation}deg)`,
        opacity,
      }}
    >
      {/* Green glow behind */}
      <div
        style={{
          position: "absolute",
          inset: -40,
          borderRadius: 28,
          background: "radial-gradient(ellipse, rgba(34,197,94,0.2) 0%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />
      {/* Screenshot panel */}
      <div
        style={{
          width,
          height,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 25px 80px rgba(0,0,0,0.6), 0 0 40px rgba(34,197,94,0.1)",
          border: "1px solid rgba(255,255,255,0.08)",
          position: "relative",
        }}
      >
        <Img
          src={staticFile(`images/${src}`)}
          style={{
            width: "100%",
            height: "110%",
            objectFit: "cover",
            objectPosition: "center 8%",
            marginTop: "-5%",
          }}
        />
        {/* Subtle top reflection */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 30%)",
          }}
        />
      </div>
    </div>
  );
};
