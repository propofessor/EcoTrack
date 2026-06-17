import { useState } from 'react'
import { Plus } from 'lucide-react'
import { GRID_ROW_HEIGHT, GRID_MARGIN } from '../layout/gridConstants'

export function AddWidgetButton({ col, row, colWidth, onAdd }) {
  const [hovered, setHovered] = useState(false)

  const left = col * (colWidth + GRID_MARGIN) + GRID_MARGIN
  const top = row * (GRID_ROW_HEIGHT + GRID_MARGIN) + GRID_MARGIN
  
  // Geometria corretta: 1 solo margine interno tra le 2 colonne/righe
  const width = colWidth * 2 + GRID_MARGIN 
  const height = GRID_ROW_HEIGHT * 2 + GRID_MARGIN

  return (
    <div
      onClick={onAdd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        border: `3px dashed ${hovered ? 'var(--accent)' : '#999'}`,
        borderRadius: '12px',
        background: hovered ? 'rgba(var(--accent-rgb), 0.1)' : 'transparent',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        gap: '6px',
        transition: 'all 0.2s ease',
        zIndex: 100,
        pointerEvents: 'auto',
      }}
    >
      <Plus
        size={24}
        style={{
          color: 'var(--accent)',
          opacity: hovered ? 1 : 0.4,
          transition: 'opacity 0.2s ease',
        }}
      />
      {hovered && (
        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)' }}>
          Aggiungi {col},{row}
        </span>
      )}
    </div>
  )
}