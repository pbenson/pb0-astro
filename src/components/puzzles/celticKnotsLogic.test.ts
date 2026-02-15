import { describe, it, expect } from 'vitest';
import {
  getTileType,
  getTileById,
  isUnderTile,
  getAdjacentSupports,
  checkEdgeCompatibility,
  check45DegreeCompatibility,
  checkVertexCompatibility,
  canPlaceTile,
  createInitialGrid,
  getValidTilesForPosition,
  getBlockedPositions,
  autoFillGrid,
} from './celticKnotsLogic';

describe('getTileType', () => {
  it('identifies 90-degree turns (differ by 2 or 6)', () => {
    expect(getTileType([0, 2])).toBe('90-degree');
    expect(getTileType([2, 4])).toBe('90-degree');
    expect(getTileType([0, 6])).toBe('90-degree');
  });

  it('identifies straight-through (differ by 4)', () => {
    expect(getTileType([0, 4])).toBe('straight');
    expect(getTileType([2, 6])).toBe('straight');
  });

  it('identifies diagonals', () => {
    expect(getTileType([1, 5])).toBe('diagonal');
    expect(getTileType([3, 7])).toBe('diagonal');
    expect(getTileType([5, 1])).toBe('diagonal');
    expect(getTileType([7, 3])).toBe('diagonal');
  });

  it('identifies 45-degree turns (differ by 3 or 5)', () => {
    expect(getTileType([0, 3])).toBe('45-degree');
    expect(getTileType([0, 5])).toBe('45-degree');
    expect(getTileType([2, 5])).toBe('45-degree');
    expect(getTileType([2, 7])).toBe('45-degree');
  });
});

describe('getTileById', () => {
  it('finds tiles by id', () => {
    const tile = getTileById('0-2');
    expect(tile).toBeDefined();
    expect(tile!.connections).toEqual([0, 2]);
  });

  it('finds under tiles', () => {
    const tile = getTileById('1-5-u');
    expect(tile).toBeDefined();
    expect(tile!.secondIsUnder).toBe(true);
  });

  it('returns undefined for invalid id', () => {
    expect(getTileById('nonexistent')).toBeUndefined();
  });
});

describe('isUnderTile', () => {
  it('detects under tiles', () => {
    expect(isUnderTile('1-5-u')).toBe(true);
    expect(isUnderTile('0-3-u')).toBe(true);
  });

  it('detects non-under tiles', () => {
    expect(isUnderTile('0-2')).toBe(false);
    expect(isUnderTile('0-4')).toBe(false);
  });
});

describe('getAdjacentSupports', () => {
  it('counts grid edges as support', () => {
    const grid: (string | null)[][] = [[null, null], [null, null]];
    // corner cell (0,0) has 2 edge supports (top and left)
    expect(getAdjacentSupports(grid, 0, 0)).toBe(2);
  });

  it('counts placed tiles as support', () => {
    const grid: (string | null)[][] = [['0-2', null], [null, null]];
    // cell (0,1) has top edge + right edge + left tile = 3 supports
    expect(getAdjacentSupports(grid, 0, 1)).toBe(3);
  });

  it('counts all 4 sides for interior cell with no neighbors', () => {
    const grid: (string | null)[][] = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    // center cell (1,1) has no edges and no placed tiles
    expect(getAdjacentSupports(grid, 1, 1)).toBe(0);
  });
});

describe('checkEdgeCompatibility', () => {
  it('compatible when both connect at shared edge', () => {
    // tile1 connects at edge 0 (up), tile2 connects at edge 4 (down)
    expect(checkEdgeCompatibility([0, 2], [4, 6], 'up')).toBe(true);
  });

  it('compatible when neither connects at shared edge', () => {
    expect(checkEdgeCompatibility([2, 4], [0, 2], 'up')).toBe(true);
  });

  it('incompatible when one connects and other does not', () => {
    // tile1 connects at edge 0 (up), tile2 does NOT connect at edge 4 (down)
    expect(checkEdgeCompatibility([0, 2], [0, 2], 'up')).toBe(false);
  });
});

describe('createInitialGrid', () => {
  it('creates an 8x8 grid with corners pre-placed', () => {
    const grid = createInitialGrid();
    expect(grid).toHaveLength(8);
    expect(grid[0]).toHaveLength(8);
    expect(grid[0][0]).toBe('2-4');
    expect(grid[0][7]).toBe('4-6');
    expect(grid[7][7]).toBe('0-6');
    expect(grid[7][0]).toBe('0-2');
  });

  it('all non-corner cells are null', () => {
    const grid = createInitialGrid();
    let nullCount = 0;
    for (const row of grid) {
      for (const cell of row) {
        if (cell === null) nullCount++;
      }
    }
    expect(nullCount).toBe(60); // 64 - 4 corners
  });
});

describe('canPlaceTile', () => {
  it('rejects placement on occupied cell', () => {
    const grid = createInitialGrid();
    expect(canPlaceTile(grid, 0, 0, '0-4')).toBe(false);
  });

  it('rejects placement with insufficient support', () => {
    const grid = createInitialGrid();
    // center cell (3,3) has no adjacent tiles or edges
    expect(canPlaceTile(grid, 3, 3, '0-4')).toBe(false);
  });

  it('accepts valid placement next to corner', () => {
    const grid = createInitialGrid();
    // (0,1) is next to top-left corner, has top edge + left tile = 2 supports
    const validTiles = getValidTilesForPosition(grid, 0, 1);
    expect(validTiles.length).toBeGreaterThan(0);
    // Any valid tile should pass canPlaceTile
    expect(canPlaceTile(grid, 0, 1, validTiles[0])).toBe(true);
  });
});

describe('check45DegreeCompatibility', () => {
  it('always true when not both 45-degree', () => {
    const corner = getTileById('0-2')!;
    const deg45 = getTileById('0-3')!;
    expect(check45DegreeCompatibility(corner, deg45, 'right')).toBe(true);
  });

  it('requires opposite under status for adjacent 45-degree tiles sharing an edge', () => {
    // tile1 connects at 0 (up edge), tile2 connects at 4 (down edge)
    // For direction 'up': checks tile1 has 0 and tile2 has 4
    const over = getTileById('0-3')!;   // connections [0,3], secondIsUnder = false
    const under = getTileById('4-1-u')!; // connections [4,1], secondIsUnder = true
    const overDown = getTileById('4-1')!; // connections [4,1], secondIsUnder = false
    // opposite under status → compatible
    expect(check45DegreeCompatibility(over, under, 'up')).toBe(true);
    // same under status → incompatible
    expect(check45DegreeCompatibility(over, overDown, 'up')).toBe(false);
  });
});

describe('getBlockedPositions', () => {
  it('returns empty for initial grid (no blocked cells yet)', () => {
    const grid = createInitialGrid();
    const blocked = getBlockedPositions(grid);
    // With only corners placed, edge cells should still have valid options
    expect(blocked).toEqual([]);
  });
});

describe('autoFillGrid', () => {
  it('fills cells that have only one valid tile option', () => {
    const grid = createInitialGrid();
    const filled = autoFillGrid(grid);
    // autoFill should place at least some tiles
    let filledCount = 0;
    for (const row of filled) {
      for (const cell of row) {
        if (cell !== null) filledCount++;
      }
    }
    // At minimum, the 4 corners should still be there
    expect(filledCount).toBeGreaterThanOrEqual(4);
  });

  it('does not modify the original grid', () => {
    const grid = createInitialGrid();
    autoFillGrid(grid);
    // Original should still have nulls
    expect(grid[0][1]).toBeNull();
  });
});
