export function ActionButton({ icon, label, onClick, variant }) {
  const variantClass = variant === 'accent' ? 'btn--accent' : 'btn--default';
  return (
    <button onClick={onClick} className={`btn ${variantClass} inline-flex items-center gap-1.5 px-3.5 py-1.75`}>
      {icon} {label}
    </button>
  );
}
