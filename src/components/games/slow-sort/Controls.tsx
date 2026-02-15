import React from "react";
import { useIsDark, tokens, monoFont } from "./designTokens";

interface ControlsProps {
  onReset: () => void;
  configuration: string;
  onConfigurationChange: (value: string) => void;
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

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: t.inkSecondary,
    marginBottom: 6,
    fontFamily: monoFont,
  };

  const inputStyle: React.CSSProperties = {
    height: 36,
    padding: "0 10px",
    borderRadius: 4,
    fontFamily: monoFont,
    fontWeight: 600,
    fontSize: 14,
    background: t.paperRaised,
    color: t.ink,
    border: `1px solid ${t.rule}`,
    outline: "none",
    transition: "border-color 0.1s",
    colorScheme: dark ? "dark" : "light",
  };

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
        <div>
          <label style={labelStyle} htmlFor="slow-sort-config">
            initial configuration
          </label>
          <input
            id="slow-sort-config"
            type="text"
            value={configuration}
            onChange={(e) => onConfigurationChange(e.target.value)}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = t.gridTeal;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = t.rule;
            }}
            style={inputStyle}
          />
        </div>
      )}
      <div>
        <button type="button" style={btnStyle} onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  );
}
