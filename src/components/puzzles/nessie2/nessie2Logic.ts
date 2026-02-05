// Nessie 2 puzzle logic
// Generalized polygon monotile with 60° angular resolution
// Polygons defined by turn sequences (multiples of 60°)
// Perimeter divided into segments alternating A and B
// Tiles connect when A meets B

export interface Point {
  x: number;
  y: number;
}

export interface PolygonShape {
  id: string;
  name: string;
  turnSequence: number[];
  baseVertices: Point[];
  segmentCount: number;
  segmentMidpoints: Point[];
  segmentDirections: number[];  // tangent direction (along edge) in degrees
  segmentNormals: number[];     // outward normal direction in degrees
  segmentTypes: ('A' | 'B')[];
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

const DEG_60 = Math.PI / 3;

// Center the vertices around the centroid
function centerVertices(vertices: Point[]): Point[] {
  const cx = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
  const cy = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;
  return vertices.map(v => ({ x: v.x - cx, y: v.y - cy }));
}

// Compute polygon vertices from a turn sequence
// Each number is a turn (multiples of 60°) before moving 1 unit
// Positive = clockwise, negative = counter-clockwise
export function computeVerticesFromTurns(turnSequence: number[]): Point[] {
  let direction = 0;  // Start facing right (0 radians)
  let position = { x: 0, y: 0 };
  const vertices: Point[] = [{ ...position }];

  for (const turn of turnSequence) {
    // Turn first (positive = clockwise, so subtract from direction)
    direction = direction - turn * DEG_60;
    // Then move 1 unit in the current direction
    position = {
      x: position.x + Math.cos(direction),
      y: position.y + Math.sin(direction),
    };
    vertices.push({ ...position });
  }

  // Remove the closing duplicate vertex (it should be back at origin)
  vertices.pop();

  return centerVertices(vertices);
}

// Compute segment midpoints, directions, and normals for a polygon
function computeSegmentData(vertices: Point[]): {
  midpoints: Point[];
  directions: number[];
  normals: number[];
} {
  const midpoints: Point[] = [];
  const directions: number[] = [];
  const normals: number[] = [];

  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const v1 = vertices[i];
    const v2 = vertices[(i + 1) % n];

    // Midpoint
    midpoints.push({
      x: (v1.x + v2.x) / 2,
      y: (v1.y + v2.y) / 2,
    });

    // Direction (angle of edge, in degrees)
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const dirRad = Math.atan2(dy, dx);
    const dirDeg = (dirRad * 180) / Math.PI;
    directions.push(dirDeg);

    // Normal (perpendicular, pointing outward - to the right of edge direction)
    // For clockwise-wound polygons, the outward normal is 90° clockwise from direction
    const normalDeg = dirDeg + 90;
    normals.push(normalDeg);
  }

  return { midpoints, directions, normals };
}

// Create a PolygonShape from a turn sequence
export function createPolygonShape(
  id: string,
  name: string,
  turnSequence: number[]
): PolygonShape {
  const baseVertices = computeVerticesFromTurns(turnSequence);
  const segmentCount = baseVertices.length;
  const { midpoints, directions, normals } = computeSegmentData(baseVertices);

  // Segment types alternate: even index = A, odd = B
  const segmentTypes: ('A' | 'B')[] = [];
  for (let i = 0; i < segmentCount; i++) {
    segmentTypes.push(i % 2 === 0 ? 'A' : 'B');
  }

  return {
    id,
    name,
    turnSequence,
    baseVertices,
    segmentCount,
    segmentMidpoints: midpoints,
    segmentDirections: directions,
    segmentNormals: normals,
    segmentTypes,
  };
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
export function rotatePoint(p: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: p.x * cos - p.y * sin,
    y: p.x * sin + p.y * cos,
  };
}

// Translate a point
export function translatePoint(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy };
}

// Get the vertices of a tile at given position and rotation
export function getTileVertices(shape: PolygonShape, tile: Tile, scale: number = 50): Point[] {
  return shape.baseVertices.map(v => {
    const rotated = rotatePoint(v, tile.rotation);
    return translatePoint(
      { x: rotated.x * scale, y: rotated.y * scale },
      tile.cx,
      tile.cy
    );
  });
}

// Get segment midpoints for a placed tile
export function getSegmentMidpoints(shape: PolygonShape, tile: Tile, scale: number = 50): Point[] {
  return shape.segmentMidpoints.map(p => {
    const rotated = rotatePoint(p, tile.rotation);
    return translatePoint(
      { x: rotated.x * scale, y: rotated.y * scale },
      tile.cx,
      tile.cy
    );
  });
}

// Get the outward normal direction for a segment on a rotated tile
export function getSegmentNormal(shape: PolygonShape, segmentIndex: number, tileRotation: number): number {
  return shape.segmentNormals[segmentIndex] + tileRotation;
}

// Calculate where a new tile's center should be when attaching
export function calculateNewTilePosition(
  shape: PolygonShape,
  fromTile: Tile,
  fromSegment: number,
  toSegment: number,
  newRotation: number,
  scale: number = 50
): Point {
  // Get the midpoint of the source segment
  const fromMidpoints = getSegmentMidpoints(shape, fromTile, scale);
  const attachPoint = fromMidpoints[fromSegment];

  // Get where the target segment midpoint would be relative to new tile center
  const toMidpointBase = shape.segmentMidpoints[toSegment];
  const toMidpointRotated = rotatePoint(toMidpointBase, newRotation);

  // New tile center = attach point - (rotated segment midpoint * scale)
  return {
    x: attachPoint.x - toMidpointRotated.x * scale,
    y: attachPoint.y - toMidpointRotated.y * scale,
  };
}

// Find valid attachment configurations for a new tile
export interface AttachmentOption {
  fromSegment: number;
  toSegment: number;
  rotation: number;
  position: Point;
}

export function getValidAttachments(
  shape: PolygonShape,
  fromTile: Tile,
  fromSegment: number,
  scale: number = 50
): AttachmentOption[] {
  const fromType = shape.segmentTypes[fromSegment];
  const options: AttachmentOption[] = [];

  // Find segments of opposite type on the new tile
  for (let toSegment = 0; toSegment < shape.segmentCount; toSegment++) {
    if (shape.segmentTypes[toSegment] !== fromType) {
      // This segment can connect (A matches B)
      // The new tile needs to be rotated so the edge directions are opposite

      // Get the edge direction of the source segment (with tile rotation applied)
      const fromDirection = shape.segmentDirections[fromSegment] + fromTile.rotation;

      // The target segment's edge direction (after rotation) must be opposite
      // targetDirection = fromDirection + 180
      let newRotation = fromDirection + 180 - shape.segmentDirections[toSegment];
      // Normalize to 0-360
      newRotation = ((newRotation % 360) + 360) % 360;

      const position = calculateNewTilePosition(shape, fromTile, fromSegment, toSegment, newRotation, scale);

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
export function tilesOverlap(shape: PolygonShape, t1: Tile, t2: Tile, scale: number = 50, tolerance: number = 2): boolean {
  // Quick bounding box check first
  const dx = Math.abs(t1.cx - t2.cx);
  const dy = Math.abs(t1.cy - t2.cy);
  const maxDist = scale * 2.5; // Max possible distance

  if (dx > maxDist || dy > maxDist) {
    return false; // Definitely no overlap
  }

  // Full polygon intersection check
  const verts1 = getTileVertices(shape, t1, scale);
  const verts2 = getTileVertices(shape, t2, scale);

  return polygonsOverlap(verts1, verts2, tolerance);
}

// Get the start and end points for each segment
export function getSegmentEndpoints(shape: PolygonShape, tile: Tile, scale: number = 50): { start: Point; end: Point }[] {
  const vertices = getTileVertices(shape, tile, scale);
  const n = vertices.length;

  const segments: { start: Point; end: Point }[] = [];
  for (let i = 0; i < n; i++) {
    segments.push({
      start: vertices[i],
      end: vertices[(i + 1) % n],
    });
  }

  return segments;
}

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
    localX = 1 - localX;
    localY = -localY;
  }

  return { x: localX, y: localY };
}

// Get SVG path for a tile (straight edges)
export function getTilePath(shape: PolygonShape, tile: Tile, scale: number = 50): string {
  const vertices = getTileVertices(shape, tile, scale);
  const parts = vertices.map((v, i) =>
    `${i === 0 ? 'M' : 'L'} ${v.x.toFixed(2)} ${v.y.toFixed(2)}`
  );
  return parts.join(' ') + ' Z';
}

// Get SVG path for a tile with Bezier curved edges
export function getTilePathWithCurves(
  shape: PolygonShape,
  tile: Tile,
  controlPoints: EdgeControlPoints,
  scale: number = 50
): string {
  const segments = getSegmentEndpoints(shape, tile, scale);

  let pathD = `M ${segments[0].start.x.toFixed(2)} ${segments[0].start.y.toFixed(2)}`;

  for (let i = 0; i < segments.length; i++) {
    const { start, end } = segments[i];
    const isTypeB = shape.segmentTypes[i] === 'B';

    // For B segments (rotated 180°): swap cp1 and cp2, then apply x-flip
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
