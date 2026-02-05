import React, { useState, useCallback, useMemo, useEffect } from 'react';

// ============ Types ============
interface Point { x: number; y: number; }

interface PolygonShape {
  id: string;
  name: string;
  turnSequence: number[];
  baseVertices: Point[];
  segmentCount: number;
  segmentMidpoints: Point[];
  segmentDirections: number[];
  segmentNormals: number[];
  segmentTypes: ('A' | 'B')[];
  previewRotation: number;
}

interface Tile {
  id: number;
  cx: number;
  cy: number;
  rotation: number;
}

interface AttachmentOption {
  fromSegment: number;
  toSegment: number;
  rotation: number;
  position: Point;
}

interface EdgeControlPoints {
  cp1: Point;
  cp2: Point;
}

// ============ Constants ============
const DEG_60 = Math.PI / 3;
const DEFAULT_CONTROL_POINTS: EdgeControlPoints = {
  cp1: { x: 1/3, y: 0 },
  cp2: { x: 2/3, y: 0 },
};

// ============ Geometry Functions ============
function centerVertices(vertices: Point[]): Point[] {
  const cx = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
  const cy = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
  return vertices.map(v => ({ x: v.x - cx, y: v.y - cy }));
}

function computeVerticesFromTurns(turnSequence: number[]): Point[] {
  let direction = 0;
  let position = { x: 0, y: 0 };
  const vertices: Point[] = [{ ...position }];

  for (const turn of turnSequence) {
    direction = direction - turn * DEG_60;
    position = {
      x: position.x + Math.cos(direction),
      y: position.y + Math.sin(direction),
    };
    vertices.push({ ...position });
  }
  vertices.pop();
  return centerVertices(vertices);
}

function computeSegmentData(vertices: Point[]) {
  const midpoints: Point[] = [];
  const directions: number[] = [];
  const normals: number[] = [];
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % n];
    midpoints.push({ x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 });
    const dirRad = Math.atan2(v2.y - v1.y, v2.x - v1.x);
    const dirDeg = (dirRad * 180) / Math.PI;
    directions.push(dirDeg);
    normals.push(dirDeg + 90);
  }
  return { midpoints, directions, normals };
}

function createPolygonShape(id: string, name: string, turnSequence: number[], previewRotation: number = 0): PolygonShape {
  const baseVertices = computeVerticesFromTurns(turnSequence);
  const segmentCount = baseVertices.length;
  const { midpoints, directions, normals } = computeSegmentData(baseVertices);
  const segmentTypes: ('A' | 'B')[] = [];
  for (let i = 0; i < segmentCount; i++) {
    segmentTypes.push(i % 2 === 0 ? 'A' : 'B');
  }
  return { id, name, turnSequence, baseVertices, segmentCount, segmentMidpoints: midpoints, segmentDirections: directions, segmentNormals: normals, segmentTypes, previewRotation };
}

function rotatePoint(p: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  return { x: p.x * Math.cos(rad) - p.y * Math.sin(rad), y: p.x * Math.sin(rad) + p.y * Math.cos(rad) };
}

function getTileVertices(shape: PolygonShape, tile: Tile, scale: number): Point[] {
  return shape.baseVertices.map(v => {
    const rotated = rotatePoint(v, tile.rotation);
    return { x: tile.cx + rotated.x * scale, y: tile.cy + rotated.y * scale };
  });
}

function getSegmentMidpoints(shape: PolygonShape, tile: Tile, scale: number): Point[] {
  return shape.segmentMidpoints.map(p => {
    const rotated = rotatePoint(p, tile.rotation);
    return { x: tile.cx + rotated.x * scale, y: tile.cy + rotated.y * scale };
  });
}

function getSegmentEndpoints(shape: PolygonShape, tile: Tile, scale: number): { start: Point; end: Point }[] {
  const vertices = getTileVertices(shape, tile, scale);
  const n = vertices.length;
  return vertices.map((v, i) => ({ start: v, end: vertices[(i + 1) % n] }));
}

function getTilePath(shape: PolygonShape, tile: Tile, scale: number): string {
  const vertices = getTileVertices(shape, tile, scale);
  return vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x.toFixed(2)} ${v.y.toFixed(2)}`).join(' ') + ' Z';
}

function transformControlPoint(cp: Point, start: Point, end: Point, flipped: boolean): Point {
  const dx = end.x - start.x, dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return start;
  const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
  let localX = cp.x, localY = cp.y;
  if (flipped) { localX = 1 - cp.x; localY = -cp.y; }
  return { x: start.x + localX * dx + localY * nx * len, y: start.y + localX * dy + localY * ny * len };
}

function getTilePathWithCurves(shape: PolygonShape, tile: Tile, controlPoints: EdgeControlPoints, scale: number): string {
  const segments = getSegmentEndpoints(shape, tile, scale);
  let pathD = `M ${segments[0].start.x.toFixed(2)} ${segments[0].start.y.toFixed(2)}`;
  for (let i = 0; i < segments.length; i++) {
    const { start, end } = segments[i];
    const isTypeB = shape.segmentTypes[i] === 'B';
    const firstCp = isTypeB ? controlPoints.cp2 : controlPoints.cp1;
    const secondCp = isTypeB ? controlPoints.cp1 : controlPoints.cp2;
    const worldCp1 = transformControlPoint(firstCp, start, end, isTypeB);
    const worldCp2 = transformControlPoint(secondCp, start, end, isTypeB);
    pathD += ` C ${worldCp1.x.toFixed(2)} ${worldCp1.y.toFixed(2)}, ${worldCp2.x.toFixed(2)} ${worldCp2.y.toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }
  return pathD + ' Z';
}

function getValidAttachments(shape: PolygonShape, fromTile: Tile, fromSegment: number, scale: number): AttachmentOption[] {
  const fromType = shape.segmentTypes[fromSegment];
  const options: AttachmentOption[] = [];
  for (let toSegment = 0; toSegment < shape.segmentCount; toSegment++) {
    if (shape.segmentTypes[toSegment] !== fromType) {
      const fromDirection = shape.segmentDirections[fromSegment] + fromTile.rotation;
      let newRotation = fromDirection + 180 - shape.segmentDirections[toSegment];
      newRotation = ((newRotation % 360) + 360) % 360;
      const fromMidpoints = getSegmentMidpoints(shape, fromTile, scale);
      const attachPoint = fromMidpoints[fromSegment];
      const toMidpointBase = shape.segmentMidpoints[toSegment];
      const toMidpointRotated = rotatePoint(toMidpointBase, newRotation);
      const position = { x: attachPoint.x - toMidpointRotated.x * scale, y: attachPoint.y - toMidpointRotated.y * scale };
      options.push({ fromSegment, toSegment, rotation: newRotation, position });
    }
  }
  return options;
}

function pointInPolygon(point: Point, vertices: Point[]): boolean {
  const n = vertices.length;
  let sign = 0;
  for (let i = 0; i < n; i++) {
    const v1 = vertices[i], v2 = vertices[(i + 1) % n];
    const cross = (v2.x - v1.x) * (point.y - v1.y) - (v2.y - v1.y) * (point.x - v1.x);
    if (cross !== 0) {
      const currentSign = cross > 0 ? 1 : -1;
      if (sign === 0) sign = currentSign;
      else if (sign !== currentSign) return false;
    }
  }
  return true;
}

function segmentsIntersect(p1: Point, p2: Point, p3: Point, p4: Point): boolean {
  const d = (p1: Point, p2: Point, p3: Point) => (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  return false;
}

function polygonsOverlap(verts1: Point[], verts2: Point[], tolerance: number = 2): boolean {
  const shrink = (vertices: Point[], amount: number): Point[] => {
    const cx = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
    const cy = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
    return vertices.map(v => ({
      x: v.x + (cx - v.x) * amount / Math.sqrt((v.x - cx) ** 2 + (v.y - cy) ** 2 + 1),
      y: v.y + (cy - v.y) * amount / Math.sqrt((v.x - cx) ** 2 + (v.y - cy) ** 2 + 1),
    }));
  };
  const v1 = shrink(verts1, tolerance), v2 = shrink(verts2, tolerance);
  for (const v of v1) if (pointInPolygon(v, v2)) return true;
  for (const v of v2) if (pointInPolygon(v, v1)) return true;
  for (let i = 0; i < v1.length; i++) {
    for (let j = 0; j < v2.length; j++) {
      if (segmentsIntersect(v1[i], v1[(i + 1) % v1.length], v2[j], v2[(j + 1) % v2.length])) return true;
    }
  }
  return false;
}

function tilesOverlap(shape: PolygonShape, t1: Tile, t2: Tile, scale: number): boolean {
  const dx = Math.abs(t1.cx - t2.cx), dy = Math.abs(t1.cy - t2.cy);
  if (dx > scale * 3 || dy > scale * 3) return false;
  return polygonsOverlap(getTileVertices(shape, t1, scale), getTileVertices(shape, t2, scale));
}

function getTileColor(tileId: number): string {
  const hue = 150 + (tileId * 17) % 40;
  const sat = 50 + (tileId * 7) % 30;
  const light = 35 + (tileId * 11) % 25;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

// ============ Shape Definitions ============
const SHAPES: PolygonShape[] = [
  createPolygonShape('parallelogram', 'Parallelogram', [0, 0, 1, 2, 0, 1], 0),
  createPolygonShape('chevron', 'Chevron', [0, 1, 1, 1, 2, -1], 90),
  createPolygonShape('stealth', 'Stealth', [0, 0, 1, 0, 2, 1, -1, 1], -150),
  createPolygonShape('elongated', 'Elongated', [0, 0, 0, 2, 0, 2, -1, 1], 0),
];

// ============ Styles ============
const styles = {
  selectionContainer: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '1.5rem', padding: '2rem' },
  shapeGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' },
  shapeCard: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '0.75rem', border: '2px solid #444', borderRadius: '12px', cursor: 'pointer', background: '#2a2a2a', transition: 'all 0.2s' },
  panelContainer: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '1rem', padding: '1rem' },
  svgContainer: { border: '1px solid #444', borderRadius: '8px' },
  controls: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const, justifyContent: 'center' },
  button: { padding: '0.5rem 1rem', border: '1px solid #555', borderRadius: '4px', background: '#333', color: '#fff', cursor: 'pointer', fontSize: '0.9rem' },
  accentButton: { padding: '0.5rem 1rem', border: '2px solid hsl(165, 50%, 40%)', borderRadius: '4px', background: 'hsl(165, 50%, 45%)', color: '#fff', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 },
  legend: { display: 'flex', gap: '1rem', fontSize: '0.8rem', alignItems: 'center' },
  info: { fontSize: '0.85rem', color: '#888' },
};

// ============ Shape Design Panel ============
function ShapeDesignPanel({ shape, controlPoints, onControlPointsChange, onClose }: {
  shape: PolygonShape;
  controlPoints: EdgeControlPoints;
  onControlPointsChange: (cp: EdgeControlPoints) => void;
  onClose: () => void;
}) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'cp1' | 'cp2' | null>(null);

  const PANEL_WIDTH = 300;
  const PANEL_HEIGHT = 250;
  const DESIGN_SCALE = 50;

  const designTile: Tile = { id: -1, cx: PANEL_WIDTH / 2, cy: PANEL_HEIGHT / 2, rotation: 0 };
  const segments = getSegmentEndpoints(shape, designTile, DESIGN_SCALE);
  const designSegmentIndex = shape.segmentTypes.findIndex(t => t === 'A');
  const designSegment = segments[designSegmentIndex >= 0 ? designSegmentIndex : 0];

  const getMousePos = useCallback((e: MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const inverseTransformControlPoint = (world: Point, start: Point, end: Point): Point => {
    const dx = end.x - start.x, dy = end.y - start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: 0, y: 0 };
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const wx = world.x - start.x, wy = world.y - start.y;
    return { x: (wx * ux + wy * uy) / len, y: (wx * nx + wy * ny) / len };
  };

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const pos = getMousePos(e);
      const localPos = inverseTransformControlPoint(pos, designSegment.start, designSegment.end);
      const clampedX = Math.max(0.1, Math.min(0.9, localPos.x));
      const clampedY = Math.max(-0.5, Math.min(0.5, localPos.y));
      if (dragging === 'cp1') {
        onControlPointsChange({ ...controlPoints, cp1: { x: clampedX, y: clampedY } });
      } else {
        onControlPointsChange({ ...controlPoints, cp2: { x: clampedX, y: clampedY } });
      }
    };
    const handleMouseUp = () => setDragging(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [dragging, getMousePos, designSegment, controlPoints, onControlPointsChange]);

  const worldCp1 = transformControlPoint(controlPoints.cp1, designSegment.start, designSegment.end, false);
  const worldCp2 = transformControlPoint(controlPoints.cp2, designSegment.start, designSegment.end, false);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10001, background: '#1a1a1a', borderRadius: '12px', padding: '1rem', border: '1px solid #444' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 600 }}>Edit Shape</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
        </div>
        <svg ref={svgRef} width={PANEL_WIDTH} height={PANEL_HEIGHT} style={{ background: '#222', borderRadius: '8px' }}>
          <path d={getTilePathWithCurves(shape, designTile, controlPoints, DESIGN_SCALE)} fill="hsl(165, 50%, 45%)" stroke="#2d5a4a" strokeWidth={1.5} />
          <line x1={designSegment.start.x} y1={designSegment.start.y} x2={designSegment.end.x} y2={designSegment.end.y} stroke="rgba(255, 200, 100, 0.5)" strokeWidth={8} strokeLinecap="round" />
          <line x1={designSegment.start.x} y1={designSegment.start.y} x2={worldCp1.x} y2={worldCp1.y} stroke="rgba(255, 100, 100, 0.6)" strokeWidth={1} strokeDasharray="3 2" />
          <line x1={designSegment.end.x} y1={designSegment.end.y} x2={worldCp2.x} y2={worldCp2.y} stroke="rgba(100, 100, 255, 0.6)" strokeWidth={1} strokeDasharray="3 2" />
          <circle cx={worldCp1.x} cy={worldCp1.y} r={10} fill={dragging === 'cp1' ? 'rgba(255, 100, 100, 1)' : 'rgba(255, 100, 100, 0.8)'} stroke="white" strokeWidth={2} style={{ cursor: 'grab' }} onMouseDown={(e) => { e.preventDefault(); setDragging('cp1'); }} />
          <circle cx={worldCp2.x} cy={worldCp2.y} r={10} fill={dragging === 'cp2' ? 'rgba(100, 100, 255, 1)' : 'rgba(100, 100, 255, 0.8)'} stroke="white" strokeWidth={2} style={{ cursor: 'grab' }} onMouseDown={(e) => { e.preventDefault(); setDragging('cp2'); }} />
          {segments.map((seg, i) => {
            const midX = (seg.start.x + seg.end.x) / 2, midY = (seg.start.y + seg.end.y) / 2;
            return <text key={i} x={midX} y={midY} fill={shape.segmentTypes[i] === 'A' ? 'rgba(255, 200, 100, 0.9)' : 'rgba(100, 200, 255, 0.9)'} fontSize={10} textAnchor="middle" dominantBaseline="middle" style={{ pointerEvents: 'none' }}>{shape.segmentTypes[i]}</text>;
          })}
        </svg>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'center' }}>
          <button onClick={() => onControlPointsChange(DEFAULT_CONTROL_POINTS)} style={styles.button}>Reset</button>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#888', textAlign: 'center', margin: '0.5rem 0 0' }}>Drag the red/blue handles to curve edges</p>
      </div>
    </>
  );
}

// ============ Main Component ============
export default function Nessie2Puzzle({ width = 800, height = 600, initialScale = 50 }: { width?: number; height?: number; initialScale?: number }) {
  const [selectedShape, setSelectedShape] = useState<PolygonShape | null>(null);
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [scale] = useState(initialScale);
  const [nextId, setNextId] = useState(1);
  const [selectedSegment, setSelectedSegment] = useState<{ tileId: number; segmentIndex: number } | null>(null);
  const [showSegmentTypes, setShowSegmentTypes] = useState(true);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [controlPoints, setControlPoints] = useState<EdgeControlPoints>(DEFAULT_CONTROL_POINTS);
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);

  const handleSelectShape = useCallback((shape: PolygonShape) => {
    setSelectedShape(shape);
    setTiles([{ id: 0, cx: width / 2, cy: height / 2, rotation: 0 }]);
    setNextId(1);
    setSelectedSegment(null);
    setControlPoints(DEFAULT_CONTROL_POINTS);
    setViewOffset({ x: 0, y: 0 });
  }, [width, height]);

  const attachmentOptions = useMemo(() => {
    if (!selectedSegment || !selectedShape) return [];
    const tile = tiles.find(t => t.id === selectedSegment.tileId);
    if (!tile) return [];
    return getValidAttachments(selectedShape, tile, selectedSegment.segmentIndex, scale)
      .filter(opt => !tiles.some(t => tilesOverlap(selectedShape, t, { id: -1, cx: opt.position.x, cy: opt.position.y, rotation: opt.rotation }, scale)));
  }, [selectedSegment, selectedShape, tiles, scale]);

  const handleAttach = useCallback((option: AttachmentOption) => {
    if (!selectedShape) return;
    const newTile: Tile = { id: nextId, cx: option.position.x, cy: option.position.y, rotation: option.rotation };
    if (tiles.some(t => tilesOverlap(selectedShape, t, newTile, scale))) return;
    setTiles(prev => [...prev, newTile]);
    setNextId(prev => prev + 1);
    setSelectedSegment(null);
    setSelectedOptionIndex(0);
  }, [selectedShape, nextId, tiles, scale]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedSegment || attachmentOptions.length === 0) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setSelectedOptionIndex(prev => (prev - 1 + attachmentOptions.length) % attachmentOptions.length); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setSelectedOptionIndex(prev => (prev + 1) % attachmentOptions.length); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (attachmentOptions[selectedOptionIndex]) handleAttach(attachmentOptions[selectedOptionIndex]); }
      else if (e.key === 'Escape') { setSelectedSegment(null); setSelectedOptionIndex(0); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSegment, attachmentOptions, selectedOptionIndex, handleAttach]);

  const hasCurves = controlPoints.cp1.y !== 0 || controlPoints.cp2.y !== 0;
  const getTilePathForRender = useCallback((tile: Tile) => {
    if (!selectedShape) return '';
    return hasCurves ? getTilePathWithCurves(selectedShape, tile, controlPoints, scale) : getTilePath(selectedShape, tile, scale);
  }, [selectedShape, hasCurves, controlPoints, scale]);

  // Shape selection screen
  if (!selectedShape) {
    return (
      <div style={styles.selectionContainer}>
        <h2 style={{ margin: 0 }}>Choose a Shape</h2>
        <p style={{ color: '#888', margin: 0 }}>Select a polygon to start the tiling puzzle</p>
        <div style={styles.shapeGrid}>
          {SHAPES.map(shape => (
            <div key={shape.id} onClick={() => handleSelectShape(shape)} style={styles.shapeCard}>
              <svg width={140} height={70}>
                <path d={getTilePath(shape, { id: 0, cx: 70, cy: 35, rotation: shape.previewRotation }, 25)} fill="hsl(165, 50%, 45%)" stroke="#2d5a4a" strokeWidth={1.5} />
              </svg>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{shape.name}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Puzzle screen
  return (
    <div style={styles.panelContainer}>
      <svg
        width={width}
        height={height}
        style={styles.svgContainer}
        onMouseDown={(e) => { if (e.button === 0 && e.target === e.currentTarget) { setIsDragging(true); setDragStart({ x: e.clientX - viewOffset.x, y: e.clientY - viewOffset.y }); } }}
        onMouseMove={(e) => { if (isDragging) setViewOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <g transform={`translate(${viewOffset.x}, ${viewOffset.y})`}>
          {tiles.map(tile => (
            <g key={tile.id}>
              <path d={getTilePathForRender(tile)} fill={getTileColor(tile.id)} stroke="#2d5a4a" strokeWidth={1.5} />
              {getSegmentEndpoints(selectedShape, tile, scale).map((seg, i) => (
                <line
                  key={`hit-${tile.id}-${i}`}
                  x1={seg.start.x} y1={seg.start.y} x2={seg.end.x} y2={seg.end.y}
                  stroke={selectedSegment?.tileId === tile.id && selectedSegment?.segmentIndex === i ? 'rgba(255, 255, 0, 0.6)' : 'transparent'}
                  strokeWidth={12}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); setSelectedSegment(selectedSegment?.tileId === tile.id && selectedSegment?.segmentIndex === i ? null : { tileId: tile.id, segmentIndex: i }); setSelectedOptionIndex(0); }}
                />
              ))}
              {showSegmentTypes && getSegmentMidpoints(selectedShape, tile, scale).map((p, i) => (
                <circle key={`marker-${tile.id}-${i}`} cx={p.x} cy={p.y} r={4} fill={selectedShape.segmentTypes[i] === 'A' ? 'rgba(255, 200, 100, 0.8)' : 'rgba(100, 200, 255, 0.8)'} />
              ))}
            </g>
          ))}
          {selectedSegment && attachmentOptions.length > 0 && (() => {
            const opt = attachmentOptions[selectedOptionIndex % attachmentOptions.length];
            return opt ? <path d={getTilePathForRender({ id: -1, cx: opt.position.x, cy: opt.position.y, rotation: opt.rotation })} fill="rgba(100, 255, 150, 0.3)" stroke="rgba(100, 255, 150, 0.8)" strokeWidth={2} strokeDasharray="5 3" onClick={(e) => { e.stopPropagation(); handleAttach(opt); }} style={{ cursor: 'pointer' }} /> : null;
          })()}
        </g>
      </svg>

      <div style={styles.controls}>
        <button style={styles.button} onClick={() => { setSelectedShape(null); setTiles([]); }}>← Shapes</button>
        <button style={styles.button} onClick={() => { if (tiles.length > 1) { setTiles(prev => prev.slice(0, -1)); setSelectedSegment(null); } }} disabled={tiles.length <= 1}>Undo</button>
        <button style={styles.button} onClick={() => { setTiles([{ id: 0, cx: width / 2, cy: height / 2, rotation: 0 }]); setNextId(1); setSelectedSegment(null); setViewOffset({ x: 0, y: 0 }); }}>Reset</button>
        <button style={styles.button} onClick={() => setShowSegmentTypes(!showSegmentTypes)}>{showSegmentTypes ? 'Hide' : 'Show'} A/B</button>
        <button style={styles.accentButton} onClick={() => setIsDesignModalOpen(true)}>Edit Shape</button>
      </div>

      {isDesignModalOpen && selectedShape && (
        <ShapeDesignPanel
          shape={selectedShape}
          controlPoints={controlPoints}
          onControlPointsChange={setControlPoints}
          onClose={() => setIsDesignModalOpen(false)}
        />
      )}

      <div style={styles.legend}>
        <span style={{ fontWeight: 500, color: '#888' }}>{selectedShape.name}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(255, 200, 100, 0.8)' }} />A</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: 'rgba(100, 200, 255, 0.8)' }} />B</span>
      </div>

      <div style={styles.info}>
        {tiles.length} tile{tiles.length !== 1 ? 's' : ''} placed
        {selectedSegment && attachmentOptions.length > 0 && <> • Option {(selectedOptionIndex % attachmentOptions.length) + 1}/{attachmentOptions.length} • ←/→ cycle • Enter place</>}
        {selectedSegment && attachmentOptions.length === 0 && ' • No valid placements'}
        {!selectedSegment && ' • Click an edge to attach'}
      </div>
    </div>
  );
}
