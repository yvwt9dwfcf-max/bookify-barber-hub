import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const ClosingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSpring = spring({ frame, fps, config: { damping: 16, stiffness: 100 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0.7, 1]);
  const logoOpacity = interpolate(logoSpring, [0, 1], [0, 1]);

  const taglineSpring = spring({ frame: frame - 12, fps, config: { damping: 22, stiffness: 120 } });
  const tagY = interpolate(taglineSpring, [0, 1], [30, 0]);
  const tagOpacity = interpolate(taglineSpring, [0, 1], [0, 1]);

  const ctaSpring = spring({ frame: frame - 28, fps, config: { damping: 20, stiffness: 140 } });
  const ctaScale = interpolate(ctaSpring, [0, 1], [0.8, 1]);
  const ctaOpacity = interpolate(ctaSpring, [0, 1], [0, 1]);

  // Pulsing glow behind logo
  const pulse = Math.sin(frame * 0.08) * 0.5 + 0.5;
  const glowOpacity = interpolate(pulse, [0, 1], [0.15, 0.35]);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      {/* Big glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 70%)",
          opacity: glowOpacity,
        }}
      />

      {/* Logo */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 80,
            fontWeight: 800,
            color: "#22C55E",
            letterSpacing: -2,
          }}
        >
          Bookify
        </div>
      </div>

      {/* Tagline */}
      <div
        style={{
          transform: `translateY(${tagY}px)`,
          opacity: tagOpacity,
          marginTop: 16,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 28,
            fontWeight: 300,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: 1,
          }}
        >
          Mais clientes, menos confusão
        </div>
      </div>

      {/* CTA badge */}
      <div
        style={{
          marginTop: 40,
          transform: `scale(${ctaScale})`,
          opacity: ctaOpacity,
        }}
      >
        <div
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 18,
            fontWeight: 600,
            color: "#0A0A0A",
            background: "#22C55E",
            padding: "14px 40px",
            borderRadius: 50,
            letterSpacing: 1,
          }}
        >
          3 DIAS GRÁTIS
        </div>
      </div>
    </AbsoluteFill>
  );
};
