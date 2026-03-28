import React from "react";
import { AbsoluteFill, Series } from "remotion";

import { GradientBackground } from "./components/GradientBackground";
import { HookScene } from "./scenes/HookScene";
import { PainelScene } from "./scenes/PainelScene";
import { AgendaScene } from "./scenes/AgendaScene";
import { ClientesScene } from "./scenes/ClientesScene";
import { PublicPageScene } from "./scenes/PublicPageScene";
import { FluxoClienteScene } from "./scenes/FluxoClienteScene";
import { ConfirmScene } from "./scenes/ConfirmScene";
import { ClosingScene } from "./scenes/ClosingScene";

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <GradientBackground />

      <Series>
        <Series.Sequence durationInFrames={110}>
          <HookScene />
        </Series.Sequence>

        <Series.Sequence durationInFrames={150}>
          <PainelScene />
        </Series.Sequence>

        <Series.Sequence durationInFrames={150}>
          <AgendaScene />
        </Series.Sequence>

        <Series.Sequence durationInFrames={120}>
          <ClientesScene />
        </Series.Sequence>

        <Series.Sequence durationInFrames={150}>
          <PublicPageScene />
        </Series.Sequence>

        <Series.Sequence durationInFrames={150}>
          <FluxoClienteScene />
        </Series.Sequence>

        <Series.Sequence durationInFrames={120}>
          <ConfirmScene />
        </Series.Sequence>

        <Series.Sequence durationInFrames={140}>
          <ClosingScene />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
