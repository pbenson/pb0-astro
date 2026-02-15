import React, { useState, useRef, useCallback } from "react";
import { useIsDark, tokens, monoFont } from "./designTokens";

interface ChipRowProps {
  order: number[];
  onChange: (order: number[]) => void;
}

const CHIP_SIZE = 36;
const GAP = 6;
const CHIP_STEP = CHIP_SIZE + GAP; // 42px per chip slot

export default function ChipRow({ order, onChange }: Readonly<ChipRowProps>) {
  const dark = useIsDark();
  const t = tokens(dark);

  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartX = useRef(0);
  const dragMoved = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Drag to reorder ---
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragStartX.current = e.clientX;
      dragMoved.current = false;
      setDragging(index);
      setDragOffset(0);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging === null) return;
      const dx = e.clientX - dragStartX.current;
      if (Math.abs(dx) > 4) dragMoved.current = true;
      setDragOffset(dx);
    },
    [dragging],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragging === null) return;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

      if (dragMoved.current) {
        // Compute new index from drag offset
        const shift = Math.round(dragOffset / CHIP_STEP);
        if (shift !== 0) {
          const newIndex = Math.max(0, Math.min(order.length - 1, dragging + shift));
          if (newIndex !== dragging) {
            const next = [...order];
            const [moved] = next.splice(dragging, 1);
            next.splice(newIndex, 0, moved);
            onChange(next);
          }
        }
        setSelected(null);
      } else {
        // Click-to-swap
        if (selected === null) {
          setSelected(dragging);
        } else if (selected === dragging) {
          setSelected(null);
        } else {
          const next = [...order];
          [next[selected], next[dragging]] = [next[dragging], next[selected]];
          onChange(next);
          setSelected(null);
        }
      }

      setDragging(null);
      setDragOffset(0);
    },
    [dragging, dragOffset, order, onChange, selected],
  );

  // --- Keyboard ---
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        const next = [...order];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        onChange(next);
        // Move focus to the chip's new position
        requestAnimationFrame(() => {
          const chips = containerRef.current?.querySelectorAll<HTMLElement>("[data-chip]");
          chips?.[index - 1]?.focus();
        });
      } else if (e.key === "ArrowRight" && index < order.length - 1) {
        e.preventDefault();
        const next = [...order];
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
        onChange(next);
        requestAnimationFrame(() => {
          const chips = containerRef.current?.querySelectorAll<HTMLElement>("[data-chip]");
          chips?.[index + 1]?.focus();
        });
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (selected === null) {
          setSelected(index);
        } else if (selected === index) {
          setSelected(null);
        } else {
          const next = [...order];
          [next[selected], next[index]] = [next[index], next[selected]];
          onChange(next);
          setSelected(null);
        }
      }
    },
    [order, onChange, selected],
  );

  // --- +/- handlers ---
  const canRemove = order.length > 2;
  const canAdd = order.length < 8;

  const handleRemove = useCallback(() => {
    if (!canRemove) return;
    const max = order.length;
    const next = order.filter((v) => v !== max);
    onChange(next);
    setSelected(null);
  }, [order, onChange, canRemove]);

  const handleAdd = useCallback(() => {
    if (!canAdd) return;
    onChange([...order, order.length + 1]);
    setSelected(null);
  }, [order, onChange, canAdd]);

  // --- Styles ---
  const chipBase: React.CSSProperties = {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: 6,
    fontFamily: monoFont,
    fontWeight: 700,
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "grab",
    userSelect: "none",
    touchAction: "none",
    transition: "transform 150ms ease, background 100ms, border-color 100ms",
    position: "relative",
  };

  const pmBtn: React.CSSProperties = {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: 6,
    fontFamily: monoFont,
    fontWeight: 700,
    fontSize: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    userSelect: "none",
    background: "transparent",
    color: t.gridTeal,
    border: `1px solid ${t.gridTeal}`,
  };

  return (
    <div
      ref={containerRef}
      style={{ display: "flex", alignItems: "center", gap: GAP }}
    >
      {/* Minus button */}
      <button
        type="button"
        style={{ ...pmBtn, opacity: canRemove ? 1 : 0.4, cursor: canRemove ? "pointer" : "default" }}
        onClick={handleRemove}
        disabled={!canRemove}
        aria-label="Remove a card"
      >
        −
      </button>

      {/* Chips */}
      {order.map((value, index) => {
        const isSelected = selected === index;
        const isDragging = dragging === index;

        const style: React.CSSProperties = {
          ...chipBase,
          background: isSelected ? t.gridTealBg : t.paperRaised,
          color: t.ink,
          border: `1px solid ${isSelected ? t.gridTeal : t.rule}`,
          zIndex: isDragging ? 10 : 1,
          transform: isDragging ? `translateX(${dragOffset}px)` : undefined,
          transition: isDragging ? "none" : chipBase.transition,
        };

        return (
          <div
            key={`chip-${index}`}
            data-chip
            tabIndex={0}
            role="button"
            aria-label={`Card ${value}, position ${index + 1}`}
            style={style}
            onPointerDown={(e) => handlePointerDown(e, index)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {value}
          </div>
        );
      })}

      {/* Plus button */}
      <button
        type="button"
        style={{ ...pmBtn, opacity: canAdd ? 1 : 0.4, cursor: canAdd ? "pointer" : "default" }}
        onClick={handleAdd}
        disabled={!canAdd}
        aria-label="Add a card"
      >
        +
      </button>
    </div>
  );
}
