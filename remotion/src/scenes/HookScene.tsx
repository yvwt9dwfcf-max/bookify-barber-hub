import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo / brand mark entrance
  const logoSpring = spring({ frame, fps, config: { damping: 18, stiffness: 100 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0.6, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);

  // Text reveal with stagger
  const lines = ["Sua barbearia.", "Online.", "Agora."];

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Logo text */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          marginBottom: 40,
        }}
      >
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 28,
            fontWeight: 600,
            color: "#22C55E",
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          Bookify
        </div>
      </div>

      {/* Tagline */}
      <div style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
        {lines.map((line, i) => {
          const delay = 12 + i * 10;
          const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 140 } });
          const y = interpolate(s, [0, 1], [40, 0]);
          const o = interpolate(s, [0, 1], [0, 1]);

          return (
            <div
              key={i}
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: i === 2 ? 72 : 64,
                fontWeight: i === 2 ? 800 : 300,
                color: i === 2 ? "#22C55E" : "#ffffff",
                transform: `translateY(${y}px)`,
                opacity: o,
                letterSpacing: -1,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>

      {/* Decorative line */}
      <div
        style={{
          position: "absolute",
          bottom: 180,
          width: interpolate(
            spring({ frame: frame - 30, fps, config: { damping: 30 } }),
            [0, 1],
            [0, 200]
          ),
          height: 2,
          background: "linear-gradient(90deg, transparent, #22C55E, transparent)",
        }}
      />
    </AbsoluteFill>
  );
};
