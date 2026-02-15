import { describe, it, expect } from 'vitest';
import {
  SEGMENT_TYPES,
  BASE_SEGMENT_MIDPOINTS,
  getTileVertices,
  getSegmentMidpoints,
  getSegmentNormal,
  calculateNewTilePosition,
  getValidAttachments,
  tilesOverlap,
  getTilePath,
  getTileColor,
  transformControlPoint,
  inverseTransformControlPoint,
  DEFAULT_CONTROL_POINTS,
  type Tile,
} from './nessiesLogic';

describe('SEGMENT_TYPES', () => {
  it('alternates A and B for 6 segments', () => {
    expect(SEGMENT_TYPES).toEqual(['A', 'B', 'A', 'B', 'A', 'B']);
  });
});

describe('BASE_SEGMENT_MIDPOINTS', () => {
  it('has 6 midpoints', () => {
    expect(BASE_SEGMENT_MIDPOINTS).toHaveLength(6);
  });
});

describe('getTileVertices', () => {
  it('returns 4 vertices for a parallelogram', () => {
    const tile: Tile = { id: 0, cx: 0, cy: 0, rotation: 0 };
    const vertices = getTileVertices(tile);
    expect(vertices).toHaveLength(4);
  });

  it('applies scale', () => {
    const tile: Tile = { id: 0, cx: 0, cy: 0, rotation: 0 };
    const v50 = getTileVertices(tile, 50);
    const v100 = getTileVertices(tile, 100);
    // Vertices at scale 100 should be ~2x those at scale 50
    expect(Math.abs(v100[0].x)).toBeCloseTo(Math.abs(v50[0].x) * 2, 5);
  });

  it('applies translation', () => {
    const tileAtOrigin: Tile = { id: 0, cx: 0, cy: 0, rotation: 0 };
    const tileTranslated: Tile = { id: 0, cx: 100, cy: 200, rotation: 0 };
    const v0 = getTileVertices(tileAtOrigin, 50);
    const vT = getTileVertices(tileTranslated, 50);
    // Each vertex should be shifted by (100, 200)
    for (let i = 0; i < 4; i++) {
      expect(vT[i].x).toBeCloseTo(v0[i].x + 100, 5);
      expect(vT[i].y).toBeCloseTo(v0[i].y + 200, 5);
    }
  });

  it('rotation by 360 returns same vertices', () => {
    const tile0: Tile = { id: 0, cx: 0, cy: 0, rotation: 0 };
    const tile360: Tile = { id: 0, cx: 0, cy: 0, rotation: 360 };
    const v0 = getTileVertices(tile0);
    const v360 = getTileVertices(tile360);
    for (let i = 0; i < 4; i++) {
      expect(v360[i].x).toBeCloseTo(v0[i].x, 5);
      expect(v360[i].y).toBeCloseTo(v0[i].y, 5);
    }
  });
});

describe('getSegmentMidpoints', () => {
  it('returns 6 midpoints', () => {
    const tile: Tile = { id: 0, cx: 0, cy: 0, rotation: 0 };
    const midpoints = getSegmentMidpoints(tile);
    expect(midpoints).toHaveLength(6);
  });
});

describe('getSegmentNormal', () => {
  it('adds tile rotation to base normal', () => {
    expect(getSegmentNormal(0, 0)).toBe(-90);
    expect(getSegmentNormal(0, 60)).toBe(-30);
  });
});

describe('getValidAttachments', () => {
  it('returns 3 options per segment (A matches 3 B segments)', () => {
    const tile: Tile = { id: 0, cx: 0, cy: 0, rotation: 0 };
    // segment 0 is type A, should match segments 1, 3, 5 (type B)
    const options = getValidAttachments(tile, 0);
    expect(options).toHaveLength(3);
    // All target segments should be type B
    for (const opt of options) {
      expect(SEGMENT_TYPES[opt.toSegment]).toBe('B');
    }
  });

  it('returns positions that are not at the origin tile center', () => {
    const tile: Tile = { id: 0, cx: 100, cy: 100, rotation: 0 };
    const options = getValidAttachments(tile, 0);
    for (const opt of options) {
      // New tile should not be at same position
      const dist = Math.sqrt((opt.position.x - 100) ** 2 + (opt.position.y - 100) ** 2);
      expect(dist).toBeGreaterThan(10);
    }
  });
});

describe('tilesOverlap', () => {
  it('detects overlapping tiles at same position', () => {
    const t1: Tile = { id: 0, cx: 100, cy: 100, rotation: 0 };
    const t2: Tile = { id: 1, cx: 100, cy: 100, rotation: 0 };
    expect(tilesOverlap(t1, t2)).toBe(true);
  });

  it('detects non-overlapping tiles far apart', () => {
    const t1: Tile = { id: 0, cx: 0, cy: 0, rotation: 0 };
    const t2: Tile = { id: 1, cx: 500, cy: 500, rotation: 0 };
    expect(tilesOverlap(t1, t2)).toBe(false);
  });
});

describe('getTilePath', () => {
  it('returns a valid SVG path starting with M and ending with Z', () => {
    const tile: Tile = { id: 0, cx: 0, cy: 0, rotation: 0 };
    const path = getTilePath(tile);
    expect(path).toMatch(/^M /);
    expect(path).toMatch(/ Z$/);
  });
});

describe('getTileColor', () => {
  it('returns an hsl color string', () => {
    const color = getTileColor(0);
    expect(color).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });

  it('returns different colors for different ids', () => {
    expect(getTileColor(0)).not.toBe(getTileColor(1));
  });
});

describe('transformControlPoint / inverseTransformControlPoint', () => {
  it('round-trips correctly (non-flipped)', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 100, y: 0 };
    const cp = { x: 0.33, y: 0.2 };
    const world = transformControlPoint(cp, start, end, false);
    const back = inverseTransformControlPoint(world, start, end, false);
    expect(back.x).toBeCloseTo(cp.x, 5);
    expect(back.y).toBeCloseTo(cp.y, 5);
  });

  it('round-trips correctly (flipped)', () => {
    const start = { x: 10, y: 20 };
    const end = { x: 60, y: 80 };
    const cp = { x: 0.4, y: -0.1 };
    const world = transformControlPoint(cp, start, end, true);
    const back = inverseTransformControlPoint(world, start, end, true);
    expect(back.x).toBeCloseTo(cp.x, 5);
    expect(back.y).toBeCloseTo(cp.y, 5);
  });
});
