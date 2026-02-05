// SVG path data for all 16 Cipra Loop tiles
// Each tile has 4 paths, each connecting two endpoints on adjacent edges

export const SIZE = 100
export const STROKE_WIDTH = 1

const endpointEdges = ['left', 'bottom', 'bottom', 'right', 'right', 'top', 'top', 'left']

function getCorners(size: number): Record<string, { x: number; y: number }> {
  return {
    'bottom-left': { x: 0, y: size },
    'bottom-right': { x: size, y: size },
    'top-right': { x: size, y: 0 },
    'top-left': { x: 0, y: 0 },
  }
}

function getCornerForEdges(edge1: string, edge2: string, corners: Record<string, { x: number; y: number }>) {
  const edges = [edge1, edge2].sort().join('-')
  const mapping: Record<string, { x: number; y: number }> = {
    'bottom-left': corners['bottom-left'],
    'bottom-right': corners['bottom-right'],
    'right-top': corners['top-right'],
    'left-top': corners['top-left'],
  }
  return mapping[edges]
}

const ctorData = [
  [0, 7, 4, 0], [1, 7, 4, 3], [2, 7, 3, 0], [3, 7, 3, 4],
  [4, 4, 7, 0], [5, 4, 7, 3], [6, 3, 7, 0], [7, 3, 7, 4],
  [8, 0, 4, 7], [9, 0, 4, 3], [10, 0, 3, 7], [11, 0, 3, 4],
  [12, 4, 0, 7], [13, 4, 0, 3], [14, 3, 0, 7], [15, 3, 0, 4],
]

function buildConnections(topLeft: number, topRight: number, bottomLeft: number): number[] {
  const connectsTo = new Array(8).fill(-1)
  connectsTo[6] = topLeft
  connectsTo[topLeft] = 6
  connectsTo[5] = topRight
  connectsTo[topRight] = 5
  connectsTo[1] = bottomLeft
  connectsTo[bottomLeft] = 1
  const cTo2 = 14 - topRight - topLeft - bottomLeft
  connectsTo[2] = cTo2
  connectsTo[cTo2] = 2
  return connectsTo
}

function computeSweep(
  start: { x: number; y: number },
  end: { x: number; y: number },
  corner: { x: number; y: number }
): number {
  const startAngle = Math.atan2(start.y - corner.y, start.x - corner.x)
  const endAngle = Math.atan2(end.y - corner.y, end.x - corner.x)
  let clockwiseDiff = endAngle - startAngle
  if (clockwiseDiff < 0) clockwiseDiff += 2 * Math.PI
  return clockwiseDiff <= Math.PI ? 1 : 0
}

// Get endpoint centers based on edge position parameter (0.1 to 0.4)
function getEndpointCenters(size: number, edgePosition: number) {
  const e1 = size * edgePosition
  const e2 = size * (1 - edgePosition)
  return [
    { x: 0, y: e2 },      // 0: left edge, lower
    { x: e1, y: size },   // 1: bottom edge, left
    { x: e2, y: size },   // 2: bottom edge, right
    { x: size, y: e2 },   // 3: right edge, lower
    { x: size, y: e1 },   // 4: right edge, upper
    { x: e2, y: 0 },      // 5: top edge, right
    { x: e1, y: 0 },      // 6: top edge, left
    { x: 0, y: e1 },      // 7: left edge, upper
  ]
}

function generateRibbonPath(
  fromIdx: number,
  toIdx: number,
  endpointCenters: { x: number; y: number }[],
  corners: Record<string, { x: number; y: number }>,
  ribbonHalfWidth: number
): string {
  const from = endpointCenters[fromIdx]
  const to = endpointCenters[toIdx]
  const fromEdge = endpointEdges[fromIdx]
  const toEdge = endpointEdges[toIdx]
  const corner = getCornerForEdges(fromEdge, toEdge, corners)
  const hw = ribbonHalfWidth

  let outerFrom, innerFrom, outerTo, innerTo

  if (fromEdge === 'left' || fromEdge === 'right') {
    const awayDir = from.y < corner.y ? -1 : 1
    outerFrom = { x: from.x, y: from.y + awayDir * hw }
    innerFrom = { x: from.x, y: from.y - awayDir * hw }
  } else {
    const awayDir = from.x < corner.x ? -1 : 1
    outerFrom = { x: from.x + awayDir * hw, y: from.y }
    innerFrom = { x: from.x - awayDir * hw, y: from.y }
  }

  if (toEdge === 'left' || toEdge === 'right') {
    const awayDir = to.y < corner.y ? -1 : 1
    outerTo = { x: to.x, y: to.y + awayDir * hw }
    innerTo = { x: to.x, y: to.y - awayDir * hw }
  } else {
    const awayDir = to.x < corner.x ? -1 : 1
    outerTo = { x: to.x + awayDir * hw, y: to.y }
    innerTo = { x: to.x - awayDir * hw, y: to.y }
  }

  const finalOuterRx = (fromEdge === 'top' || fromEdge === 'bottom')
    ? Math.abs(outerFrom.x - corner.x)
    : Math.abs(outerTo.x - corner.x)
  const finalOuterRy = (fromEdge === 'left' || fromEdge === 'right')
    ? Math.abs(outerFrom.y - corner.y)
    : Math.abs(outerTo.y - corner.y)

  const finalInnerRx = (fromEdge === 'top' || fromEdge === 'bottom')
    ? Math.abs(innerFrom.x - corner.x)
    : Math.abs(innerTo.x - corner.x)
  const finalInnerRy = (fromEdge === 'left' || fromEdge === 'right')
    ? Math.abs(innerFrom.y - corner.y)
    : Math.abs(innerTo.y - corner.y)

  const sweepOuter = computeSweep(outerFrom, outerTo, corner)
  const sweepInner = 1 - sweepOuter

  return [
    `M ${outerFrom.x.toFixed(2)} ${outerFrom.y.toFixed(2)}`,
    `A ${finalOuterRx.toFixed(2)} ${finalOuterRy.toFixed(2)} 0 0 ${sweepOuter} ${outerTo.x.toFixed(2)} ${outerTo.y.toFixed(2)}`,
    `L ${innerTo.x.toFixed(2)} ${innerTo.y.toFixed(2)}`,
    `A ${finalInnerRx.toFixed(2)} ${finalInnerRy.toFixed(2)} 0 0 ${sweepInner} ${innerFrom.x.toFixed(2)} ${innerFrom.y.toFixed(2)}`,
    'Z'
  ].join(' ')
}

export interface TilePath {
  d: string
  endpoints: [number, number]  // [fromEndpoint, toEndpoint]
}

export interface TileData {
  paths: TilePath[]
}

function generateTileData(
  tileIndex: number,
  endpointCenters: { x: number; y: number }[],
  corners: Record<string, { x: number; y: number }>,
  ribbonHalfWidth: number
): TileData {
  const [, topLeft, topRight, bottomLeft] = ctorData[tileIndex]
  const connections = buildConnections(topLeft, topRight, bottomLeft)

  const paths: TilePath[] = []
  const visited = new Set<number>()

  for (let i = 0; i < 8; i++) {
    if (visited.has(i)) continue
    const j = connections[i]
    visited.add(i)
    visited.add(j)

    const d = generateRibbonPath(i, j, endpointCenters, corners, ribbonHalfWidth)
    paths.push({ d, endpoints: [i, j] })
  }

  return { paths }
}

// Generate all 16 tiles with given parameters
// edgePosition: 0.1 to 0.4 (fraction of edge from corner to endpoint center)
// ribbonWidth: 0.05 to 0.5 (fraction of tile size for ribbon width)
export function generateAllTileData(edgePosition: number, ribbonWidth: number): TileData[] {
  const endpointCenters = getEndpointCenters(SIZE, edgePosition)
  const corners = getCorners(SIZE)
  const ribbonHalfWidth = (SIZE * ribbonWidth) / 2

  return Array.from({ length: 16 }, (_, i) =>
    generateTileData(i, endpointCenters, corners, ribbonHalfWidth)
  )
}

// Default tile data for backwards compatibility
export const TILE_DATA: TileData[] = generateAllTileData(1/3, 0.16)
