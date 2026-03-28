import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";

import { GradientBackground } from "./components/GradientBackground";
import { HookScene } from "./scenes/HookScene";
import { PainelScene } from "./scenes/PainelScene";
import { AgendaScene } from "./scenes/AgendaScene";
import { ClientesScene } from "./scenes/ClientesScene";
import { PublicPageScene } from "./scenes/PublicPageScene";
import { FluxoClienteScene } from "./scenes/FluxoClienteScene";
import { ConfirmScene } from "./scenes/ConfirmScene";
import { ClosingScene } from "./scenes/ClosingScene";

const T = 20; // transition duration

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <GradientBackground />

      <TransitionSeries>
        {/* 1 - Hook */}
        <TransitionSeries.Sequence durationInFrames={110}>
          <HookScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 2 - Painel */}
        <TransitionSeries.Sequence durationInFrames={150}>
          <PainelScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 3 - Agenda */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <AgendaScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 4 - Clientes */}
        <TransitionSeries.Sequence durationInFrames={100}>
          <ClientesScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 5 - Pagina Publica */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <PublicPageScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 6 - Fluxo Cliente */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <FluxoClienteScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 7 - Confirmação */}
        <TransitionSeries.Sequence durationInFrames={100}>
          <ConfirmScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 8 - Fechamento */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <ClosingScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
