import React from "react";
import { useIsDark, tokens, monoFont } from "./designTokens";
import ChipRow from "./ChipRow";

interface ControlsProps {
  onReset: () => void;
  configuration: number[];
  onConfigurationChange: (value: number[]) => void;
  showConfiguration: boolean;
}

export default function Controls({
  onReset,
  configuration,
  onConfigurationChange,
  showConfiguration,
}: Readonly<ControlsProps>) {
  const dark = useIsDark();
  const t = tokens(dark);

  const btnStyle: React.CSSProperties = {
    height: 36,
    padding: "0 18px",
    borderRadius: 4,
    cursor: "pointer",
    fontFamily: monoFont,
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    background: t.gridTealBg,
    color: t.gridTeal,
    border: `1px solid ${t.gridTeal}`,
    transition: "background 0.1s, border-color 0.1s",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
      {showConfiguration && (
        <ChipRow order={configuration} onChange={onConfigurationChange} />
      )}
      <div>
        <button type="button" style={btnStyle} onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  );
}
