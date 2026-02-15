import { describe, it, expect } from 'vitest';
import {
  NEXT_TILE_INDICES,
  TILE_CONNECTIONS_MAP,
  getAdjacentTilePosition,
  traceLoop,
  getAllLoops,
  getLoopColor,
  getLoopIndexColor,
} from './cipraLogic';

describe('TILE_CONNECTIONS_MAP', () => {
  it('has 16 tiles', () => {
    expect(TILE_CONNECTIONS_MAP).toHaveLength(16);
  });

  it('each tile has 8 bidirectional connections', () => {
    for (let t = 0; t < 16; t++) {
      const conns = TILE_CONNECTIONS_MAP[t];
      expect(conns).toHaveLength(8);
      for (let ep = 0; ep < 8; ep++) {
        const partner = conns[ep];
        expect(partner).toBeGreaterThanOrEqual(0);
        expect(partner).toBeLessThan(8);
        // bidirectional: if ep connects to partner, partner connects back to ep
        expect(conns[partner]).toBe(ep);
      }
    }
  });

  it('each tile pairs endpoints into 4 disjoint pairs', () => {
    for (let t = 0; t < 16; t++) {
      const conns = TILE_CONNECTIONS_MAP[t];
      const visited = new Set<number>();
      let pairCount = 0;
      for (let ep = 0; ep < 8; ep++) {
        if (!visited.has(ep)) {
          visited.add(ep);
          visited.add(conns[ep]);
          pairCount++;
        }
      }
      expect(pairCount).toBe(4);
      expect(visited.size).toBe(8);
    }
  });
});

describe('NEXT_TILE_INDICES', () => {
  it('maps exit endpoint to entry endpoint on adjacent tile', () => {
    expect(NEXT_TILE_INDICES).toHaveLength(8);
    // Each mapping should be a valid endpoint
    for (const idx of NEXT_TILE_INDICES) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(8);
    }
  });

  it('is an involution (applying twice returns original)', () => {
    for (let ep = 0; ep < 8; ep++) {
      expect(NEXT_TILE_INDICES[NEXT_TILE_INDICES[ep]]).toBe(ep);
    }
  });
});

describe('getAdjacentTilePosition', () => {
  // Grid is 4x4, positions 0-15
  // pos = row * 4 + col

  it('moves left when exiting left edge (endpoints 0, 7)', () => {
    // pos 5 = row 1, col 1 → col 0 = pos 4
    expect(getAdjacentTilePosition(5, 0)).toBe(4);
    expect(getAdjacentTilePosition(5, 7)).toBe(4);
  });

  it('moves right when exiting right edge (endpoints 3, 4)', () => {
    // pos 5 = row 1, col 1 → col 2 = pos 6
    expect(getAdjacentTilePosition(5, 3)).toBe(6);
    expect(getAdjacentTilePosition(5, 4)).toBe(6);
  });

  it('moves down when exiting bottom edge (endpoints 1, 2)', () => {
    // pos 5 = row 1, col 1 → row 2, col 1 = pos 9
    expect(getAdjacentTilePosition(5, 1)).toBe(9);
    expect(getAdjacentTilePosition(5, 2)).toBe(9);
  });

  it('moves up when exiting top edge (endpoints 5, 6)', () => {
    // pos 5 = row 1, col 1 → row 0, col 1 = pos 1
    expect(getAdjacentTilePosition(5, 5)).toBe(1);
    expect(getAdjacentTilePosition(5, 6)).toBe(1);
  });

  it('wraps toroidally', () => {
    // Left wrap: col 0 → col 3
    expect(getAdjacentTilePosition(0, 0)).toBe(3);   // row 0, col 0 → row 0, col 3
    // Right wrap: col 3 → col 0
    expect(getAdjacentTilePosition(3, 3)).toBe(0);   // row 0, col 3 → row 0, col 0
    // Top wrap: row 0 → row 3
    expect(getAdjacentTilePosition(1, 5)).toBe(13);  // row 0, col 1 → row 3, col 1
    // Bottom wrap: row 3 → row 0
    expect(getAdjacentTilePosition(13, 1)).toBe(1);  // row 3, col 1 → row 0, col 1
  });
});

describe('traceLoop', () => {
  it('returns a non-empty array of visited positions', () => {
    // All tiles set to tile 0
    const tilePositions = new Array(16).fill(0);
    const loop = traceLoop(tilePositions, 0, 0);
    expect(loop.length).toBeGreaterThan(0);
  });

  it('loop length is always a multiple of 4', () => {
    // With uniform tiles, loops should be multiples of 4
    const tilePositions = new Array(16).fill(0);
    const loop = traceLoop(tilePositions, 0, 0);
    expect(loop.length % 4).toBe(0);
  });
});

describe('getAllLoops', () => {
  it('covers all 64 endpoint pairs (16 tiles × 4 paths each)', () => {
    const tilePositions = new Array(16).fill(0);
    const loops = getAllLoops(tilePositions);
    const totalVisits = loops.reduce((sum, loop) => sum + loop.length, 0);
    // Each tile has 4 paths, each path is visited once from each direction = 64
    expect(totalVisits).toBe(64);
  });

  it('returns at least one loop', () => {
    const tilePositions = new Array(16).fill(0);
    const loops = getAllLoops(tilePositions);
    expect(loops.length).toBeGreaterThan(0);
  });
});

describe('getLoopColor', () => {
  it('returns a color for known loop lengths', () => {
    expect(getLoopColor(4)).toBe('#f59e0b');
    expect(getLoopColor(64)).toBe('#65a30d');
  });

  it('returns grey for unknown loop length', () => {
    expect(getLoopColor(99)).toBe('#cccccc');
  });
});

describe('getLoopIndexColor', () => {
  it('cycles through 10 colors', () => {
    expect(getLoopIndexColor(0)).toBe('#4e79a7');
    expect(getLoopIndexColor(10)).toBe('#4e79a7'); // wraps
  });
});
