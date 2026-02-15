import React, { useState, useCallback, useMemo, useEffect } from 'react';
import styles from './NessiesPuzzle.module.css';
import type { Tile, AttachmentOption, EdgeControlPoints } from './nessiesLogic';
import {
  getTilePath,
  getTilePathWithCurves,
  getSegmentMidpoints,
  getTileVertices,
  getValidAttachments,
  tilesOverlap,
  getTileColor,
  SEGMENT_TYPES,
  DEFAULT_CONTROL_POINTS,
} from './nessiesLogic';
import ShapeDesignPanel from './ShapeDesignPanel';

interface Props {
  initialScale?: number;
  width?: number;
  height?: number;
}

interface SelectedSegment {
  tileId: number;
  segmentIndex: number;
}

export default function NessiesPuzzle({
  initialScale = 50,
  width = 800,
  height = 600,
}: Props) {
  const [tiles, setTiles] = useState<Tile[]>([
    { id: 0, cx: width / 2, cy: height / 2, rotation: 0 },
  ]);
  const [scale] = useState(initialScale);
  const [nextId, setNextId] = useState(1);
  const [selectedSegment, setSelectedSegment] = useState<SelectedSegment | null>(null);
  const [showSegmentTypes, setShowSegmentTypes] = useState(true);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Bezier control points for edge curves
  const [controlPoints, setControlPoints] = useState<EdgeControlPoints>(DEFAULT_CONTROL_POINTS);

  // Shape design modal state
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);

  // Get attachment options when a segment is selected (filtered to exclude overlaps)
  const attachmentOptions = useMemo(() => {
    if (!selectedSegment) return [];
    const tile = tiles.find(t => t.id === selectedSegment.tileId);
    if (!tile) return [];
    const allOptions = getValidAttachments(tile, selectedSegment.segmentIndex, scale);
    // Filter out options that would overlap with existing tiles
    return allOptions.filter(option => {
      const previewTile: Tile = {
        id: -1,
        cx: option.position.x,
        cy: option.position.y,
        rotation: option.rotation,
      };
      return !tiles.some(t => tilesOverlap(t, previewTile, scale));
    });
  }, [selectedSegment, tiles, scale]);

  // Handle segment click
  const handleSegmentClick = useCallback((tileId: number, segmentIndex: number) => {
    if (selectedSegment?.tileId === tileId && selectedSegment?.segmentIndex === segmentIndex) {
      // Deselect
      setSelectedSegment(null);
      setSelectedOptionIndex(0);
    } else {
      setSelectedSegment({ tileId, segmentIndex });
      setSelectedOptionIndex(0);
    }
  }, [selectedSegment]);

  // Handle attachment option selection
  const handleAttach = useCallback((option: AttachmentOption) => {
    // Check for overlaps with existing tiles
    const newTile: Tile = {
      id: nextId,
      cx: option.position.x,
      cy: option.position.y,
      rotation: option.rotation,
    };

    const hasOverlap = tiles.some(t => tilesOverlap(t, newTile, scale));
    if (hasOverlap) {
      return; // Don't place overlapping tiles
    }

    setTiles(prev => [...prev, newTile]);
    setNextId(prev => prev + 1);
    setSelectedSegment(null);
    setSelectedOptionIndex(0);
  }, [nextId, tiles, scale]);

  // Handle keyboard events for cycling through options
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedSegment || attachmentOptions.length === 0) return;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedOptionIndex(prev =>
          (prev - 1 + attachmentOptions.length) % attachmentOptions.length
        );
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedOptionIndex(prev =>
          (prev + 1) % attachmentOptions.length
        );
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const option = attachmentOptions[selectedOptionIndex];
        if (option) {
          handleAttach(option);
        }
      } else if (e.key === 'Escape') {
        if (isDesignModalOpen) {
          setIsDesignModalOpen(false);
        } else {
          setSelectedSegment(null);
          setSelectedOptionIndex(0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSegment, attachmentOptions, selectedOptionIndex, handleAttach, isDesignModalOpen]);

  // Reset to single tile
  const handleReset = useCallback(() => {
    setTiles([{ id: 0, cx: width / 2, cy: height / 2, rotation: 0 }]);
    setNextId(1);
    setSelectedSegment(null);
    setSelectedOptionIndex(0);
    setViewOffset({ x: 0, y: 0 });
  }, [width, height]);

  // Undo last tile
  const handleUndo = useCallback(() => {
    if (tiles.length > 1) {
      setTiles(prev => prev.slice(0, -1));
      setSelectedSegment(null);
      setSelectedOptionIndex(0);
    }
  }, [tiles.length]);

  // Pan controls
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && e.target === e.currentTarget) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y });
    }
  }, [viewOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setViewOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Check if we're using curved edges
  const hasCurves = controlPoints.cp1.y !== 0 || controlPoints.cp2.y !== 0;

  // Get tile path (curved or straight)
  const getTilePathForRender = useCallback((tile: Tile) => {
    if (hasCurves) {
      return getTilePathWithCurves(tile, controlPoints, scale);
    }
    return getTilePath(tile, scale);
  }, [hasCurves, controlPoints, scale]);

  // Render segment markers (small circles showing A/B type)
  const renderSegmentMarkers = (tile: Tile) => {
    if (!showSegmentTypes) return null;
    const midpoints = getSegmentMidpoints(tile, scale);
    return midpoints.map((p, i) => (
      <circle
        key={`marker-${tile.id}-${i}`}
        cx={p.x}
        cy={p.y}
        r={4}
        className={`${styles.segmentMarker} ${SEGMENT_TYPES[i] === 'A' ? styles.segmentA : styles.segmentB}`}
      />
    ));
  };

  // Render clickable segment areas
  const renderSegmentHitAreas = (tile: Tile) => {
    const vertices = getTileVertices(tile, scale);

    // Create line segments for hit areas
    const segments: { start: { x: number; y: number }; end: { x: number; y: number } }[] = [];

    // Segment 0: first half of top edge (vertex 0 to midpoint of 0-1)
    segments.push({ start: vertices[0], end: { x: (vertices[0].x + vertices[1].x) / 2, y: (vertices[0].y + vertices[1].y) / 2 } });
    // Segment 1: second half of top edge
    segments.push({ start: { x: (vertices[0].x + vertices[1].x) / 2, y: (vertices[0].y + vertices[1].y) / 2 }, end: vertices[1] });
    // Segment 2: right short edge (vertex 1 to 2)
    segments.push({ start: vertices[1], end: vertices[2] });
    // Segment 3: first half of bottom edge (vertex 2 to midpoint of 2-3)
    segments.push({ start: vertices[2], end: { x: (vertices[2].x + vertices[3].x) / 2, y: (vertices[2].y + vertices[3].y) / 2 } });
    // Segment 4: second half of bottom edge
    segments.push({ start: { x: (vertices[2].x + vertices[3].x) / 2, y: (vertices[2].y + vertices[3].y) / 2 }, end: vertices[3] });
    // Segment 5: left short edge (vertex 3 to 0)
    segments.push({ start: vertices[3], end: vertices[0] });

    return segments.map((seg, i) => {
      const isSelected = selectedSegment?.tileId === tile.id && selectedSegment?.segmentIndex === i;
      return (
        <line
          key={`hit-${tile.id}-${i}`}
          x1={seg.start.x}
          y1={seg.start.y}
          x2={seg.end.x}
          y2={seg.end.y}
          className={styles.segmentHitArea}
          style={isSelected ? { stroke: 'rgba(255, 255, 0, 0.6)', strokeWidth: 8 } : undefined}
          onClick={(e) => {
            e.stopPropagation();
            handleSegmentClick(tile.id, i);
          }}
        />
      );
    });
  };

  // Render the currently selected attachment option as a preview
  const renderAttachmentPreview = () => {
    if (!selectedSegment || attachmentOptions.length === 0) return null;

    // Ensure index is within bounds
    const index = selectedOptionIndex % attachmentOptions.length;
    const option = attachmentOptions[index];
    if (!option) return null;

    const previewTile: Tile = {
      id: -1,
      cx: option.position.x,
      cy: option.position.y,
      rotation: option.rotation,
    };

    return (
      <path
        d={getTilePathForRender(previewTile)}
        className={styles.attachmentPreview}
        onClick={(e) => {
          e.stopPropagation();
          handleAttach(option);
        }}
      />
    );
  };

  return (
    <div className={styles.panelContainer}>
      {/* Main puzzle panel */}
      <div className={styles.puzzlePanel}>
        <div className={styles.svgWrapper}>
          <svg
            width={width}
            height={height}
            className={styles.svgContainer}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <g transform={`translate(${viewOffset.x}, ${viewOffset.y})`}>
              {/* Render tiles */}
              {tiles.map(tile => (
                <g key={tile.id}>
                  <path
                    d={getTilePathForRender(tile)}
                    fill={getTileColor(tile.id)}
                    className={styles.tile}
                  />
                  {renderSegmentHitAreas(tile)}
                  {renderSegmentMarkers(tile)}
                </g>
              ))}

              {/* Render attachment preview */}
              {renderAttachmentPreview()}
            </g>
          </svg>

          {/* Top toolbar overlay */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <button className={styles.button} onClick={handleUndo} disabled={tiles.length <= 1}>
                Undo
              </button>
              <button className={styles.button} onClick={handleReset}>
                Reset
              </button>
              <button
                className={styles.button}
                onClick={() => setShowSegmentTypes(!showSegmentTypes)}
              >
                {showSegmentTypes ? 'Hide' : 'Show'} A/B
              </button>
              <button
                className={styles.editShapeButton}
                onClick={() => setIsDesignModalOpen(true)}
              >
                Edit Shape
              </button>
            </div>
            <div className={styles.toolbarRight}>
              <span className={styles.tileCount}>{tiles.length} tile{tiles.length !== 1 ? 's' : ''}</span>
              <div className={styles.legendInline}>
                <div className={`${styles.legendDot} ${styles.legendDotA}`} />
                <span>A</span>
                <div className={`${styles.legendDot} ${styles.legendDotB}`} />
                <span>B</span>
              </div>
            </div>
          </div>

          {/* Bottom status overlay */}
          <div className={styles.statusBar}>
            {selectedSegment && attachmentOptions.length > 0 && (
              <>Option {(selectedOptionIndex % attachmentOptions.length) + 1}/{attachmentOptions.length} &bull; &larr;/&rarr; to cycle &bull; Enter to place</>
            )}
            {selectedSegment && attachmentOptions.length === 0 && 'No valid placements'}
            {!selectedSegment && 'Click an edge segment to attach a tile'}
          </div>
        </div>
      </div>

      {/* Shape design modal overlay - works properly in Astro */}
      {isDesignModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsDesignModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setIsDesignModalOpen(false)}
              aria-label="Close"
            >
              ×
            </button>
            <ShapeDesignPanel
              controlPoints={controlPoints}
              onControlPointsChange={setControlPoints}
            />
          </div>
        </div>
      )}
    </div>
  );
}
