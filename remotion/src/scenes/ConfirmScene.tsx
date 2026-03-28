import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ScreenshotFrame } from "../components/ScreenshotFrame";

export const ConfirmScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textSpring = spring({ frame, fps, config: { damping: 22, stiffness: 120 } });
  const textY = interpolate(textSpring, [0, 1], [50, 0]);
  const textOpacity = interpolate(textSpring, [0, 1], [0, 1]);

  // Checkmark animation
  const checkSpring = spring({ frame: frame - 20, fps, config: { damping: 12, stiffness: 200 } });
  const checkScale = interpolate(checkSpring, [0, 1], [0, 1]);

  return (
    <AbsoluteFill>
      {/* Text - center top */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          top: 70,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transform: `translateY(${textY}px)`,
          opacity: textOpacity,
        }}
      >
        {/* Checkmark circle */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "rgba(34,197,94,0.15)",
            border: "2px solid #22C55E",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 20,
            transform: `scale(${checkScale})`,
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
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
          E pronto. <span style={{ color: "#22C55E" }}>Confirmado.</span>
        </div>
      </div>

      {/* Two screenshots */}
      <ScreenshotFrame
        src="IMG_6917.png"
        width={340}
        height={680}
        delay={8}
        offsetX={-200}
        offsetY={80}
        rotation={-1}
      />
      <ScreenshotFrame
        src="IMG_6918.png"
        width={340}
        height={680}
        delay={16}
        offsetX={200}
        offsetY={80}
        rotation={1}
      />
    </AbsoluteFill>
  );
};
