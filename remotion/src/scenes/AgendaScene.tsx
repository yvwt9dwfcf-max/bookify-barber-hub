import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ScreenshotFrame } from "../components/ScreenshotFrame";

export const AgendaScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textSpring = spring({ frame, fps, config: { damping: 22, stiffness: 120 } });
  const textY = interpolate(textSpring, [0, 1], [50, 0]);
  const textOpacity = interpolate(textSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill>
      {/* Text - left side */}
      <div
        style={{
          position: "absolute",
          left: 120,
          top: "50%",
          transform: `translateY(-50%) translateY(${textY}px)`,
          opacity: textOpacity,
          maxWidth: 480,
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
          Agenda
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
          Sua agenda sempre{" "}
          <span style={{ color: "#22C55E" }}>organizada</span>
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
          Veja todos os agendamentos do dia, semana e mês em um só lugar.
        </div>
      </div>

      {/* Two screenshots - right side */}
      <ScreenshotFrame
        src="IMG_6906.png"
        width={340}
        height={680}
        delay={6}
        offsetX={280}
        offsetY={-20}
        rotation={2}
      />
      <ScreenshotFrame
        src="IMG_6907.png"
        width={340}
        height={680}
        delay={14}
        offsetX={580}
        offsetY={20}
        rotation={-1}
      />
    </AbsoluteFill>
  );
};
