import { useState, useMemo, useEffect, useRef } from "react"
import styles from "./CelticKnotsPuzzle.module.css"
import {
  CORNER_TILES,
  createInitialGrid,
  getAllValidPositions,
  getBlockedPositions,
  getValidTilesForPosition,
  autoFillGrid,
} from "./celticKnotsLogic"

const SIZE_OPTIONS = [4, 6, 8, 10, 12, 14, 16]
const DEFAULT_ROWS = 8
const DEFAULT_COLS = 8

export default function CelticKnotsPuzzle() {
  const [rows, setRows] = useState(DEFAULT_ROWS)
  const [cols, setCols] = useState(DEFAULT_COLS)
  const [grid, setGrid] = useState<(string | null)[][]>(() =>
    autoFillGrid(createInitialGrid(DEFAULT_ROWS, DEFAULT_COLS))
  )
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null)
  const [history, setHistory] = useState<(string | null)[][][]>([])
  const [redoStack, setRedoStack] = useState<(string | null)[][][]>([])
  const popupRef = useRef<HTMLDivElement>(null)

  const validPositions = useMemo(() => {
    const positions = getAllValidPositions(grid)
    return new Set(positions.map(p => `${p.row}-${p.col}`))
  }, [grid])

  const blockedPositions = useMemo(() => {
    const positions = getBlockedPositions(grid)
    return new Set(positions.map(p => `${p.row}-${p.col}`))
  }, [grid])

  const activeCellTiles = useMemo(() => {
    if (!activeCell) return []
    return getValidTilesForPosition(grid, activeCell.row, activeCell.col)
  }, [grid, activeCell])

  // Close popup when clicking outside
  useEffect(() => {
    if (!activeCell) return

    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setActiveCell(null)
      }
    }

    // Delay adding listener to avoid immediate trigger from the click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [activeCell])

  const handleRowsChange = (newRows: number) => {
    setRows(newRows)
    setGrid(autoFillGrid(createInitialGrid(newRows, cols)))
    setActiveCell(null)
    setHistory([])
    setRedoStack([])
  }

  const handleColsChange = (newCols: number) => {
    setCols(newCols)
    setGrid(autoFillGrid(createInitialGrid(rows, newCols)))
    setActiveCell(null)
    setHistory([])
    setRedoStack([])
  }

  const handleCellClick = (row: number, col: number) => {
    const posKey = `${row}-${col}`

    // If clicking a valid empty cell, toggle popup
    if (validPositions.has(posKey)) {
      if (activeCell?.row === row && activeCell?.col === col) {
        setActiveCell(null)
      } else {
        setActiveCell({ row, col })
      }
    }
  }

  const handleTileSelect = (tileId: string) => {
    if (!activeCell) return
    // Save current grid to history before making changes
    setHistory(prev => [...prev, grid.map(r => [...r])])
    // Clear redo stack since we're branching off
    setRedoStack([])
    setGrid(prev => {
      const newGrid = prev.map(r => [...r])
      newGrid[activeCell.row][activeCell.col] = tileId
      return autoFillGrid(newGrid)
    })
    setActiveCell(null)
  }

  const handleUndo = () => {
    if (history.length === 0) return
    const previousGrid = history[history.length - 1]
    // Save current grid to redo stack
    setRedoStack(prev => [...prev, grid.map(r => [...r])])
    setHistory(prev => prev.slice(0, -1))
    setGrid(previousGrid)
    setActiveCell(null)
  }

  const handleRedo = () => {
    if (redoStack.length === 0) return
    const nextGrid = redoStack[redoStack.length - 1]
    // Save current grid to history
    setHistory(prev => [...prev, grid.map(r => [...r])])
    setRedoStack(prev => prev.slice(0, -1))
    setGrid(nextGrid)
    setActiveCell(null)
  }

  const handleClear = () => {
    setGrid(autoFillGrid(createInitialGrid(rows, cols)))
    setActiveCell(null)
    setHistory([])
    setRedoStack([])
  }

  const handleSaveGrid = async () => {
    const gridState = {
      rows,
      cols,
      tiles: grid.flatMap((row, rowIndex) =>
        row.map((tileId, colIndex) =>
          tileId ? { row: rowIndex, col: colIndex, tile: tileId } : null
        ).filter(Boolean)
      )
    }
    const json = JSON.stringify(gridState, null, 2)
    const blob = new Blob([json], { type: 'application/json' })

    // Try modern File System Access API first
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'celtic-knot.json',
          types: [{
            description: 'JSON files',
            accept: { 'application/json': ['.json'] }
          }]
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        return
      } catch {
        // User cancelled or API failed, fall through to download
      }
    }

    // Fallback: trigger download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'celtic-knot.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const loadGridFromText = (text: string) => {
    try {
      const parsed = JSON.parse(text)

      // Validate structure
      if (typeof parsed.rows !== 'number' || typeof parsed.cols !== 'number' || !Array.isArray(parsed.tiles)) {
        return
      }

      // Create new grid
      const newRows = parsed.rows
      const newCols = parsed.cols
      const newGrid: (string | null)[][] = Array(newRows)
        .fill(null)
        .map(() => Array(newCols).fill(null))

      // Place tiles
      for (const entry of parsed.tiles) {
        if (typeof entry.row === 'number' && typeof entry.col === 'number' && typeof entry.tile === 'string') {
          if (entry.row >= 0 && entry.row < newRows && entry.col >= 0 && entry.col < newCols) {
            newGrid[entry.row][entry.col] = entry.tile
          }
        }
      }

      setRows(newRows)
      setCols(newCols)
      setGrid(newGrid)
      setActiveCell(null)
      setHistory([])
      setRedoStack([])
    } catch {
      // Fail gracefully
    }
  }

  const handleLoadGrid = async () => {
    // Try modern File System Access API first
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'JSON files',
            accept: { 'application/json': ['.json'] }
          }]
        })
        const file = await handle.getFile()
        const text = await file.text()
        loadGridFromText(text)
        return
      } catch {
        // User cancelled or API failed
        return
      }
    }

    // Fallback: use file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (file) {
        const text = await file.text()
        loadGridFromText(text)
      }
    }
    input.click()
  }

  const getTileImagePath = (tileId: string) => {
    return `/img/celtic-knots/numbered-connections/${tileId}.webp`
  }

  const getPopupPosition = (row: number, col: number) => {
    const isRightHalf = col >= cols / 2
    const isBottomHalf = row >= rows / 2
    return {
      horizontal: isRightHalf ? 'left' : 'right',
      vertical: isBottomHalf ? 'above' : 'below',
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.sizeControls}>
        <label className={styles.sizeLabel}>
          Rows:
          <select
            value={rows}
            onChange={(e) => handleRowsChange(Number(e.target.value))}
            className={styles.sizeSelect}
          >
            {SIZE_OPTIONS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className={styles.sizeLabel}>
          Columns:
          <select
            value={cols}
            onChange={(e) => handleColsChange(Number(e.target.value))}
            className={styles.sizeSelect}
          >
            {SIZE_OPTIONS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <button className={`${styles.controlButton} ${styles.clearButton}`} onClick={handleClear} title="Clear all tiles">
          Clear
        </button>
      </div>

      <div className={styles.gridWrapper}>
        <div
          className={styles.grid}
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {grid.map((row, rowIndex) =>
            row.map((tileId, colIndex) => {
              const posKey = `${rowIndex}-${colIndex}`
              const isValid = validPositions.has(posKey)
              const isBlocked = blockedPositions.has(posKey)
              const isActive = activeCell?.row === rowIndex && activeCell?.col === colIndex
              const isCorner = tileId && CORNER_TILES.includes(tileId)
              const popupPos = getPopupPosition(rowIndex, colIndex)

              return (
                <div
                  key={posKey}
                  className={`${styles.cell} ${isValid ? styles.validCell : ''} ${isBlocked ? styles.blockedCell : ''} ${isActive ? styles.activeCell : ''} ${isCorner ? styles.cornerCell : ''}`}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  {tileId && (
                    <img
                      src={getTileImagePath(tileId)}
                      alt={`Tile ${tileId}`}
                      className={styles.tileImage}
                      draggable={false}
                    />
                  )}
                  {isActive && activeCellTiles.length > 0 && (
                    <div
                      ref={popupRef}
                      className={`${styles.popup} ${styles[`popup-${popupPos.horizontal}`]} ${styles[`popup-${popupPos.vertical}`]}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {activeCellTiles.map(id => (
                        <div
                          key={id}
                          className={styles.popupTile}
                          onClick={() => handleTileSelect(id)}
                        >
                          <img
                            src={getTileImagePath(id)}
                            alt={`Tile ${id}`}
                            className={styles.popupTileImage}
                            draggable={false}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.buttonGroup}>
          <button
            className={styles.controlButton}
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Undo"
          >
            <span className={styles.buttonIcon}>↩</span> Undo
          </button>
          <button
            className={styles.controlButton}
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            title="Redo"
          >
            Redo <span className={styles.buttonIcon}>↪</span>
          </button>
        </div>
        <div className={styles.buttonGroup}>
          <button className={styles.controlButton} onClick={handleSaveGrid} title="Save grid to clipboard">
            Save
          </button>
          <button className={styles.controlButton} onClick={handleLoadGrid} title="Load grid from clipboard">
            Load
          </button>
        </div>
      </div>

      <div className={styles.instructions}>
        <p><strong>How to play:</strong></p>
        <ul>
          <li>Green cells show where tiles can be placed</li>
          <li>Click a green cell to see available tiles</li>
          <li>Click a tile in the popup to place it</li>
          <li>Click a placed tile to remove it (corner tiles are fixed)</li>
        </ul>
      </div>
    </div>
  )
}
