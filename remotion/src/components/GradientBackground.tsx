import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export const GradientBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Slow pulsing green glow
  const pulse = Math.sin(frame * 0.03) * 0.5 + 0.5;
  const glowOpacity = interpolate(pulse, [0, 1], [0.06, 0.15]);
  const glowScale = interpolate(pulse, [0, 1], [0.8, 1.2]);

  // Slow drift
  const driftX = Math.sin(frame * 0.008) * 100;
  const driftY = Math.cos(frame * 0.006) * 60;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0A0A" }}>
      {/* Primary green glow */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          left: `calc(50% - 450px + ${driftX}px)`,
          top: `calc(50% - 450px + ${driftY}px)`,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,197,94,0.4) 0%, rgba(34,197,94,0) 70%)",
          opacity: glowOpacity,
          transform: `scale(${glowScale})`,
        }}
      />
      {/* Secondary glow offset */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          left: `calc(30% + ${-driftX * 0.5}px)`,
          top: `calc(60% + ${-driftY * 0.7}px)`,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,197,94,0.3) 0%, transparent 70%)",
          opacity: glowOpacity * 0.5,
          transform: `scale(${glowScale * 0.8})`,
        }}
      />
      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.03,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
    </AbsoluteFill>
  );
};
