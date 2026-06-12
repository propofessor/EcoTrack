export function MapWidget() {
  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 8,
      color: 'var(--text-secondary)',
    }}>
      <span style={{ fontSize: 32 }}>🗺️</span>
      <span style={{ fontSize: 13 }}>Mappa interattiva — integrazione Google Maps da configurare</span>
    </div>
  )
}