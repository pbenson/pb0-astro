import React from "react";
import { useIsDark, tokens, monoFont } from "./designTokens";

interface NumberInputRowProps {
  label: string;
  values: number[];
  onChange: (values: number[]) => void;
}

export default function NumberInputRow({ label, values, onChange }: Readonly<NumberInputRowProps>) {
  const dark = useIsDark();
  const t = tokens(dark);

  const updateValue = (i: number, raw: string) => {
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 1) return;
    const updated = [...values];
    updated[i] = n;
    onChange(updated);
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: t.inkSecondary,
    marginBottom: "6px",
    fontFamily: monoFont,
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center",
    marginBottom: "8px",
  };

  const inputStyle: React.CSSProperties = {
    width: "40px",
    height: "40px",
    textAlign: "center",
    borderRadius: "4px",
    fontFamily: monoFont,
    fontWeight: 600,
    fontSize: "16px",
    background: t.paperRaised,
    color: t.ink,
    border: `1px solid ${t.rule}`,
    outline: "none",
    transition: "border-color 0.1s",
    padding: 0,
    MozAppearance: "textfield",
    colorScheme: dark ? "dark" : "light",
  };

  return (
    <div>
      <span style={labelStyle}>{label}</span>
      <div style={rowStyle}>
        {values.map((v, i) => (
          <input
            key={i}
            type="number"
            min={1}
            value={v}
            onChange={(e) => updateValue(i, e.target.value)}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = t.gridTeal;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = t.rule;
            }}
            style={inputStyle}
            aria-label={`${label} for segment ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
