// Connection points: 0-7 clockwise from top edge midpoint
// Midpoints: 0 (top), 2 (right), 4 (bottom), 6 (left)
// Vertices: 1 (top-right), 3 (bottom-right), 5 (bottom-left), 7 (top-left)

export type TileType = '90-degree' | '45-degree' | 'diagonal' | 'straight'

export function getTileType(connections: [number, number]): TileType {
  const [a, b] = connections
  const diff = Math.abs(a - b)

  // Diagonals: (1, 5) or (3, 7)
  if ((a === 1 && b === 5) || (a === 5 && b === 1) ||
      (a === 3 && b === 7) || (a === 7 && b === 3)) {
    return 'diagonal'
  }

  // Straight-through: differ by 4 (opposite edges)
  if (diff === 4) {
    return 'straight'
  }

  // 90 degree turns: differ by 2 or 6
  if (diff === 2 || diff === 6) {
    return '90-degree'
  }

  // 45 degree turns: differ by 3 or 5
  if (diff === 3 || diff === 5) {
    return '45-degree'
  }

  // Shouldn't happen with valid tiles
  return '45-degree'
}

export interface TileDefinition {
  id: string
  connections: [number, number]
  // The -u suffix means the SECOND connection is "under" at that vertex
  secondIsUnder: boolean
}

// Returns true if tile is "under" at the given vertex, false if "over", null if not applicable
function getUnderStatusAtVertex(tile: TileDefinition, vertex: number): boolean | null {
  // Midpoints (0, 2, 4, 6) don't have over/under
  if (vertex % 2 === 0) return null

  // Check if tile connects at this vertex
  const isFirstConnection = tile.connections[0] === vertex
  const isSecondConnection = tile.connections[1] === vertex

  if (!isFirstConnection && !isSecondConnection) return null

  if (isSecondConnection) {
    return tile.secondIsUnder
  } else {
    // First connection has opposite status of second
    return !tile.secondIsUnder
  }
}

// All tiles based on the files in numbered-connections
export const TILES: TileDefinition[] = [
  // Corner tiles (midpoint to midpoint) - no vertices, so secondIsUnder is irrelevant
  { id: '0-2', connections: [0, 2], secondIsUnder: false },
  { id: '2-4', connections: [2, 4], secondIsUnder: false },
  { id: '4-6', connections: [4, 6], secondIsUnder: false },
  { id: '0-6', connections: [0, 6], secondIsUnder: false },
  // Straight-through tiles (opposite midpoints) - no vertices
  { id: '0-4', connections: [0, 4], secondIsUnder: false },
  { id: '2-6', connections: [2, 6], secondIsUnder: false },
  // Diagonal tiles (vertex to vertex) - -u means second vertex is under
  { id: '1-5-u', connections: [1, 5], secondIsUnder: true },
  { id: '3-7-u', connections: [3, 7], secondIsUnder: true },
  { id: '5-1-u', connections: [5, 1], secondIsUnder: true },
  { id: '7-3-u', connections: [7, 3], secondIsUnder: true },
  // Midpoint to vertex - no -u means vertex (second) is over
  { id: '0-3', connections: [0, 3], secondIsUnder: false },
  { id: '0-5', connections: [0, 5], secondIsUnder: false },
  { id: '2-5', connections: [2, 5], secondIsUnder: false },
  { id: '2-7', connections: [2, 7], secondIsUnder: false },
  { id: '4-1', connections: [4, 1], secondIsUnder: false },
  { id: '4-7', connections: [4, 7], secondIsUnder: false },
  { id: '6-1', connections: [6, 1], secondIsUnder: false },
  { id: '6-3', connections: [6, 3], secondIsUnder: false },
  // Midpoint to vertex - -u means vertex (second) is under
  { id: '0-3-u', connections: [0, 3], secondIsUnder: true },
  { id: '0-5-u', connections: [0, 5], secondIsUnder: true },
  { id: '2-5-u', connections: [2, 5], secondIsUnder: true },
  { id: '2-7-u', connections: [2, 7], secondIsUnder: true },
  { id: '4-1-u', connections: [4, 1], secondIsUnder: true },
  { id: '4-7-u', connections: [4, 7], secondIsUnder: true },
  { id: '6-1-u', connections: [6, 1], secondIsUnder: true },
  { id: '6-3-u', connections: [6, 3], secondIsUnder: true },
]

export const CORNER_TILES = ['2-4', '4-6', '0-6', '0-2']

export function getTileById(id: string): TileDefinition | undefined {
  return TILES.find(t => t.id === id)
}

export function isUnderTile(id: string): boolean {
  return id.endsWith('-u')
}

// Direction offsets for adjacent cells
const DIRECTIONS = {
  up: { row: -1, col: 0 },
  right: { row: 0, col: 1 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
}

// Edge connection points for each direction
const EDGE_CONNECTIONS: Record<string, number> = {
  up: 0,
  right: 2,
  down: 4,
  left: 6,
}

// Vertex connection points shared between adjacent tiles
// For each direction, the vertices that could be shared with a neighbor
const VERTEX_CONNECTIONS: Record<string, { our: number; their: number }[]> = {
  up: [
    { our: 7, their: 5 }, // top-left corner shared with neighbor's bottom-left
    { our: 1, their: 3 }, // top-right corner shared with neighbor's bottom-right
  ],
  right: [
    { our: 1, their: 7 }, // top-right corner shared with neighbor's top-left
    { our: 3, their: 5 }, // bottom-right corner shared with neighbor's bottom-left
  ],
  down: [
    { our: 3, their: 1 }, // bottom-right corner shared with neighbor's top-right
    { our: 5, their: 7 }, // bottom-left corner shared with neighbor's top-left
  ],
  left: [
    { our: 5, their: 3 }, // bottom-left corner shared with neighbor's bottom-right
    { our: 7, their: 1 }, // top-left corner shared with neighbor's top-right
  ],
}

export function getAdjacentSupports(
  grid: (string | null)[][],
  row: number,
  col: number
): number {
  const numRows = grid.length
  const numCols = grid[0]?.length ?? 0
  let supports = 0

  // Check each direction
  for (const [dir, offset] of Object.entries(DIRECTIONS)) {
    const newRow = row + offset.row
    const newCol = col + offset.col

    // Grid edge counts as support
    if (newRow < 0 || newRow >= numRows || newCol < 0 || newCol >= numCols) {
      supports++
      continue
    }

    // Placed tile counts as support
    if (grid[newRow][newCol] !== null) {
      supports++
    }
  }

  return supports
}

export function checkEdgeCompatibility(
  tile1Conns: number[],
  tile2Conns: number[],
  direction: string
): boolean {
  const edge = EDGE_CONNECTIONS[direction]
  const matchEdge = (edge + 4) % 8

  // If tile1 connects at this edge, tile2 must connect at the matching edge
  // If tile1 doesn't connect at this edge, tile2 must not connect at the matching edge
  return tile1Conns.includes(edge) === tile2Conns.includes(matchEdge)
}

export function check45DegreeCompatibility(
  tile1: TileDefinition,
  tile2: TileDefinition,
  direction: string
): boolean {
  const type1 = getTileType(tile1.connections)
  const type2 = getTileType(tile2.connections)

  // Rule only applies if both are 45-degree turns
  if (type1 !== '45-degree' || type2 !== '45-degree') {
    return true
  }

  // Rule only applies if tiles have a connection at the shared edge
  const edge = EDGE_CONNECTIONS[direction]
  const matchEdge = (edge + 4) % 8
  const tile1HasEdge = tile1.connections.includes(edge)
  const tile2HasEdge = tile2.connections.includes(matchEdge)

  // If they don't connect at the shared edge, rule doesn't apply
  if (!tile1HasEdge || !tile2HasEdge) {
    return true
  }

  // Exactly one must be an "under" tile (has -u suffix, meaning secondIsUnder is true)
  return tile1.secondIsUnder !== tile2.secondIsUnder
}

export function checkVertexCompatibility(
  tile1: TileDefinition,
  tile2: TileDefinition,
  direction: string
): boolean {
  const vertexPairs = VERTEX_CONNECTIONS[direction]

  for (const { our, their } of vertexPairs) {
    const tile1HasVertex = tile1.connections.includes(our)
    const tile2HasVertex = tile2.connections.includes(their)

    // Both tiles must either have the vertex connection or neither has it
    if (tile1HasVertex !== tile2HasVertex) {
      return false
    }

    // If both tiles connect at this shared vertex, they must have opposite under status
    if (tile1HasVertex && tile2HasVertex) {
      const tile1Under = getUnderStatusAtVertex(tile1, our)
      const tile2Under = getUnderStatusAtVertex(tile2, their)

      // Both should have a status (since they have vertex connections)
      if (tile1Under === null || tile2Under === null) {
        return false
      }

      // Must be opposite: one under, one over
      if (tile1Under === tile2Under) {
        return false
      }
    }
  }

  return true
}

// Connections that would lead off each edge of the board
const FORBIDDEN_CONNECTIONS: Record<string, number[]> = {
  top: [7, 0, 1],
  right: [1, 2, 3],
  bottom: [3, 4, 5],
  left: [5, 6, 7],
}

function checkEdgeBoundaries(
  row: number,
  col: number,
  numRows: number,
  numCols: number,
  connections: number[]
): boolean {
  // Check top edge
  if (row === 0) {
    if (connections.some(c => FORBIDDEN_CONNECTIONS.top.includes(c))) {
      return false
    }
  }
  // Check bottom edge
  if (row === numRows - 1) {
    if (connections.some(c => FORBIDDEN_CONNECTIONS.bottom.includes(c))) {
      return false
    }
  }
  // Check left edge
  if (col === 0) {
    if (connections.some(c => FORBIDDEN_CONNECTIONS.left.includes(c))) {
      return false
    }
  }
  // Check right edge
  if (col === numCols - 1) {
    if (connections.some(c => FORBIDDEN_CONNECTIONS.right.includes(c))) {
      return false
    }
  }
  return true
}

export function canPlaceTile(
  grid: (string | null)[][],
  row: number,
  col: number,
  tileId: string
): boolean {
  const numRows = grid.length
  const numCols = grid[0]?.length ?? 0

  // Cell must be empty
  if (grid[row][col] !== null) {
    return false
  }

  // Need at least 2 adjacent supports
  if (getAdjacentSupports(grid, row, col) < 2) {
    return false
  }

  const tile = getTileById(tileId)
  if (!tile) {
    return false
  }

  // Check that tile connections don't lead off the board edge
  if (!checkEdgeBoundaries(row, col, numRows, numCols, [...tile.connections])) {
    return false
  }

  // Check compatibility with each adjacent tile
  for (const [dir, offset] of Object.entries(DIRECTIONS)) {
    const newRow = row + offset.row
    const newCol = col + offset.col

    // Skip grid edges
    if (newRow < 0 || newRow >= numRows || newCol < 0 || newCol >= numCols) {
      continue
    }

    const adjacentTileId = grid[newRow][newCol]
    if (adjacentTileId === null) {
      continue
    }

    const adjacentTile = getTileById(adjacentTileId)
    if (!adjacentTile) {
      continue
    }

    // Check edge compatibility
    if (!checkEdgeCompatibility(
      [...tile.connections],
      [...adjacentTile.connections],
      dir
    )) {
      return false
    }

    // Check vertex compatibility
    if (!checkVertexCompatibility(tile, adjacentTile, dir)) {
      return false
    }

    // Check 45-degree turn compatibility (connected 45-degree tiles must have opposite under status)
    if (!check45DegreeCompatibility(tile, adjacentTile, dir)) {
      return false
    }
  }

  return true
}

export function getValidPlacements(
  grid: (string | null)[][],
  tileId: string
): { row: number; col: number }[] {
  const validPositions: { row: number; col: number }[] = []
  const numRows = grid.length
  const numCols = grid[0]?.length ?? 0

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      if (canPlaceTile(grid, row, col, tileId)) {
        validPositions.push({ row, col })
      }
    }
  }

  return validPositions
}

export function getValidTilesForPosition(
  grid: (string | null)[][],
  row: number,
  col: number
): string[] {
  return TILES
    .filter(tile => canPlaceTile(grid, row, col, tile.id))
    .map(tile => tile.id)
}

export function getAllValidPositions(
  grid: (string | null)[][]
): { row: number; col: number }[] {
  const validPositions: { row: number; col: number }[] = []
  const numRows = grid.length
  const numCols = grid[0]?.length ?? 0

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      if (getValidTilesForPosition(grid, row, col).length > 0) {
        validPositions.push({ row, col })
      }
    }
  }

  return validPositions
}

export function getBlockedPositions(
  grid: (string | null)[][]
): { row: number; col: number }[] {
  const blockedPositions: { row: number; col: number }[] = []
  const numRows = grid.length
  const numCols = grid[0]?.length ?? 0

  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numCols; col++) {
      // Skip filled cells
      if (grid[row][col] !== null) continue

      // Only consider cells with 2+ supports (tiles or edges)
      // These are cells where placement SHOULD be possible
      if (getAdjacentSupports(grid, row, col) < 2) continue

      // If has enough supports but no valid placements, it's blocked
      if (getValidTilesForPosition(grid, row, col).length === 0) {
        blockedPositions.push({ row, col })
      }
    }
  }

  return blockedPositions
}

export function autoFillGrid(
  grid: (string | null)[][]
): (string | null)[][] {
  let currentGrid = grid.map(row => [...row])
  let changed = true

  while (changed) {
    changed = false
    const numRows = currentGrid.length
    const numCols = currentGrid[0]?.length ?? 0

    for (let row = 0; row < numRows; row++) {
      for (let col = 0; col < numCols; col++) {
        if (currentGrid[row][col] !== null) continue

        const validTiles = getValidTilesForPosition(currentGrid, row, col)
        if (validTiles.length === 1) {
          currentGrid[row][col] = validTiles[0]
          changed = true
        }
      }
    }
  }

  return currentGrid
}

export function createInitialGrid(rows: number = 8, cols: number = 8): (string | null)[][] {
  const grid: (string | null)[][] = Array(rows)
    .fill(null)
    .map(() => Array(cols).fill(null))

  // Pre-place corner tiles
  grid[0][0] = '2-4'           // Top-left
  grid[0][cols - 1] = '4-6'    // Top-right
  grid[rows - 1][cols - 1] = '0-6' // Bottom-right
  grid[rows - 1][0] = '0-2'    // Bottom-left

  return grid
}
