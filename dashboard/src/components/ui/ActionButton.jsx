export function ActionButton({ icon, label, onClick, variant }) {
	const variantClass = variant === 'accent' ? 'btn--accent' : 'btn--default';
	return (
		<button onClick={onClick} className={`btn ${variantClass}`}>
			{icon} {label}
		</button>
	);
}
