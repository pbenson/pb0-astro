import React, { useState } from "react";
import GameBoard from "./slow-sort/GameBoard";
import Controls from "./slow-sort/Controls";

interface SlowSortProps {
  numCards: number;
  initialConfiguration: string;
  showConfiguration: boolean;
}

export default function SlowSort({ initialConfiguration, showConfiguration }: Readonly<SlowSortProps>) {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [resetTrigger, setResetTrigger] = useState(0);

  return (
    <div>
      <GameBoard configuration={configuration} resetTrigger={resetTrigger} />
      <Controls
        onReset={() => setResetTrigger((n) => n + 1)}
        configuration={configuration}
        onConfigurationChange={setConfiguration}
        showConfiguration={showConfiguration}
      />
    </div>
  );
}
