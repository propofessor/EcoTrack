import { useState, useRef } from 'react'
import { Settings, Download, Trash2, GripHorizontal } from 'lucide-react'
import { WidgetConfigModal } from '../modals/WidgetConfigModal'
import { exportWidgetAsImage, exportWidgetAsCsv } from '../../utils/exportUtils'
import { ChartBar } from './ChartBar'
import { ChartPie } from './ChartPie'
import { ChartLine } from './ChartLine'
import { DataTable } from './DataTable'
import { MapWidget } from './MapWidget'

const WIDGET_COMPONENTS = { ChartBar, ChartPie, ChartLine, DataTable, MapWidget }

export function WidgetWrapper({ widgetConfig, onUpdate, onRemove }) {
  const [showConfig, setShowConfig] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const widgetRef = useRef(null)

  const WidgetComponent = WIDGET_COMPONENTS[widgetConfig.widgetType]
  const isTable = widgetConfig.widgetType === 'DataTable'

  const handleExport = async (format) => {
    setShowExportMenu(false)
    if (format === 'image') {
      await exportWidgetAsImage(widgetRef.current, `widget-${widgetConfig.i}`)
    } else if (format === 'csv') {
      exportWidgetAsCsv(widgetConfig.dataset, widgetConfig)
    }
  }

  return (
    <div
      ref={widgetRef}
      style={{
        background: 'var(--bg-widget)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        boxShadow: 'var(--shadow)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header: area trascinabile — NON ha classe no-drag */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-color)',
        cursor: 'grab',
        background: 'var(--bg-surface)',
        gap: '8px',
        userSelect: 'none',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
          <GripHorizontal size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <span style={{
            fontWeight: '600', fontSize: '12px',
            color: 'var(--text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {widgetConfig.widgetType || 'Non configurato'}{widgetConfig.dataset ? ` — ${widgetConfig.dataset}` : ''}
          </span>
        </div>

        {/* Bottoni: no-drag impedisce che il click avvii un drag */}
        <div className="no-drag" style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(v => !v)}
              style={iconButtonStyle}
              title="Esporta"
            >
              <Download size={13} />
            </button>
            {showExportMenu && (
              <div style={dropdownStyle}>
                {isTable && (
                  <button onClick={() => handleExport('csv')} style={dropdownItemStyle}>
                    Scarica CSV
                  </button>
                )}
                <button onClick={() => handleExport('image')} style={dropdownItemStyle}>
                  Scarica PNG
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setShowConfig(true)} style={iconButtonStyle} title="Configura">
            <Settings size={13} />
          </button>
          <button
            onClick={() => onRemove(widgetConfig.i)}
            style={{ ...iconButtonStyle, color: '#e53e3e' }}
            title="Rimuovi"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Body: no-drag impedisce drag accidentali interagendo con i grafici */}
      <div className="no-drag" style={{ flex: 1, overflow: 'auto', padding: '10px', minHeight: 0, minWidth: 0 }}>
        {WidgetComponent ? (
          <WidgetComponent config={widgetConfig} />
        ) : (
          <div
            onClick={() => setShowConfig(true)}
            style={{
              height: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
              color: 'var(--text-secondary)', flexDirection: 'column', gap: '8px',
            }}
          >
            <Settings size={28} />
            <span style={{ fontSize: '13px' }}>Clicca per configurare</span>
          </div>
        )}
      </div>

      {showConfig && (
        <WidgetConfigModal
          widget={widgetConfig}
          onSave={(updates) => {
            onUpdate(widgetConfig.i, updates)
            setShowConfig(false)
          }}
          onClose={() => setShowConfig(false)}
        />
      )}
    </div>
  )
}

const iconButtonStyle = {
  background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
  color: 'var(--text-secondary)', borderRadius: '4px',
  display: 'flex', alignItems: 'center',
}
const dropdownStyle = {
  position: 'absolute', top: '100%', right: 0, background: 'var(--bg-surface)',
  border: '1px solid var(--border-color)', borderRadius: '6px', zIndex: 100,
  minWidth: '140px', boxShadow: 'var(--shadow)',
}
const dropdownItemStyle = {
  display: 'block', width: '100%', padding: '8px 12px', background: 'none',
  border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: '13px',
  color: 'var(--text-primary)',
}