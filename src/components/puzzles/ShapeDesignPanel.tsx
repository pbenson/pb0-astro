import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from './NessiesPuzzle.module.css';
import type { Point, Tile, EdgeControlPoints } from './nessiesLogic';
import {
  DEFAULT_CONTROL_POINTS,
  getTilePathWithCurves,
  getSegmentEndpoints,
  transformControlPoint,
  inverseTransformControlPoint,
  SEGMENT_TYPES,
} from './nessiesLogic';

interface Props {
  controlPoints: EdgeControlPoints;
  onControlPointsChange: (cp: EdgeControlPoints) => void;
}

const DESIGN_SCALE = 80;
const PANEL_WIDTH = 300;
const PANEL_HEIGHT = 250;

export default function ShapeDesignPanel({ controlPoints, onControlPointsChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'cp1' | 'cp2' | null>(null);

  // Reference tile for the design panel (centered, no rotation)
  const designTile: Tile = {
    id: -1,
    cx: PANEL_WIDTH / 2,
    cy: PANEL_HEIGHT / 2,
    rotation: 0,
  };

  // Get segment 2 (right short edge, type A) for showing control points
  const segments = getSegmentEndpoints(designTile, DESIGN_SCALE);
  const designSegment = segments[2]; // Right short edge (type A)

  // Convert mouse position to SVG coordinates
  const getMousePos = useCallback((e: MouseEvent): Point => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Handle mouse down on control point
  const handleMouseDown = useCallback((e: React.MouseEvent, which: 'cp1' | 'cp2') => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(which);
  }, []);

  // Handle mouse move
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const pos = getMousePos(e);
      // Convert world position back to canonical edge coordinates
      const localPos = inverseTransformControlPoint(
        pos,
        designSegment.start,
        designSegment.end,
        false // type A, not flipped
      );

      // Clamp x to [0.1, 0.9] to keep control points within edge
      const clampedX = Math.max(0.1, Math.min(0.9, localPos.x));
      // Clamp y to reasonable range
      const clampedY = Math.max(-0.5, Math.min(0.5, localPos.y));

      if (dragging === 'cp1') {
        onControlPointsChange({
          ...controlPoints,
          cp1: { x: clampedX, y: clampedY },
        });
      } else {
        onControlPointsChange({
          ...controlPoints,
          cp2: { x: clampedX, y: clampedY },
        });
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, getMousePos, designSegment, controlPoints, onControlPointsChange]);

  // Get world positions of control points for display
  const worldCp1 = transformControlPoint(controlPoints.cp1, designSegment.start, designSegment.end, false);
  const worldCp2 = transformControlPoint(controlPoints.cp2, designSegment.start, designSegment.end, false);

  // Reset to default
  const handleReset = () => {
    onControlPointsChange(DEFAULT_CONTROL_POINTS);
  };

  return (
    <div className={styles.designPanel}>
      <div className={styles.designHeader}>Shape Design</div>
      <svg
        ref={svgRef}
        width={PANEL_WIDTH}
        height={PANEL_HEIGHT}
        className={styles.designSvg}
      >
        {/* Tile shape with curves */}
        <path
          d={getTilePathWithCurves(designTile, controlPoints, DESIGN_SCALE)}
          fill="hsl(165, 50%, 45%)"
          stroke="#2d5a4a"
          strokeWidth={1.5}
        />

        {/* Highlight the design segment (segment 2, type A) */}
        <line
          x1={designSegment.start.x}
          y1={designSegment.start.y}
          x2={designSegment.end.x}
          y2={designSegment.end.y}
          stroke="rgba(255, 200, 100, 0.5)"
          strokeWidth={8}
          strokeLinecap="round"
        />

        {/* Control point handles */}
        <line
          x1={designSegment.start.x}
          y1={designSegment.start.y}
          x2={worldCp1.x}
          y2={worldCp1.y}
          stroke="rgba(255, 100, 100, 0.6)"
          strokeWidth={1}
          strokeDasharray="3 2"
        />
        <line
          x1={designSegment.end.x}
          y1={designSegment.end.y}
          x2={worldCp2.x}
          y2={worldCp2.y}
          stroke="rgba(100, 100, 255, 0.6)"
          strokeWidth={1}
          strokeDasharray="3 2"
        />

        {/* Draggable control points */}
        <circle
          cx={worldCp1.x}
          cy={worldCp1.y}
          r={8}
          fill={dragging === 'cp1' ? 'rgba(255, 100, 100, 1)' : 'rgba(255, 100, 100, 0.8)'}
          stroke="white"
          strokeWidth={2}
          style={{ cursor: 'grab' }}
          onMouseDown={(e) => handleMouseDown(e, 'cp1')}
        />
        <circle
          cx={worldCp2.x}
          cy={worldCp2.y}
          r={8}
          fill={dragging === 'cp2' ? 'rgba(100, 100, 255, 1)' : 'rgba(100, 100, 255, 0.8)'}
          stroke="white"
          strokeWidth={2}
          style={{ cursor: 'grab' }}
          onMouseDown={(e) => handleMouseDown(e, 'cp2')}
        />

        {/* Segment type labels */}
        {segments.map((seg, i) => {
          const midX = (seg.start.x + seg.end.x) / 2;
          const midY = (seg.start.y + seg.end.y) / 2;
          return (
            <text
              key={i}
              x={midX}
              y={midY}
              fill={SEGMENT_TYPES[i] === 'A' ? 'rgba(255, 200, 100, 0.9)' : 'rgba(100, 200, 255, 0.9)'}
              fontSize={10}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ pointerEvents: 'none' }}
            >
              {SEGMENT_TYPES[i]}
            </text>
          );
        })}
      </svg>

      <div className={styles.designControls}>
        <button className={styles.button} onClick={handleReset}>
          Reset Shape
        </button>
      </div>
      <div className={styles.designInfo}>
        Drag the red/blue handles to curve the edges
      </div>
    </div>
  );
}
