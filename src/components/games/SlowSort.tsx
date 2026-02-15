import React, { useState } from "react";
import GameBoard from "./slow-sort/GameBoard";
import Controls from "./slow-sort/Controls";

interface SlowSortProps {
  numCards: number;
  initialConfiguration: string;
  showConfiguration: boolean;
}

function parseInitialConfig(config: string): number[] {
  const nums = config.trim().split(/\D+/).filter(Boolean).map(Number);
  if (nums.length === 0) return [1];
  const sorted = [...nums].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) return [1];
  }
  return nums;
}

export default function SlowSort({ initialConfiguration, showConfiguration }: Readonly<SlowSortProps>) {
  const [configuration, setConfiguration] = useState<number[]>(
    () => parseInitialConfig(initialConfiguration),
  );
  const [resetTrigger, setResetTrigger] = useState(0);

  const handleConfigChange = (newOrder: number[]) => {
    setConfiguration(newOrder);
    // Changing the card count (via +/- buttons) should also reset the game
    setResetTrigger((n) => n + 1);
  };

  return (
    <div>
      <GameBoard configuration={configuration.join(",")} resetTrigger={resetTrigger} />
      <Controls
        onReset={() => setResetTrigger((n) => n + 1)}
        configuration={configuration}
        onConfigurationChange={handleConfigChange}
        showConfiguration={showConfiguration}
      />
    </div>
  );
}
