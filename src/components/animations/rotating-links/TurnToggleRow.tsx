import React from "react";
import { inDarkMode } from "../../../utils/darkMode";

interface TurnToggleRowProps {
  turns: string;
  onChange: (turns: string) => void;
}

function tokens() {
  const dark = inDarkMode();
  return {
    paperRaised: dark ? "#26261f" : "#faf8f3",
    ink: dark ? "#e2dfd8" : "#2a2a28",
    inkSecondary: dark ? "#a8a49c" : "#5c5a54",
    inkTertiary: dark ? "#706d66" : "#8a8780",
    gridTeal: dark ? "hsl(165, 45%, 48%)" : "hsl(165, 45%, 38%)",
    rule: dark ? "rgba(200, 195, 185, 0.10)" : "rgba(90, 85, 75, 0.12)",
  };
}

export default function TurnToggleRow({ turns, onChange }: Readonly<TurnToggleRowProps>) {
  const t = tokens();
  const chars = turns.split("");

  const toggle = (i: number) => {
    const updated = [...chars];
    updated[i] = updated[i] === "L" ? "R" : "L";
    onChange(updated.join(""));
  };

  const remove = (i: number) => {
    if (chars.length <= 1) return;
    const updated = [...chars];
    updated.splice(i, 1);
    onChange(updated.join(""));
  };

  const add = () => {
    onChange(turns + "L");
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: t.inkSecondary,
    marginBottom: "6px",
    fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    alignItems: "center",
    marginBottom: "8px",
  };

  const btnBase: React.CSSProperties = {
    position: "relative",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
    fontWeight: 600,
    fontSize: "16px",
    background: t.paperRaised,
    color: t.ink,
    border: `1px solid ${t.gridTeal}`,
    boxShadow: `inset 0 0 0 0 transparent`,
    transition: "background 0.1s, border-color 0.1s",
  };

  const removeBtnStyle: React.CSSProperties = {
    position: "absolute",
    top: "1px",
    right: "2px",
    fontSize: "10px",
    lineHeight: 1,
    color: t.inkTertiary,
    cursor: "pointer",
    background: "none",
    border: "none",
    padding: 0,
    opacity: 0,
    transition: "opacity 0.15s",
    fontFamily: "inherit",
  };

  const addBtnStyle: React.CSSProperties = {
    ...btnBase,
    border: `1px dashed ${t.rule}`,
    color: t.inkTertiary,
    fontSize: "20px",
    fontWeight: 400,
  };

  return (
    <div>
      <span style={labelStyle}>turns</span>
      <div style={rowStyle}>
        {chars.map((ch, i) => (
          <div
            key={i}
            style={{
              ...btnBase,
              background: `${t.gridTeal}1a`,
            }}
            onClick={() => toggle(i)}
            onMouseEnter={(e) => {
              const rm = e.currentTarget.querySelector("[data-remove]") as HTMLElement;
              if (rm) rm.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              const rm = e.currentTarget.querySelector("[data-remove]") as HTMLElement;
              if (rm) rm.style.opacity = "0";
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                toggle(i);
              }
            }}
            aria-label={`Segment ${i + 1}: ${ch}. Click to toggle.`}
          >
            {ch}
            {chars.length > 1 && (
              <span
                data-remove
                style={removeBtnStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(i);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    e.preventDefault();
                    remove(i);
                  }
                }}
                aria-label={`Remove segment ${i + 1}`}
              >
                ×
              </span>
            )}
          </div>
        ))}
        <div
          style={addBtnStyle}
          onClick={add}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              add();
            }
          }}
          aria-label="Add segment"
        >
          +
        </div>
      </div>
    </div>
  );
}
