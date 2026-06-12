// src/components/modals/WidgetConfigModal.jsx
import { useState } from 'react'
import { X } from 'lucide-react'

const WIDGET_TYPES = [
  { value: 'ChartBar', label: 'Istogramma' },
  { value: 'ChartPie', label: 'Grafico a Torta' },
  { value: 'ChartLine', label: 'Grafico a Linee' },
  { value: 'DataTable', label: 'Tabella Dati' },
  { value: 'MapWidget', label: 'Mappa Interattiva' },
]

const DATASETS = [
  { value: 'co2_monthly', label: 'CO2 Mensile per Mezzo' },
  { value: 'transport_split', label: 'Distribuzione Mezzi di Trasporto' },
  { value: 'history', label: 'Storico Viaggi' },
  { value: 'leaderboard', label: 'Classifica Utenti (Anonimizzata)' },
  { value: 'co2_heatmap', label: 'Dati Mappa CO2' },
]

export function WidgetConfigModal({ widget, onSave, onClose }) {
  const [type, setType] = useState(widget?.widgetType || '')
  const [dataset, setDataset] = useState(widget?.dataset || '')
  // RF1.2: Intervallo temporale (statico = date fisse, dinamico = ultimi N giorni)
  const [dateMode, setDateMode] = useState(widget?.dateMode || 'dynamic')
  const [dynamicDays, setDynamicDays] = useState(widget?.dynamicDays || 30)
  const [startDate, setStartDate] = useState(widget?.startDate || '')
  const [endDate, setEndDate] = useState(widget?.endDate || '')

  const handleSave = () => {
    if (!type || !dataset) {
      alert('Seleziona il tipo di grafico e il dataset')
      return
    }
    onSave({
      widgetType: type,
      dataset,
      dateMode,
      dynamicDays: dateMode === 'dynamic' ? dynamicDays : undefined,
      startDate: dateMode === 'static' ? startDate : undefined,
      endDate: dateMode === 'static' ? endDate : undefined,
    })
  }

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
            Configura Widget
          </h2>
          <button onClick={onClose} style={closeButtonStyle}>
            <X size={20} />
          </button>
        </div>

        <div style={bodyStyle}>
          {/* RF1.2: Selezione tipo di visualizzazione */}
          <label style={labelStyle}>Tipo di Visualizzazione</label>
          <select value={type} onChange={e => setType(e.target.value)} style={selectStyle}>
            <option value="">-- Seleziona --</option>
            {WIDGET_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>

          {/* RF1.2: Selezione dataset */}
          <label style={labelStyle}>Dataset</label>
          <select value={dataset} onChange={e => setDataset(e.target.value)} style={selectStyle}>
            <option value="">-- Seleziona --</option>
            {DATASETS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>

          {/* RF1.2: Intervallo temporale statico o dinamico */}
          <label style={labelStyle}>Intervallo Temporale</label>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <label>
              <input
                type="radio"
                value="dynamic"
                checked={dateMode === 'dynamic'}
                onChange={() => setDateMode('dynamic')}
              /> Dinamico (ultimi N giorni)
            </label>
            <label>
              <input
                type="radio"
                value="static"
                checked={dateMode === 'static'}
                onChange={() => setDateMode('static')}
              /> Statico (date fisse)
            </label>
          </div>

          {dateMode === 'dynamic' && (
            <>
              <label style={labelStyle}>Ultimi N giorni</label>
              <input
                type="number"
                min={1}
                max={365}
                value={dynamicDays}
                onChange={e => setDynamicDays(Number(e.target.value))}
                style={selectStyle}
              />
            </>
          )}

          {dateMode === 'static' && (
            <>
              <label style={labelStyle}>Data Inizio</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={selectStyle} />
              <label style={labelStyle}>Data Fine</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={selectStyle} />
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px' }}>
          <button onClick={onClose} style={{ ...buttonStyle, background: 'var(--border-color)' }}>
            Annulla
          </button>
          <button onClick={handleSave} style={{ ...buttonStyle, background: 'var(--accent)', color: 'white' }}>
            Salva Widget
          </button>
        </div>
      </div>
    </div>
  )
}

// Stili inline semplici (puoi spostarli in CSS modules se preferisci)
const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modalStyle = {
  background: 'var(--bg-surface)', borderRadius: '12px', width: '480px',
  maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto',
  border: '1px solid var(--border-color)',
}
const headerStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
}
const bodyStyle = { padding: '20px' }
const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '14px', color: 'var(--text-secondary)' }
const selectStyle = { width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', marginBottom: '16px', fontSize: '14px' }
const closeButtonStyle = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }
const buttonStyle = { padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '500' }