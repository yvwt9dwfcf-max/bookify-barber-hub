import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";

import { GradientBackground } from "./components/GradientBackground";
import { HookScene } from "./scenes/HookScene";
import { PublicPageScene } from "./scenes/PublicPageScene";
import { ServicesScene } from "./scenes/ServicesScene";
import { ScheduleScene } from "./scenes/ScheduleScene";
import { ConfirmScene } from "./scenes/ConfirmScene";
import { ClosingScene } from "./scenes/ClosingScene";

const TRANSITION_DURATION = 20;

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* Persistent animated background */}
      <GradientBackground />

      {/* Scene sequence with transitions */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={90}>
          <HookScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        <TransitionSeries.Sequence durationInFrames={120}>
          <PublicPageScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        <TransitionSeries.Sequence durationInFrames={120}>
          <ServicesScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        <TransitionSeries.Sequence durationInFrames={120}>
          <ScheduleScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        <TransitionSeries.Sequence durationInFrames={120}>
          <ConfirmScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        <TransitionSeries.Sequence durationInFrames={120}>
          <ClosingScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
