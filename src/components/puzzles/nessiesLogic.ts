// Nessies puzzle logic
// A parallelogram monotile with 60°/120° angles, sides 2:1 ratio
// Perimeter divided into 6 equal segments alternating A and B
// Tiles connect when A meets B

// The parallelogram vertices (before rotation/translation):
// Starting at origin, going clockwise:
// 0: (0, 0)
// 1: (2, 0)
// 2: (2.5, -√3/2)  ≈ (2.5, -0.866)
// 3: (0.5, -√3/2)  ≈ (0.5, -0.866)

const SQRT3_2 = Math.sqrt(3) / 2;

// Base tile shape (unrotated, centered at origin for easier rotation)
// Vertices in standard math orientation (y increases upward conceptually)
// but rendered in SVG where y increases downward, so we negate y
const BASE_VERTICES = [
  { x: -1, y: -SQRT3_2 / 2 },
  { x: 1, y: -SQRT3_2 / 2 },
  { x: 1.5, y: SQRT3_2 / 2 },
  { x: -0.5, y: SQRT3_2 / 2 },
];

// Segment midpoints for the 6 segments (on base tile)
// Segment 0: midpoint of first half of top edge
// Segment 1: midpoint of second half of top edge
// Segment 2: midpoint of right short edge
// Segment 3: midpoint of first half of bottom edge
// Segment 4: midpoint of second half of bottom edge
// Segment 5: midpoint of left short edge
export const BASE_SEGMENT_MIDPOINTS = [
  { x: -0.5, y: -SQRT3_2 / 2 },  // seg 0: top-left half
  { x: 0.5, y: -SQRT3_2 / 2 },   // seg 1: top-right half
  { x: 1.25, y: 0 },             // seg 2: right edge
  { x: 1, y: SQRT3_2 / 2 },      // seg 3: bottom-right half
  { x: 0, y: SQRT3_2 / 2 },      // seg 4: bottom-left half
  { x: -0.75, y: 0 },            // seg 5: left edge
];

// Segment types: A (0) or B (1), alternating
export const SEGMENT_TYPES: ('A' | 'B')[] = ['A', 'B', 'A', 'B', 'A', 'B'];

// Edge directions for each segment (in degrees)
// This is the direction along the edge (tangent), used for alignment
// For edges to connect, their directions must differ by 180°
// (Shape is in SVG coordinates where y increases downward)
export const SEGMENT_DIRECTIONS = [
  0,     // seg 0: top edge, going right
  0,     // seg 1: top edge, going right
  60,    // seg 2: right short edge, going down-right (in SVG coords)
  180,   // seg 3: bottom edge, going left
  180,   // seg 4: bottom edge, going left
  -120,  // seg 5: left short edge, going up-left (in SVG coords)
];

// Outward normal directions for each segment (in degrees)
// (perpendicular to edge direction, pointing outward from shape center)
export const SEGMENT_NORMALS = [
  -90,   // seg 0: top edge, normal points up (negative y in SVG)
  -90,   // seg 1: top edge, normal points up
  -30,   // seg 2: right edge, normal points right-up
  90,    // seg 3: bottom edge, normal points down (positive y in SVG)
  90,    // seg 4: bottom edge, normal points down
  150,   // seg 5: left edge, normal points left-down
];

export interface Point {
  x: number;
  y: number;
}

// Bezier control points for edge curves (in canonical edge space)
// Canonical space: edge goes from (0,0) to (1,0), y is perpendicular offset
export interface EdgeControlPoints {
  cp1: Point;  // First control point (near start of edge)
  cp2: Point;  // Second control point (near end of edge)
}

// Default control points (straight edge)
export const DEFAULT_CONTROL_POINTS: EdgeControlPoints = {
  cp1: { x: 1/3, y: 0 },
  cp2: { x: 2/3, y: 0 },
};

// Transform a control point from canonical edge space to world space
export function transformControlPoint(
  cp: Point,
  start: Point,
  end: Point,
  flipped: boolean
): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return start;

  const ux = dx / len;  // unit vector along edge
  const uy = dy / len;
  const nx = -uy;       // normal vector (perpendicular, to the left)
  const ny = ux;

  let localX = cp.x;
  let localY = cp.y;

  if (flipped) {
    // For B segments: rotate 180° around edge center
    // This swaps x position AND negates y
    localX = 1 - cp.x;
    localY = -cp.y;
  }

  // Transform to world coordinates
  return {
    x: start.x + localX * dx + localY * nx * len,
    y: start.y + localX * dy + localY * ny * len,
  };
}

// Inverse transform: world space to canonical edge space
export function inverseTransformControlPoint(
  world: Point,
  start: Point,
  end: Point,
  flipped: boolean
): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x: 0, y: 0 };

  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  // Vector from start to world point
  const wx = world.x - start.x;
  const wy = world.y - start.y;

  // Project onto edge basis vectors
  let localX = (wx * ux + wy * uy) / len;
  let localY = (wx * nx + wy * ny) / len;

  if (flipped) {
    // For B segments: rotate 180° around edge center
    localX = 1 - localX;
    localY = -localY;
  }

  return { x: localX, y: localY };
}

export interface Tile {
  id: number;
  cx: number;  // center x
  cy: number;  // center y
  rotation: number;  // rotation in degrees (multiples of 60)
}

export interface PlacedTile extends Tile {
  vertices: Point[];
  segmentMidpoints: Point[];
}

// Rotate a point around the origin by given degrees
function rotatePoint(p: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  };
}

// Translate a point
function translatePoint(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy };
}

// Get the vertices of a tile at given position and rotation
export function getTileVertices(tile: Tile, scale: number = 50): Point[] {
  return BASE_VERTICES.map(v => {
    const rotated = rotatePoint(v, tile.rotation);
    return translatePoint(
      { x: rotated.x * scale, y: rotated.y * scale },
      tile.cx,
      tile.cy
    );
  });
}

// Get segment midpoints for a placed tile
export function getSegmentMidpoints(tile: Tile, scale: number = 50): Point[] {
  return BASE_SEGMENT_MIDPOINTS.map(p => {
    const rotated = rotatePoint(p, tile.rotation);
    return translatePoint(
      { x: rotated.x * scale, y: rotated.y * scale },
      tile.cx,
      tile.cy
    );
  });
}

// Get the outward normal direction for a segment on a rotated tile
export function getSegmentNormal(segmentIndex: number, tileRotation: number): number {
  return SEGMENT_NORMALS[segmentIndex] + tileRotation;
}

// Calculate where a new tile's center should be when attaching
// fromTile: the existing tile
// fromSegment: segment index on existing tile (0-5)
// toSegment: segment index on new tile that will connect (0-5)
// newRotation: rotation of the new tile
export function calculateNewTilePosition(
  fromTile: Tile,
  fromSegment: number,
  toSegment: number,
  newRotation: number,
  scale: number = 50
): Point {
  // Get the midpoint of the source segment
  const fromMidpoints = getSegmentMidpoints(fromTile, scale);
  const attachPoint = fromMidpoints[fromSegment];

  // Get where the target segment midpoint would be relative to new tile center
  const toMidpointBase = BASE_SEGMENT_MIDPOINTS[toSegment];
  const toMidpointRotated = rotatePoint(toMidpointBase, newRotation);

  // New tile center = attach point - (rotated segment midpoint * scale)
  return {
    x: attachPoint.x - toMidpointRotated.x * scale,
    y: attachPoint.y - toMidpointRotated.y * scale,
  };
}

// Find valid attachment configurations for a new tile
// Returns array of { fromSegment, toSegment, rotation, position }
export interface AttachmentOption {
  fromSegment: number;
  toSegment: number;
  rotation: number;
  position: Point;
}

export function getValidAttachments(
  fromTile: Tile,
  fromSegment: number,
  scale: number = 50
): AttachmentOption[] {
  const fromType = SEGMENT_TYPES[fromSegment];
  const options: AttachmentOption[] = [];

  // Find segments of opposite type on the new tile
  for (let toSegment = 0; toSegment < 6; toSegment++) {
    if (SEGMENT_TYPES[toSegment] !== fromType) {
      // This segment can connect (A matches B)
      // The new tile needs to be rotated so the edge directions are opposite
      // (edges must be collinear, facing each other)

      // Get the edge direction of the source segment (with tile rotation applied)
      const fromDirection = SEGMENT_DIRECTIONS[fromSegment] + fromTile.rotation;

      // The target segment's edge direction (after rotation) must be opposite
      // targetDirection = fromDirection + 180
      // SEGMENT_DIRECTIONS[toSegment] + newRotation = fromDirection + 180
      // newRotation = fromDirection + 180 - SEGMENT_DIRECTIONS[toSegment]
      let newRotation = fromDirection + 180 - SEGMENT_DIRECTIONS[toSegment];
      // Normalize to 0-360
      newRotation = ((newRotation % 360) + 360) % 360;

      const position = calculateNewTilePosition(fromTile, fromSegment, toSegment, newRotation, scale);

      options.push({
        fromSegment,
        toSegment,
        rotation: newRotation,
        position,
      });
    }
  }

  return options;
}

// Check if a point is inside a convex polygon (using cross product signs)
function pointInPolygon(point: Point, vertices: Point[]): boolean {
  const n = vertices.length;
  let sign = 0;

  for (let i = 0; i < n; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % n];

    // Cross product of edge vector and point-to-vertex vector
    const cross = (v2.x - v1.x) * (point.y - v1.y) - (v2.y - v1.y) * (point.x - v1.x);

    if (cross !== 0) {
      const currentSign = cross > 0 ? 1 : -1;
      if (sign === 0) {
        sign = currentSign;
      } else if (sign !== currentSign) {
        return false; // Point is outside
      }
    }
  }

  return true;
}

// Check if two line segments intersect
function segmentsIntersect(
  p1: Point, p2: Point,  // First segment
  p3: Point, p4: Point   // Second segment
): boolean {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }

  // Check for collinear cases
  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;

  return false;
}

function direction(p1: Point, p2: Point, p3: Point): number {
  return (p3.x - p1.x) * (p2.y - p1.y) - (p2.x - p1.x) * (p3.y - p1.y);
}

function onSegment(p1: Point, p2: Point, p: Point): boolean {
  return Math.min(p1.x, p2.x) <= p.x && p.x <= Math.max(p1.x, p2.x) &&
         Math.min(p1.y, p2.y) <= p.y && p.y <= Math.max(p1.y, p2.y);
}

// Check if two convex polygons overlap
function polygonsOverlap(verts1: Point[], verts2: Point[], tolerance: number = 2): boolean {
  // Shrink polygons slightly to allow touching edges
  const shrink = (vertices: Point[], amount: number): Point[] => {
    const cx = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
    const cy = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
    return vertices.map(v => ({
      x: v.x + (cx - v.x) * amount / Math.sqrt((v.x - cx) ** 2 + (v.y - cy) ** 2 + 1),
      y: v.y + (cy - v.y) * amount / Math.sqrt((v.x - cx) ** 2 + (v.y - cy) ** 2 + 1),
    }));
  };

  const v1 = shrink(verts1, tolerance);
  const v2 = shrink(verts2, tolerance);

  // Check if any vertex of polygon 1 is inside polygon 2
  for (const v of v1) {
    if (pointInPolygon(v, v2)) return true;
  }

  // Check if any vertex of polygon 2 is inside polygon 1
  for (const v of v2) {
    if (pointInPolygon(v, v1)) return true;
  }

  // Check if any edges intersect
  for (let i = 0; i < v1.length; i++) {
    const a1 = v1[i];
    const a2 = v1[(i + 1) % v1.length];

    for (let j = 0; j < v2.length; j++) {
      const b1 = v2[j];
      const b2 = v2[(j + 1) % v2.length];

      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }

  return false;
}

// Check if two tiles overlap using proper polygon intersection
export function tilesOverlap(t1: Tile, t2: Tile, scale: number = 50, tolerance: number = 2): boolean {
  // Quick bounding box check first
  const dx = Math.abs(t1.cx - t2.cx);
  const dy = Math.abs(t1.cy - t2.cy);
  const maxDist = scale * 2.5; // Max possible distance for parallelogram

  if (dx > maxDist || dy > maxDist) {
    return false; // Definitely no overlap
  }

  // Full polygon intersection check
  const verts1 = getTileVertices(t1, scale);
  const verts2 = getTileVertices(t2, scale);

  return polygonsOverlap(verts1, verts2, tolerance);
}

// Get the start and end points for each segment
export function getSegmentEndpoints(tile: Tile, scale: number = 50): { start: Point; end: Point }[] {
  const vertices = getTileVertices(tile, scale);

  // Calculate edge midpoints for splitting long edges
  const topMid = { x: (vertices[0].x + vertices[1].x) / 2, y: (vertices[0].y + vertices[1].y) / 2 };
  const bottomMid = { x: (vertices[2].x + vertices[3].x) / 2, y: (vertices[2].y + vertices[3].y) / 2 };

  return [
    { start: vertices[0], end: topMid },      // seg 0: top-left half
    { start: topMid, end: vertices[1] },      // seg 1: top-right half
    { start: vertices[1], end: vertices[2] }, // seg 2: right short edge
    { start: vertices[2], end: bottomMid },   // seg 3: bottom-right half
    { start: bottomMid, end: vertices[3] },   // seg 4: bottom-left half
    { start: vertices[3], end: vertices[0] }, // seg 5: left short edge
  ];
}

// Get SVG path for a tile (straight edges)
export function getTilePath(tile: Tile, scale: number = 50): string {
  const vertices = getTileVertices(tile, scale);
  const parts = vertices.map((v, i) =>
    `${i === 0 ? 'M' : 'L'} ${v.x.toFixed(2)} ${v.y.toFixed(2)}`
  );
  return parts.join(' ') + ' Z';
}

// Get SVG path for a tile with Bezier curved edges
export function getTilePathWithCurves(
  tile: Tile,
  controlPoints: EdgeControlPoints,
  scale: number = 50
): string {
  const segments = getSegmentEndpoints(tile, scale);

  let pathD = `M ${segments[0].start.x.toFixed(2)} ${segments[0].start.y.toFixed(2)}`;

  for (let i = 0; i < 6; i++) {
    const { start, end } = segments[i];
    const isTypeB = SEGMENT_TYPES[i] === 'B';

    // For B segments (rotated 180°): swap cp1 and cp2, then apply x-flip
    // This makes the curve the same shape, just rotated 180°
    const firstCp = isTypeB ? controlPoints.cp2 : controlPoints.cp1;
    const secondCp = isTypeB ? controlPoints.cp1 : controlPoints.cp2;

    // Transform control points to world space
    const worldCp1 = transformControlPoint(firstCp, start, end, isTypeB);
    const worldCp2 = transformControlPoint(secondCp, start, end, isTypeB);

    // Cubic Bezier curve
    pathD += ` C ${worldCp1.x.toFixed(2)} ${worldCp1.y.toFixed(2)}, ${worldCp2.x.toFixed(2)} ${worldCp2.y.toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  }

  pathD += ' Z';
  return pathD;
}

// Generate a color based on tile id (shades of green/teal)
export function getTileColor(tileId: number): string {
  const hue = 150 + (tileId * 17) % 40;  // 150-190 range (green to teal)
  const sat = 50 + (tileId * 7) % 30;    // 50-80%
  const light = 35 + (tileId * 11) % 25; // 35-60%
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}
