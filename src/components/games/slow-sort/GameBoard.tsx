import React, { useRef, useState, useCallback, useEffect } from "react";
import PlayingCard, { CARD_WIDTH, CARD_HEIGHT } from "./PlayingCard";
import { useIsDark, tokens, monoFont } from "./designTokens";

const ELEMENT_SEPARATION = CARD_WIDTH + 8; // 80px between card centers
const ANIMATION_DURATION = 500; // ms

interface CardState {
  label: number;  // card value (= its home position)
  position: number; // current slot (1-based)
}

interface AnimState {
  startTime: number;
  goingHomeLabel: number;
  moves: { label: number; fromPos: number; toPos: number }[];
}

interface GameState {
  elements: CardState[];
  moveCount: number;
}

function xForPos(pos: number): number {
  return pos * ELEMENT_SEPARATION - 0.3 * ELEMENT_SEPARATION;
}

const BASELINE_Y = CARD_WIDTH * 2.5; // 180

function arcY(fracComplete: number): number {
  const power = 2;
  const maxH = Math.pow(0.5, power); // 0.25
  return (
    BASELINE_Y -
    (((maxH - Math.pow(Math.abs(fracComplete - 0.5), power)) * CARD_WIDTH) / maxH) * 1.5
  );
}

function parseConfiguration(config: string): number[] | null {
  const nums = config.trim().split(/\D+/).filter(Boolean).map(Number);
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i] !== i + 1) return null;
  }
  return nums;
}

interface GameBoardProps {
  configuration: string;
  resetTrigger: number;
}

export default function GameBoard({ configuration, resetTrigger }: Readonly<GameBoardProps>) {
  const dark = useIsDark();
  const t = tokens(dark);

  const stateRef = useRef<GameState>({ elements: [], moveCount: 0 });
  const initialRef = useRef<CardState[]>([]);
  const animRef = useRef<AnimState | null>(null);
  const rafRef = useRef(0);
  const [, rerender] = useState(0);
  const bump = () => rerender((n) => n + 1);

  // Initialize / apply new configuration
  useEffect(() => {
    const nums = parseConfiguration(configuration);
    if (!nums) return;
    const els = nums.map((label, i) => ({ label, position: i + 1 }));
    stateRef.current = { elements: els, moveCount: 0 };
    initialRef.current = els.map((el) => ({ ...el }));
    animRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    bump();
  }, [configuration]);

  // Reset to initial positions
  useEffect(() => {
    if (resetTrigger === 0) return;
    stateRef.current = {
      elements: initialRef.current.map((el) => ({ ...el })),
      moveCount: 0,
    };
    animRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    bump();
  }, [resetTrigger]);

  const animate = useCallback(() => {
    const anim = animRef.current;
    if (!anim) return;
    const progress = Math.min((performance.now() - anim.startTime) / ANIMATION_DURATION, 1);

    if (progress >= 1) {
      // Apply final positions
      stateRef.current.elements = stateRef.current.elements.map((el) => {
        const move = anim.moves.find((m) => m.label === el.label);
        return move ? { ...el, position: move.toPos } : el;
      });
      animRef.current = null;
    } else {
      rafRef.current = requestAnimationFrame(animate);
    }
    bump();
  }, []);

  const handleCardClick = useCallback(
    (clickedLabel: number) => {
      if (animRef.current) return;
      const { elements } = stateRef.current;
      const card = elements.find((el) => el.label === clickedLabel);
      if (!card || card.position === card.label) return;

      const moves: AnimState["moves"] = [];
      moves.push({ label: card.label, fromPos: card.position, toPos: card.label });

      for (const el of elements) {
        if (el.label === clickedLabel) continue;
        if (card.position > card.label) {
          // Card moves left; cards in [label, position) shift right
          if (el.position >= card.label && el.position < card.position) {
            moves.push({ label: el.label, fromPos: el.position, toPos: el.position + 1 });
          }
        } else {
          // Card moves right; cards in (position, label] shift left
          if (el.position > card.position && el.position <= card.label) {
            moves.push({ label: el.label, fromPos: el.position, toPos: el.position - 1 });
          }
        }
      }

      animRef.current = { startTime: performance.now(), goingHomeLabel: clickedLabel, moves };
      stateRef.current.moveCount++;
      rafRef.current = requestAnimationFrame(animate);
      bump();
    },
    [animate],
  );

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Compute visual positions
  const { elements, moveCount } = stateRef.current;
  const anim = animRef.current;
  const isAnimating = anim !== null;
  let progress = 0;
  if (anim) {
    progress = Math.min((performance.now() - anim.startTime) / ANIMATION_DURATION, 1);
  }

  const cardPositions = elements.map((el) => {
    if (anim) {
      const move = anim.moves.find((m) => m.label === el.label);
      if (move) {
        const fromX = xForPos(move.fromPos);
        const toX = xForPos(move.toPos);
        const x = fromX + (toX - fromX) * progress;
        const y = el.label === anim.goingHomeLabel ? arcY(progress) : BASELINE_Y;
        return { label: el.label, x, y };
      }
    }
    return { label: el.label, x: xForPos(el.position), y: BASELINE_Y };
  });

  const numCards = elements.length;
  const boardWidth = Math.max(680, xForPos(numCards) + CARD_WIDTH / 2 + 20);
  const movesText = `${moveCount} move${moveCount === 1 ? "" : "s"}`;

  /* Board background via CSS so the correct color applies before hydration,
     avoiding a dark-mode flash on refresh in light mode. */
  const boardCss = [
    `.ss-board{background:#faf8f3}`,
    `:root.dark .ss-board{background:#26261f}`,
    `.ss-moves{color:#2a2a28}`,
    `:root.dark .ss-moves{color:#e2dfd8}`,
  ].join("");

  return (
    <div
      className="ss-board"
      style={{
        position: "relative",
        width: boardWidth,
        height: 250,
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: boardCss }} />
      <div
        className="ss-moves"
        style={{
          position: "absolute",
          top: 18,
          left: 18,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontFamily: monoFont,
        }}
      >
        {movesText}
      </div>

      {cardPositions.map(({ label, x, y }) => {
        const el = elements.find((e) => e.label === label)!;
        const canClick = !isAnimating && el.position !== el.label;

        return (
          <div
            key={label}
            style={{
              position: "absolute",
              left: x - CARD_WIDTH / 2,
              top: y - CARD_HEIGHT / 2,
              cursor: canClick ? "pointer" : "default",
              zIndex: isAnimating && label === anim?.goingHomeLabel ? 10 : 1,
            }}
            onClick={() => canClick && handleCardClick(label)}
            role={canClick ? "button" : undefined}
            tabIndex={canClick ? 0 : undefined}
            onKeyDown={
              canClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleCardClick(label);
                    }
                  }
                : undefined
            }
            aria-label={
              canClick
                ? `Card ${label}, click to move to position ${label}`
                : `Card ${label}, in correct position`
            }
          >
            <PlayingCard value={label} />
          </div>
        );
      })}
    </div>
  );
}
