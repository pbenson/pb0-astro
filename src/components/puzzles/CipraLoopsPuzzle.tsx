import { useState, useMemo, useEffect, useRef } from "react"
import styles from "./CipraLoopsPuzzle.module.css"
import type { ColorMode } from "./cipraLogic"
import { getAllLoops, getEndpointToLoopMap, getPathColor, getLoopIndexColor, getLoopColor } from "./cipraLogic"
import type { TileData } from "./cipraPathData"
import { generateAllTileData, SIZE, STROKE_WIDTH } from "./cipraPathData"

const GRID_SIZE = 4
const TILE_COUNT = 16
const SWAP_DURATION_MS = 1000

interface SwapAnimation {
  from: number
  to: number
  progress: 'starting' | 'animating' | 'done'
}

interface ShuffleAnimation {
  // Maps old grid position to new grid position
  moves: Map<number, number>
  progress: 'starting' | 'animating' | 'done'
}

export default function CipraLoopsPuzzle() {
  const gridRef = useRef<HTMLDivElement>(null)
  const [tileSize, setTileSize] = useState(100)
  const [tilePositions, setTilePositions] = useState<number[]>(
    Array.from({ length: TILE_COUNT }, (_, i) => i)
  )
  const [selectedTile, setSelectedTile] = useState<number | null>(null)
  const [highlightedLoop, setHighlightedLoop] = useState<number | null>(null)
  const [swapAnimation, setSwapAnimation] = useState<SwapAnimation | null>(null)
  const [shuffleAnimation, setShuffleAnimation] = useState<ShuffleAnimation | null>(null)
  const [colorMode, setColorMode] = useState<ColorMode>('byLength')
  const [showPathDensity, setShowPathDensity] = useState(false)
  const [showTileNumbers, setShowTileNumbers] = useState(false)
  const [ribbonWidth, setRibbonWidth] = useState(0.2)

  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  const tileData = useMemo(() => generateAllTileData(1/3, ribbonWidth), [ribbonWidth])

  const loops = useMemo(() => getAllLoops(tilePositions), [tilePositions])

  const endpointToLoop = useMemo(() => getEndpointToLoopMap(tilePositions), [tilePositions])

  // Loops sorted by length, preserving original index for highlighting
  const sortedLoops = useMemo(() => {
    return loops
      .map((loop, index) => ({ loop, index }))
      .sort((a, b) => a.loop.length - b.loop.length)
  }, [loops])

  // Count paths in each tile that belong to the highlighted loop
  const getHighlightedPathCount = (gridPos: number, tileIndex: number): number => {
    if (highlightedLoop === null) return 0
    const tile = tileData[tileIndex]
    let count = 0
    for (const path of tile.paths) {
      const key = `${gridPos}-${path.endpoints[0]}`
      if (endpointToLoop.get(key) === highlightedLoop) {
        count++
      }
    }
    return count
  }

  // Background color based on number of highlighted paths: 0=transparent, 1=85%, 2=70%, 3=55%, 4=40% white
  const getBackgroundColor = (pathCount: number): string => {
    if (!showPathDensity || pathCount === 0) return 'transparent'
    const grayLevels = [255, 217, 179, 140, 102] // 0, 1, 2, 3, 4 paths (85%, 70%, 55%, 40%)
    const gray = grayLevels[pathCount] || 102
    return `rgb(${gray}, ${gray}, ${gray})`
  }

  // Measure grid and update tile size on resize
  useEffect(() => {
    const updateTileSize = () => {
      if (gridRef.current) {
        const gridWidth = gridRef.current.offsetWidth
        setTileSize(gridWidth / GRID_SIZE)
      }
    }
    updateTileSize()
    window.addEventListener('resize', updateTileSize)
    return () => window.removeEventListener('resize', updateTileSize)
  }, [])

  const renderTileSvg = (tileIndex: number, gridPos: number, forAnimation = false) => {
    const tile = tileData[tileIndex]
    const highlightedCount = getHighlightedPathCount(gridPos, tileIndex)
    const bgColor = getBackgroundColor(highlightedCount)
    return (
      <svg
        width={forAnimation ? tileSize : '100%'}
        height={forAnimation ? tileSize : '100%'}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          width={SIZE}
          height={SIZE}
          fill={bgColor}
        />
        {tile.paths.map((path, pathIndex) => {
          const key = `${gridPos}-${path.endpoints[0]}`
          const pathLoopIndex = endpointToLoop.get(key)
          const isHighlightedPath = highlightedLoop === null || pathLoopIndex === highlightedLoop
          const fillColor = isHighlightedPath
            ? getPathColor(loops, endpointToLoop, gridPos, path.endpoints, colorMode)
            : 'rgb(128, 128, 128)'
          return (
            <path
              key={pathIndex}
              d={path.d}
              fill={fillColor}
              stroke="black"
              strokeWidth={STROKE_WIDTH}
            />
          )
        })}
        <rect
          width={SIZE}
          height={SIZE}
          fill="none"
          stroke="black"
          strokeWidth={STROKE_WIDTH}
        />
        {showTileNumbers && (
          <text
            x={SIZE - 3}
            y={SIZE - 3}
            textAnchor="end"
            fontSize="12"
            fontFamily="monospace"
            fill="rgba(0,0,0,0.5)"
          >
            {tileIndex.toString(2).padStart(4, '0')}
          </text>
        )}
      </svg>
    )
  }

  const getGridCoords = (index: number) => {
    const col = index % GRID_SIZE
    const row = Math.floor(index / GRID_SIZE)
    return { x: col * tileSize, y: row * tileSize }
  }

  // Start animation after initial render
  useEffect(() => {
    if (swapAnimation?.progress === 'starting') {
      requestAnimationFrame(() => {
        setSwapAnimation(prev => prev ? { ...prev, progress: 'animating' } : null)
      })
    }
  }, [swapAnimation?.progress])

  useEffect(() => {
    if (shuffleAnimation?.progress === 'starting') {
      requestAnimationFrame(() => {
        setShuffleAnimation(prev => prev ? { ...prev, progress: 'animating' } : null)
      })
    }
  }, [shuffleAnimation?.progress])

  const handleTileClick = (gridPosition: number) => {
    if (swapAnimation !== null || shuffleAnimation !== null) return

    if (selectedTile === null) {
      setSelectedTile(gridPosition)
    } else if (selectedTile === gridPosition) {
      setSelectedTile(null)
    } else {
      const fromPos = selectedTile
      const toPos = gridPosition

      setSwapAnimation({ from: fromPos, to: toPos, progress: 'starting' })
      setSelectedTile(null)
      setHighlightedLoop(null)

      setTimeout(() => {
        setTilePositions(prev => {
          const newPositions = [...prev]
          const temp = newPositions[fromPos]
          newPositions[fromPos] = newPositions[toPos]
          newPositions[toPos] = temp
          return newPositions
        })
        setSwapAnimation(null)
      }, SWAP_DURATION_MS)
    }
  }

  const handleLoopClick = (loopIndex: number) => {
    setHighlightedLoop(highlightedLoop === loopIndex ? null : loopIndex)
  }

  const handleShuffle = () => {
    if (swapAnimation !== null || shuffleAnimation !== null) return

    // Create shuffled positions
    const shuffled = [...tilePositions]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Build moves map: for each tile, find where it moves from and to
    // We need to map: old grid position -> new grid position
    // tilePositions[gridPos] = tileIndex
    // We want to know: for each gridPos, what gridPos does its tile end up at?
    const moves = new Map<number, number>()
    for (let oldGridPos = 0; oldGridPos < TILE_COUNT; oldGridPos++) {
      const tileIndex = tilePositions[oldGridPos]
      // Find where this tile ends up in shuffled
      const newGridPos = shuffled.indexOf(tileIndex)
      if (oldGridPos !== newGridPos) {
        moves.set(oldGridPos, newGridPos)
      }
    }

    if (moves.size === 0) {
      // Nothing moved, shuffle again
      handleShuffle()
      return
    }

    setShuffleAnimation({ moves, progress: 'starting' })
    setSelectedTile(null)
    setHighlightedLoop(null)

    setTimeout(() => {
      setTilePositions(shuffled)
      setShuffleAnimation(null)
    }, SWAP_DURATION_MS)
  }

  const isSwapping = (gridPosition: number) => {
    if (swapAnimation && (gridPosition === swapAnimation.from || gridPosition === swapAnimation.to)) {
      return true
    }
    if (shuffleAnimation && shuffleAnimation.moves.has(gridPosition)) {
      return true
    }
    return false
  }

  return (
    <div className={styles.container}>
      <div
        ref={gridRef}
        className={styles.grid}
      >
        {/* Regular tiles (hidden during swap) */}
        {tilePositions.map((tileIndex, gridPosition) => (
          <div
            key={gridPosition}
            className={`${styles.tile} ${selectedTile === gridPosition ? styles.selected : ''}`}
            style={{ visibility: isSwapping(gridPosition) ? 'hidden' : 'visible' }}
            onClick={() => handleTileClick(gridPosition)}
          >
            {renderTileSvg(tileIndex, gridPosition)}
          </div>
        ))}

        {/* Animated overlay tiles */}
        {swapAnimation && (
          <>
            <div
              className={styles.animatingTile}
              style={{
                width: tileSize,
                height: tileSize,
                left: swapAnimation.progress === 'animating'
                  ? getGridCoords(swapAnimation.to).x
                  : getGridCoords(swapAnimation.from).x,
                top: swapAnimation.progress === 'animating'
                  ? getGridCoords(swapAnimation.to).y
                  : getGridCoords(swapAnimation.from).y,
                transition: swapAnimation.progress === 'animating'
                  ? `left ${SWAP_DURATION_MS}ms ease-in-out, top ${SWAP_DURATION_MS}ms ease-in-out`
                  : 'none',
              }}
            >
              {renderTileSvg(tilePositions[swapAnimation.from], swapAnimation.from, true)}
            </div>
            <div
              className={styles.animatingTile}
              style={{
                width: tileSize,
                height: tileSize,
                left: swapAnimation.progress === 'animating'
                  ? getGridCoords(swapAnimation.from).x
                  : getGridCoords(swapAnimation.to).x,
                top: swapAnimation.progress === 'animating'
                  ? getGridCoords(swapAnimation.from).y
                  : getGridCoords(swapAnimation.to).y,
                transition: swapAnimation.progress === 'animating'
                  ? `left ${SWAP_DURATION_MS}ms ease-in-out, top ${SWAP_DURATION_MS}ms ease-in-out`
                  : 'none',
              }}
            >
              {renderTileSvg(tilePositions[swapAnimation.to], swapAnimation.to, true)}
            </div>
          </>
        )}

        {/* Shuffle animated overlay tiles */}
        {shuffleAnimation && (
          <>
            {Array.from(shuffleAnimation.moves.entries()).map(([fromGridPos, toGridPos]) => (
              <div
                key={fromGridPos}
                className={styles.animatingTile}
                style={{
                  width: tileSize,
                  height: tileSize,
                  left: shuffleAnimation.progress === 'animating'
                    ? getGridCoords(toGridPos).x
                    : getGridCoords(fromGridPos).x,
                  top: shuffleAnimation.progress === 'animating'
                    ? getGridCoords(toGridPos).y
                    : getGridCoords(fromGridPos).y,
                  transition: shuffleAnimation.progress === 'animating'
                    ? `left ${SWAP_DURATION_MS}ms ease-in-out, top ${SWAP_DURATION_MS}ms ease-in-out`
                    : 'none',
                }}
              >
                {renderTileSvg(tilePositions[fromGridPos], fromGridPos, true)}
              </div>
            ))}
          </>
        )}
      </div>

      <button className={styles.shuffleButton} onClick={handleShuffle}>
        Shuffle
      </button>

      <div className={styles.loopInfo}>
        <span className={styles.loopLabel}>Loops:</span>
        {sortedLoops.map(({ loop, index }) => {
          const loopColor = colorMode === 'byLoop'
            ? getLoopIndexColor(index)
            : getLoopColor(loop.length)
          return (
            <button
              key={index}
              className={`${styles.loopSize} ${highlightedLoop === index ? styles.loopSelected : ''}`}
              onClick={() => handleLoopClick(index)}
            >
              <span
                className={styles.colorSwatch}
                style={{ backgroundColor: loopColor }}
              />
              {loop.length}
            </button>
          )
        })}
      </div>

      <div className={styles.colorModeToggle}>
        <label>
          <input
            type="radio"
            name="colorMode"
            checked={colorMode === 'byLength'}
            onChange={() => setColorMode('byLength')}
          />
          Color by length
        </label>
        <label>
          <input
            type="radio"
            name="colorMode"
            checked={colorMode === 'byLoop'}
            onChange={() => setColorMode('byLoop')}
          />
          Color by loop
        </label>
      </div>

      <label className={`${styles.checkbox} ${highlightedLoop === null ? styles.disabled : ''}`}>
        <input
          type="checkbox"
          checked={showPathDensity}
          onChange={(e) => setShowPathDensity(e.target.checked)}
          disabled={highlightedLoop === null}
        />
        Show path density
      </label>

      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={showTileNumbers}
          onChange={(e) => setShowTileNumbers(e.target.checked)}
        />
        Show tile numbers
      </label>

      {isLocalhost && (
        <div className={styles.sliderGroup}>
          <label className={styles.sliderLabel}>
            Ribbon width
            <input
              type="range"
              min="0.05"
              max="0.33"
              step="0.01"
              value={ribbonWidth}
              onChange={(e) => setRibbonWidth(parseFloat(e.target.value))}
              className={styles.slider}
            />
          </label>
        </div>
      )}
    </div>
  )
}
