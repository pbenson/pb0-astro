import React from "react";
import { useIsDark, tokens, monoFont } from "./designTokens";

interface TurnToggleRowProps {
  turns: string;
  onChange: (turns: string) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
}

export default function TurnToggleRow({ turns, onChange, onAdd, onRemove }: Readonly<TurnToggleRowProps>) {
  const dark = useIsDark();
  const t = tokens(dark);
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
    onRemove?.(i);
  };

  const add = () => {
    onChange(turns + "L");
    onAdd?.();
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

  const btnBase: React.CSSProperties = {
    position: "relative",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    cursor: "pointer",
    fontFamily: monoFont,
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
            style={{ position: "relative" }}
            onMouseEnter={(e) => {
              const rm = e.currentTarget.querySelector("[data-remove]") as HTMLElement;
              if (rm) rm.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              const rm = e.currentTarget.querySelector("[data-remove]") as HTMLElement;
              if (rm) rm.style.opacity = "0";
            }}
          >
            <div
              style={{
                ...btnBase,
                background: t.gridTealBg,
              }}
              onClick={() => toggle(i)}
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
            </div>
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
