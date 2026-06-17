export function ActionButton({ icon, label, onClick, variant }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '7px 14px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: '500',
        background: variant === 'accent' ? 'var(--accent)' : 'var(--bg-surface)',
        color: variant === 'accent' ? 'white' : 'var(--text-primary)',
      }}
    >
      {icon} {label}
    </button>
  )
}