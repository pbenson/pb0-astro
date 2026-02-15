import { describe, it, expect } from 'vitest';
import {
  computeVerticesFromTurns,
  createPolygonShape,
  rotatePoint,
  translatePoint,
  getTileVertices,
  getSegmentMidpoints,
  getSegmentNormal,
  getValidAttachments,
  tilesOverlap,
  getTilePath,
  getTileColor,
  transformControlPoint,
  inverseTransformControlPoint,
  type Tile,
} from './nessie2Logic';

// The original Nessie parallelogram: turns [1, -1, 1, -1] (60° angles)
const PARALLELOGRAM_TURNS = [1, -1, 1, -1];

describe('computeVerticesFromTurns', () => {
  it('produces 4 vertices for a parallelogram', () => {
    const verts = computeVerticesFromTurns(PARALLELOGRAM_TURNS);
    expect(verts).toHaveLength(4);
  });

  it('produces 6 vertices for a hexagon', () => {
    // Regular hexagon: all turns are 1 (60° each, 6 sides)
    const hexTurns = [1, 1, 1, 1, 1, 1];
    const verts = computeVerticesFromTurns(hexTurns);
    expect(verts).toHaveLength(6);
  });

  it('centers vertices around origin', () => {
    const verts = computeVerticesFromTurns(PARALLELOGRAM_TURNS);
    const cx = verts.reduce((s, v) => s + v.x, 0) / verts.length;
    const cy = verts.reduce((s, v) => s + v.y, 0) / verts.length;
    expect(cx).toBeCloseTo(0, 5);
    expect(cy).toBeCloseTo(0, 5);
  });
});

describe('createPolygonShape', () => {
  it('creates a shape with correct segment count', () => {
    const shape = createPolygonShape('para', 'Parallelogram', PARALLELOGRAM_TURNS);
    expect(shape.segmentCount).toBe(4);
    expect(shape.segmentMidpoints).toHaveLength(4);
    expect(shape.segmentDirections).toHaveLength(4);
    expect(shape.segmentNormals).toHaveLength(4);
    expect(shape.segmentTypes).toHaveLength(4);
  });

  it('alternates segment types A and B', () => {
    const shape = createPolygonShape('para', 'Parallelogram', PARALLELOGRAM_TURNS);
    expect(shape.segmentTypes).toEqual(['A', 'B', 'A', 'B']);
  });

  it('hexagon has 6 alternating segments', () => {
    const shape = createPolygonShape('hex', 'Hexagon', [1, 1, 1, 1, 1, 1]);
    expect(shape.segmentCount).toBe(6);
    expect(shape.segmentTypes).toEqual(['A', 'B', 'A', 'B', 'A', 'B']);
  });
});

describe('rotatePoint', () => {
  it('rotation by 0 degrees is identity', () => {
    const p = { x: 3, y: 4 };
    const r = rotatePoint(p, 0);
    expect(r.x).toBeCloseTo(3, 5);
    expect(r.y).toBeCloseTo(4, 5);
  });

  it('rotation by 90 degrees', () => {
    const p = { x: 1, y: 0 };
    const r = rotatePoint(p, 90);
    expect(r.x).toBeCloseTo(0, 5);
    expect(r.y).toBeCloseTo(1, 5);
  });

  it('rotation by 360 returns to original', () => {
    const p = { x: 2.5, y: -1.3 };
    const r = rotatePoint(p, 360);
    expect(r.x).toBeCloseTo(p.x, 5);
    expect(r.y).toBeCloseTo(p.y, 5);
  });
});

describe('translatePoint', () => {
  it('adds offsets', () => {
    const p = translatePoint({ x: 1, y: 2 }, 10, 20);
    expect(p).toEqual({ x: 11, y: 22 });
  });
});

describe('getTileVertices (with shape)', () => {
  const shape = createPolygonShape('para', 'Parallelogram', PARALLELOGRAM_TURNS);

  it('returns correct number of vertices', () => {
    const tile: Tile = { id: 0, cx: 0, cy: 0, rotation: 0 };
    const verts = getTileVertices(shape, tile);
    expect(verts).toHaveLength(4);
  });

  it('applies translation', () => {
    const tile: Tile = { id: 0, cx: 200, cy: 300, rotation: 0 };
    const verts = getTileVertices(shape, tile);
    const avgX = verts.reduce((s, v) => s + v.x, 0) / verts.length;
    const avgY = verts.reduce((s, v) => s + v.y, 0) / verts.length;
    expect(avgX).toBeCloseTo(200, 0);
    expect(avgY).toBeCloseTo(300, 0);
  });
});

describe('getValidAttachments (with shape)', () => {
  const shape = createPolygonShape('para', 'Parallelogram', PARALLELOGRAM_TURNS);

  it('returns attachments for A segment matching B segments', () => {
    const tile: Tile = { id: 0, cx: 0, cy: 0, rotation: 0 };
    // segment 0 is A, should match B segments (1, 3)
    const options = getValidAttachments(shape, tile, 0);
    expect(options).toHaveLength(2);
    for (const opt of options) {
      expect(shape.segmentTypes[opt.toSegment]).toBe('B');
    }
  });
});

describe('tilesOverlap (with shape)', () => {
  const shape = createPolygonShape('para', 'Parallelogram', PARALLELOGRAM_TURNS);

  it('overlapping tiles at same position', () => {
    const t1: Tile = { id: 0, cx: 0, cy: 0, rotation: 0 };
    const t2: Tile = { id: 1, cx: 0, cy: 0, rotation: 0 };
    expect(tilesOverlap(shape, t1, t2)).toBe(true);
  });

  it('non-overlapping tiles far apart', () => {
    const t1: Tile = { id: 0, cx: 0, cy: 0, rotation: 0 };
    const t2: Tile = { id: 1, cx: 500, cy: 500, rotation: 0 };
    expect(tilesOverlap(shape, t1, t2)).toBe(false);
  });
});

describe('getTilePath (with shape)', () => {
  const shape = createPolygonShape('para', 'Parallelogram', PARALLELOGRAM_TURNS);

  it('returns valid SVG path', () => {
    const tile: Tile = { id: 0, cx: 0, cy: 0, rotation: 0 };
    const path = getTilePath(shape, tile);
    expect(path).toMatch(/^M /);
    expect(path).toMatch(/ Z$/);
  });
});

describe('getTileColor', () => {
  it('returns hsl string', () => {
    expect(getTileColor(0)).toMatch(/^hsl\(/);
  });
});

describe('transformControlPoint / inverseTransformControlPoint', () => {
  it('round-trips correctly', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 50, y: 50 };
    const cp = { x: 0.3, y: 0.15 };
    const world = transformControlPoint(cp, start, end, false);
    const back = inverseTransformControlPoint(world, start, end, false);
    expect(back.x).toBeCloseTo(cp.x, 5);
    expect(back.y).toBeCloseTo(cp.y, 5);
  });
});
