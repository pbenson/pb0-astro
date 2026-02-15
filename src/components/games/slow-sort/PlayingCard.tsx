import React from "react";

export const CARD_WIDTH = 72;
export const CARD_HEIGHT = 100;

// Pip layouts extracted from playingCard.ts lines 106-150
// x,y are fractions of card dimensions; rotated = bottom-half pips (displayed upside-down)
const pipLayouts: { x: number; y: number; rotated: boolean }[][] = [
  // 1 (Ace)
  [{ x: 0.5, y: 0.5, rotated: false }],
  // 2
  [
    { x: 0.5, y: 0.184, rotated: false },
    { x: 0.5, y: 0.816, rotated: true },
  ],
  // 3
  [
    { x: 0.5, y: 0.184, rotated: false },
    { x: 0.5, y: 0.5, rotated: false },
    { x: 0.5, y: 0.816, rotated: true },
  ],
  // 4
  [
    { x: 0.3, y: 0.184, rotated: false },
    { x: 0.7, y: 0.184, rotated: false },
    { x: 0.3, y: 0.816, rotated: true },
    { x: 0.7, y: 0.816, rotated: true },
  ],
  // 5
  [
    { x: 0.3, y: 0.184, rotated: false },
    { x: 0.7, y: 0.184, rotated: false },
    { x: 0.5, y: 0.5, rotated: false },
    { x: 0.3, y: 0.816, rotated: true },
    { x: 0.7, y: 0.816, rotated: true },
  ],
  // 6
  [
    { x: 0.3, y: 0.184, rotated: false },
    { x: 0.7, y: 0.184, rotated: false },
    { x: 0.3, y: 0.5, rotated: false },
    { x: 0.7, y: 0.5, rotated: false },
    { x: 0.3, y: 0.816, rotated: true },
    { x: 0.7, y: 0.816, rotated: true },
  ],
  // 7
  [
    { x: 0.3, y: 0.184, rotated: false },
    { x: 0.7, y: 0.184, rotated: false },
    { x: 0.5, y: 0.341, rotated: false },
    { x: 0.3, y: 0.5, rotated: false },
    { x: 0.7, y: 0.5, rotated: false },
    { x: 0.3, y: 0.816, rotated: true },
    { x: 0.7, y: 0.816, rotated: true },
  ],
  // 8
  [
    { x: 0.3, y: 0.184, rotated: false },
    { x: 0.7, y: 0.184, rotated: false },
    { x: 0.5, y: 0.341, rotated: false },
    { x: 0.3, y: 0.5, rotated: false },
    { x: 0.7, y: 0.5, rotated: false },
    { x: 0.5, y: 0.659, rotated: true },
    { x: 0.3, y: 0.816, rotated: true },
    { x: 0.7, y: 0.816, rotated: true },
  ],
];

function cardName(value: number): string {
  return value === 1 ? "A" : String(value);
}

interface PlayingCardProps {
  value: number; // 1-8
}

export default function PlayingCard({ value }: Readonly<PlayingCardProps>) {
  const pips = pipLayouts[value - 1] || [];
  const name = cardName(value);

  const cornerStyle: React.CSSProperties = {
    position: "absolute",
    color: "red",
    fontSize: 11,
    fontWeight: 700,
    lineHeight: 1,
    textAlign: "center",
  };

  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        background: "white",
        borderRadius: 4,
        border: "1px solid #7f7f7f",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        userSelect: "none",
      }}
    >
      {/* Top-left corner */}
      <div style={{ ...cornerStyle, top: 3, left: 4 }}>
        <div>{name}</div>
        <div style={{ fontSize: 8, lineHeight: 1 }}>♥</div>
      </div>
      {/* Bottom-right corner (rotated 180) */}
      <div
        style={{
          ...cornerStyle,
          bottom: 3,
          right: 4,
          transform: "rotate(180deg)",
        }}
      >
        <div>{name}</div>
        <div style={{ fontSize: 8, lineHeight: 1 }}>♥</div>
      </div>
      {/* Pips */}
      {pips.map((pip, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: pip.x * CARD_WIDTH,
            top: pip.y * CARD_HEIGHT,
            transform: `translate(-50%, -50%)${pip.rotated ? " rotate(180deg)" : ""}`,
            color: "red",
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ♥
        </span>
      ))}
    </div>
  );
}
