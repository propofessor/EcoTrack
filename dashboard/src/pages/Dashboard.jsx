import { useState, useEffect, useRef } from 'react'
import GridLayout from 'react-grid-layout'
import { useDashboardLayout } from '../hooks/useDashboardLayout'
import { WidgetWrapper } from '../components/widgets/WidgetWrapper'
import { WidgetConfigModal } from '../components/modals/WidgetConfigModal'
import { DarkModeToggle } from '../components/ui/DarkModeToggle'
import { Save, Upload, Download, Plus } from 'lucide-react'
import { GRID_COLS, GRID_ROW_HEIGHT, GRID_MARGIN } from '../components/layout/gridConstants'

const COLUMN_WIDTH = (containerWidth) => (containerWidth - GRID_MARGIN * (GRID_COLS + 1)) / GRID_COLS

export function Dashboard() {
  const {
    layout,
    saveLayout,
    exportConfig,
    importConfig,
    addWidgetAt,
    updateWidget,
    removeWidget,
    onLayoutChange,
  } = useDashboardLayout()

  const containerRef = useRef(null)
  const [gridWidth, setGridWidth] = useState(0)
  const [configuringWidget, setConfiguringWidget] = useState(null)

  // Update grid width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setGridWidth(containerRef.current.offsetWidth)
      }
    }
    updateWidth()
    const resizeObserver = new ResizeObserver(updateWidth)
    if (containerRef.current) resizeObserver.observe(containerRef.current)
    return () => resizeObserver.disconnect()
  }, [])

  // Calculate grid height dynamically
  const maxBottom = layout.reduce((max, w) => Math.max(max, w.y + w.h), 0)
  const GRID_ROWS = Math.max(6, maxBottom + 3)
  const gridHeight = GRID_ROWS * (GRID_ROW_HEIGHT + GRID_MARGIN) + GRID_MARGIN

  // Find next available position for add button - check for 2x2 space (actual widget size)
  const findNextAvailablePos = () => {
    const WIDGET_WIDTH = 2
    const WIDGET_HEIGHT = 2
    
   // Sostituisci il ciclo esterno delle righe con questo:
  for (let row = 0; row <= GRID_ROWS - WIDGET_HEIGHT; row++) {
    // Il ciclo delle colonne va già bene:
    for (let col = 0; col <= GRID_COLS - WIDGET_WIDTH; col++) {
      let canPlace = true;
      
      // Ora puoi anche semplificare il ciclo interno, la guardia "&& r < GRID_ROWS" non serve più
      for (let r = row; r < row + WIDGET_HEIGHT; r++) {
        for (let c = col; c < col + WIDGET_WIDTH; c++) {
          const occupied = layout.some(w =>
            c >= w.x && c < w.x + w.w &&
            r >= w.y && r < w.y + w.h
          );
          if (occupied) {
            canPlace = false;
            break;
          }
        }
        if (!canPlace) break;
      }
      
      if (canPlace) {
        return { col, row, w: WIDGET_WIDTH, h: WIDGET_HEIGHT };
      }
    }
  }
  return null;
  }

  const nextPos = findNextAvailablePos()

  // Handle add button click
  const handleAddWidget = (col, row) => {
    const newWidget = addWidgetAt(col, row)
    setConfiguringWidget(newWidget)
  }

  const handleImportFile = (e) => {
    const file = e.target.files[0]
    if (file) importConfig(file)
    e.target.value = ''
  }

  const colWidth = gridWidth > 0 ? COLUMN_WIDTH(gridWidth) : 0

  return (
    <div style={{ padding: '20px', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
            🌱 EcoTrack — Dashboard Comune
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Trascina i widget per riordinare, ridimensiona dagli angoli
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <DarkModeToggle />
          <ActionButton icon={<Save size={14} />} label="Salva" onClick={saveLayout} variant="accent" />
          <ActionButton icon={<Download size={14} />} label="Esporta" onClick={exportConfig} />
          <label style={{ ...buttonStyle, cursor: 'pointer' }}>
            <Upload size={14} /> Importa
            <input type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {/* Main Grid Container */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          minHeight: gridHeight,
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        {/* GridLayout - only render when width is determined */}
        {gridWidth > 0 && (
          <GridLayout
            layout={layout}
            cols={GRID_COLS}
            rowHeight={GRID_ROW_HEIGHT}
            width={gridWidth}
            margin={[GRID_MARGIN, GRID_MARGIN]}
            containerPadding={[GRID_MARGIN, GRID_MARGIN]}
            onLayoutChange={onLayoutChange}
            draggableCancel=".no-drag"
            resizeHandles={['se']}
            isDraggable={true}
            isResizable={true}
            compactType="vertical"
            preventCollision={false}
            useCSSTransforms={true}
          >
            {layout.map(widget => (
              <div
                key={widget.i}
                style={{
                  background: 'var(--bg-widget)',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <WidgetWrapper
                  widgetConfig={widget}
                  onUpdate={updateWidget}
                  onRemove={removeWidget}
                />
              </div>
            ))}
          </GridLayout>
        )}

        {/* Add Widget Button Overlay */}
        {nextPos && gridWidth > 0 && (
          <AddWidgetButton
            col={nextPos.col}
            row={nextPos.row}
            w={nextPos.w}
            h={nextPos.h}
            colWidth={colWidth}
            onAdd={() => handleAddWidget(nextPos.col, nextPos.row)}
          />
        )}
      </div>

      {/* Widget Configuration Modal */}
      {configuringWidget && (
        <WidgetConfigModal
          widget={configuringWidget}
          onSave={(updates) => {
            console.log("Saving widget config", configuringWidget.i, updates)
            updateWidget(configuringWidget.i, updates)
            setConfiguringWidget(null)
          }}
          onClose={() => {
            console.log("Closing config for widget", configuringWidget.i)
            removeWidget(configuringWidget.i)
            setConfiguringWidget(null)
          }}
        />
      )}
    </div>
  )
}

// Add Widget Button Component
function AddWidgetButton({ col, row, colWidth, onAdd }) {
  const [hovered, setHovered] = useState(false)

  const left = col * (colWidth + GRID_MARGIN) + GRID_MARGIN
  const top = row * (GRID_ROW_HEIGHT + GRID_MARGIN) + GRID_MARGIN
  const width = colWidth * 6 + GRID_MARGIN * 5 // 6 columns
  const height = GRID_ROW_HEIGHT * 4 + GRID_MARGIN * 3 // 4 rows

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
          Aggiungi
        </span>
      )}
    </div>
  )
}

function ActionButton({ icon, label, onClick, variant }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...buttonStyle,
        background: variant === 'accent' ? 'var(--accent)' : 'var(--bg-surface)',
        color: variant === 'accent' ? 'white' : 'var(--text-primary)',
      }}
    >
      {icon} {label}
    </button>
  )
}

const buttonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '7px 14px',
  borderRadius: '8px',
  border: '1px solid var(--border-color)',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '500',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
}
