import { useState } from 'react'
import { Plus } from 'lucide-react'
import { GRID_COLS, GRID_ROW_HEIGHT, GRID_MARGIN, getColWidth, isCellOccupied } from './gridConstants'

function BackgroundCell({ col, row, colW, onAddAt }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onAddAt(col, row)}
      style={{
        position: 'absolute',
        left: col * (colW + GRID_MARGIN) + GRID_MARGIN,
        top: row * (GRID_ROW_HEIGHT + GRID_MARGIN) + GRID_MARGIN,
        width: colW,
        height: GRID_ROW_HEIGHT,
        border: `2px dashed ${hovered ? 'var(--accent)' : 'transparent'}`,
        borderRadius: '8px',
        background: hovered ? 'var(--accent-light)' : 'transparent',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        zIndex: 1,
        pointerEvents: 'auto',
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
      }}>
        <Plus
          size={20}
          style={{
            color: 'var(--accent)',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.2s ease, transform 0.2s ease',
            transform: hovered ? 'scale(1.2)' : 'scale(1)',
            pointerEvents: 'none',
          }}
        />
        {hovered && (
          <span style={{
            fontSize: '11px',
            fontWeight: '500',
            color: 'var(--accent)',
            opacity: 0.8,
            animation: 'fadeIn 0.2s ease',
            pointerEvents: 'none',
          }}>
            Aggiungi
          </span>
        )}
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