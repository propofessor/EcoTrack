import { Plus } from 'lucide-react'
import { GRID_COLS, GRID_ROW_HEIGHT, GRID_MARGIN, getColWidth, isCellOccupied } from './gridConstants'

function BackgroundCell({ col, row, colW, onAddAt }) {
  return (
    <div
      onClick={() => onAddAt(col, row)}
      className='grid-bg-cell flex items-center justify-center'
      style={{
        left: col * (colW + GRID_MARGIN) + GRID_MARGIN,
        top: row * (GRID_ROW_HEIGHT + GRID_MARGIN) + GRID_MARGIN,
        width: colW,
        height: GRID_ROW_HEIGHT,
      }}
    >
      <div className='flex flex-col items-center gap-1'>
        <Plus size={20} className='grid-bg-cell-icon' />
        <span className='grid-bg-cell-label'>Aggiungi</span>
      </div>
    </div>
  )
}

export function GridBackground({ layout, containerWidth, rows, onAddAt }) {
  if (!containerWidth) return null

  const colW = getColWidth(containerWidth)

  // Find the first available cell to add a widget
  let nextAvailableCell = null
  for (let row = 0; row < rows && !nextAvailableCell; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (!isCellOccupied(col, row, layout)) {
        nextAvailableCell = { col, row }
        break
      }
    }
  }

  if (!nextAvailableCell) return null

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <BackgroundCell
        col={nextAvailableCell.col}
        row={nextAvailableCell.row}
        colW={colW}
        onAddAt={onAddAt}
      />
    </div>
  )
}
