// src/components/widgets/EmptyCell.jsx
import { useState } from 'react'
import { Plus } from 'lucide-react'

export function EmptyCell({ onAdd }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onAdd}
      style={{
        height: '100%',
        border: `2px dashed ${hovered ? 'var(--accent)' : 'var(--border-color)'}`,
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: hovered ? 'var(--accent-light)' : 'transparent',
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        opacity: hovered ? 1 : 0.3,
        transition: 'opacity 0.2s ease',
        color: hovered ? 'var(--accent)' : 'var(--text-secondary)',
      }}>
        <Plus size={32} strokeWidth={1.5} />
        <span style={{ fontSize: '12px', fontWeight: '500' }}>
          Aggiungi widget
        </span>
      </div>
    </div>
  )
}