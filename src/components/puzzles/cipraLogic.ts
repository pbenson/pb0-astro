// Cipra Loops path-following logic with toroidal wrapping

const GRID_SIZE = 4

// Endpoint numbering (counterclockwise from bottom-left):
//       6   5
//     ________
//     |      |
//  7  |      |  4
//     |      |
//  0  |      |  3
//     |________|
//       1   2

// Edge assignments:
// Left edge: 0, 7
// Bottom edge: 1, 2
// Right edge: 3, 4
// Top edge: 5, 6

// Maps exit endpoint to entry endpoint on adjacent tile
export const NEXT_TILE_INDICES = [3, 6, 5, 0, 7, 2, 1, 4]

// Tile connectivity: for each tile (0-15), maps endpoint to connected endpoint
// Binary tile naming: [left, top, right, bottom] - 1 means paths cross on that edge
// Derived from CipraTile.java
const TILE_CONNECTIONS: number[][] = [
  // Tile 0 (0000): no crossings
  [7, 4, 3, 2, 1, 6, 5, 0],
  // Tile 1 (0001): bottom crossing
  [7, 3, 4, 1, 2, 6, 5, 0],
  // Tile 2 (0010): right crossing
  [7, 4, 3, 2, 1, 6, 5, 0], // placeholder - recalculate
  // ... etc
]

// Build tile connections from the Java constructor pattern
function buildTileConnections(): number[][] {
  // From CipraTile.java:
  // ctorData: [tileIndex, topLeft, topRight, bottomLeft]
  // where topLeft = endpoint that connects to endpoint 6
  //       topRight = endpoint that connects to endpoint 5
  //       bottomLeft = endpoint that connects to endpoint 1
  const ctorData = [
    [0, 7, 4, 0],
    [1, 7, 4, 3],
    [2, 7, 3, 0],
    [3, 7, 3, 4],
    [4, 4, 7, 0],
    [5, 4, 7, 3],
    [6, 3, 7, 0],
    [7, 3, 7, 4],
    [8, 0, 4, 7],
    [9, 0, 4, 3],
    [10, 0, 3, 7],
    [11, 0, 3, 4],
    [12, 4, 0, 7],
    [13, 4, 0, 3],
    [14, 3, 0, 7],
    [15, 3, 0, 4],
  ]

  const tiles: number[][] = []

  for (const [tileIndex, topLeft, topRight, bottomLeft] of ctorData) {
    const connectsTo = new Array(8).fill(-1)

    // Set the three specified connections (bidirectional)
    connectsTo[6] = topLeft
    connectsTo[topLeft] = 6
    connectsTo[5] = topRight
    connectsTo[topRight] = 5
    connectsTo[1] = bottomLeft
    connectsTo[bottomLeft] = 1

    // Fourth connection: endpoint 2 connects to the remaining endpoint
    // Sum of all endpoints = 0+1+2+3+4+5+6+7 = 28
    // Used endpoints: 6, topLeft, 5, topRight, 1, bottomLeft = 12 + topLeft + topRight + bottomLeft
    // Remaining two endpoints sum to 28 - 12 - topLeft - topRight - bottomLeft = 16 - topLeft - topRight - bottomLeft
    // One of them is 2, so the other is 14 - topLeft - topRight - bottomLeft
    const cTo2 = 14 - topRight - topLeft - bottomLeft
    connectsTo[2] = cTo2
    connectsTo[cTo2] = 2

    tiles[tileIndex] = connectsTo
  }

  return tiles
}

export const TILE_CONNECTIONS_MAP = buildTileConnections()

// Get the tile index at a grid position, with toroidal wrapping
export function getAdjacentTilePosition(
  currentPos: number,
  exitEndpoint: number
): number {
  const col = currentPos % GRID_SIZE
  const row = Math.floor(currentPos / GRID_SIZE)

  let newCol = col
  let newRow = row

  // Determine direction based on exit endpoint
  if (exitEndpoint === 0 || exitEndpoint === 7) {
    // Exiting left edge → move left (wrap from col 0 to col 3)
    newCol = col > 0 ? col - 1 : GRID_SIZE - 1
  } else if (exitEndpoint === 1 || exitEndpoint === 2) {
    // Exiting bottom edge → move down (wrap from row 3 to row 0)
    newRow = (row + 1) % GRID_SIZE
  } else if (exitEndpoint === 3 || exitEndpoint === 4) {
    // Exiting right edge → move right (wrap from col 3 to col 0)
    newCol = (col + 1) % GRID_SIZE
  } else {
    // exitEndpoint === 5 || exitEndpoint === 6
    // Exiting top edge → move up (wrap from row 0 to row 3)
    newRow = row > 0 ? row - 1 : GRID_SIZE - 1
  }

  return newRow * GRID_SIZE + newCol
}

// Follow a path from a starting point, return the loop size (number of tile visits)
export function traceLoop(
  tilePositions: number[],
  startGridPos: number,
  startEndpoint: number
): number[] {
  const visited: number[] = []
  let currentGridPos = startGridPos
  let currentEndpoint = startEndpoint

  do {
    visited.push(currentGridPos)

    // Get the tile at current position
    const tileIndex = tilePositions[currentGridPos]

    // Find where this endpoint connects to within the tile
    const exitEndpoint = TILE_CONNECTIONS_MAP[tileIndex][currentEndpoint]

    // Move to adjacent tile
    const nextGridPos = getAdjacentTilePosition(currentGridPos, exitEndpoint)

    // Entry endpoint on the new tile
    const entryEndpoint = NEXT_TILE_INDICES[exitEndpoint]

    currentGridPos = nextGridPos
    currentEndpoint = entryEndpoint
  } while (currentGridPos !== startGridPos || currentEndpoint !== startEndpoint)

  return visited
}

// Get all unique loops for a given tile configuration
export function getAllLoops(tilePositions: number[]): number[][] {
  const visited = new Set<string>()
  const loops: number[][] = []

  // Try starting from each tile and each endpoint
  for (let gridPos = 0; gridPos < 16; gridPos++) {
    for (let endpoint = 0; endpoint < 8; endpoint++) {
      const key = `${gridPos}-${endpoint}`
      if (visited.has(key)) continue

      const loop = traceLoop(tilePositions, gridPos, endpoint)

      // Mark all points in this loop as visited (both entry and exit endpoints)
      let pos = gridPos
      let ep = endpoint
      for (let i = 0; i < loop.length; i++) {
        visited.add(`${pos}-${ep}`)
        const tileIndex = tilePositions[pos]
        const exitEp = TILE_CONNECTIONS_MAP[tileIndex][ep]
        visited.add(`${pos}-${exitEp}`)
        pos = getAdjacentTilePosition(pos, exitEp)
        ep = NEXT_TILE_INDICES[exitEp]
      }

      loops.push(loop)
    }
  }

  return loops
}

// Color palette for loop lengths (4, 8, 12, ..., 64)
// Warm-to-cool gradient: short loops are warm (orange/yellow), long loops are cool (blue/purple)
export const LOOP_COLORS: Record<number, string> = {
  4: '#f59e0b',   // amber
  8: '#f97316',   // orange
  12: '#ef4444',  // red
  16: '#ec4899',  // pink
  20: '#d946ef',  // fuchsia
  24: '#a855f7',  // purple
  28: '#8b5cf6',  // violet
  32: '#6366f1',  // indigo
  36: '#3b82f6',  // blue
  40: '#0ea5e9',  // sky
  44: '#06b6d4',  // cyan
  48: '#14b8a6',  // teal
  52: '#10b981',  // emerald
  56: '#22c55e',  // green
  60: '#84cc16',  // lime
  64: '#65a30d',  // lime-dark
}

export function getLoopColor(loopLength: number): string {
  return LOOP_COLORS[loopLength] || '#cccccc'
}

// Tableau10 palette for individual loops (designed for data visualization)
const LOOP_INDEX_COLORS = [
  '#4e79a7', // blue
  '#f28e2b', // orange
  '#e15759', // red
  '#76b7b2', // teal
  '#59a14f', // green
  '#edc948', // yellow
  '#b07aa1', // purple
  '#ff9da7', // pink
  '#9c755f', // brown
  '#bab0ac', // gray
]

export function getLoopIndexColor(loopIndex: number): string {
  return LOOP_INDEX_COLORS[loopIndex % LOOP_INDEX_COLORS.length]
}

// Map each (gridPos, endpoint) to its loop index
export function getEndpointToLoopMap(tilePositions: number[]): Map<string, number> {
  const loops = getAllLoops(tilePositions)
  const endpointToLoop = new Map<string, number>()

  loops.forEach((loop, loopIndex) => {
    // Trace through the loop to mark all endpoints
    let gridPos = loop[0]
    // Find starting endpoint by trying each one
    for (let startEndpoint = 0; startEndpoint < 8; startEndpoint++) {
      const traced = traceLoop(tilePositions, gridPos, startEndpoint)
      if (traced.length === loop.length && traced.every((p, i) => p === loop[i])) {
        // Found the right starting endpoint, now trace and mark all
        let pos = gridPos
        let ep = startEndpoint
        for (let i = 0; i < loop.length; i++) {
          endpointToLoop.set(`${pos}-${ep}`, loopIndex)
          const tileIndex = tilePositions[pos]
          const exitEp = TILE_CONNECTIONS_MAP[tileIndex][ep]
          endpointToLoop.set(`${pos}-${exitEp}`, loopIndex)
          pos = getAdjacentTilePosition(pos, exitEp)
          ep = NEXT_TILE_INDICES[exitEp]
        }
        break
      }
    }
  })

  return endpointToLoop
}

export type ColorMode = 'byLength' | 'byLoop'

// Get color for a specific path on a tile at a grid position
export function getPathColor(
  loops: number[][],
  endpointToLoop: Map<string, number>,
  gridPos: number,
  endpoints: [number, number],
  colorMode: ColorMode = 'byLength'
): string {
  const key = `${gridPos}-${endpoints[0]}`
  const loopIndex = endpointToLoop.get(key)
  if (loopIndex === undefined) return '#cccccc'

  if (colorMode === 'byLoop') {
    return getLoopIndexColor(loopIndex)
  }
  const loopLength = loops[loopIndex].length
  return getLoopColor(loopLength)
}
