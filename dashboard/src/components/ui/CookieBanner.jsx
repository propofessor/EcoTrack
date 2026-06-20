/**
 * CookieBanner — RNF8
 * Shown on first visit; user must accept or reject cookies.
 * Choice is persisted in localStorage under 'cookies_accepted'.
 */
import { Cookie } from 'lucide-react';
import { useState } from 'react';

const STORAGE_KEY = 'cookies_accepted';

export default function CookieBanner() {
	const [visible, setVisible] = useState(() => {
		try {
			return localStorage.getItem(STORAGE_KEY) === null;
		} catch {
			return false;
		}
	});

	if (!visible) return null;

	function accept() {
		localStorage.setItem(STORAGE_KEY, 'true');
		setVisible(false);
	}

	function reject() {
		localStorage.setItem(STORAGE_KEY, 'false');
		setVisible(false);
	}

	return (
		<div
			style={{
				position: 'fixed',
				bottom: 0,
				left: 0,
				right: 0,
				zIndex: 9999,
				padding: '1rem 1.5rem',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: '0.5rem',
				flexWrap: 'wrap',
				backgroundColor: 'var(--bg-surface)',
				borderTop: '1px solid var(--border-color)',
				boxShadow: 'rgba(0, 0, 0, 0.075) 0px -0.5px 10px'
			}}
			role="dialog"
			aria-label="Informativa sui cookie"
		>
			<Cookie size={16}/>
			<p style={{ margin: 0, flex: 1, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
				Questo sito utilizza cookie tecnici essenziali per il suo funzionamento.{' '}
				Consulta la nostra{' '}
				<a href="#" style={{ color: 'var(--accent)', fontWeight: 700 }}>
					Cookie Policy
				</a>{' '}
				per maggiori informazioni.
			</p>
			<div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
				<button
					onClick={accept}
					className='btn btn--accent'
				>
					Accetta
				</button>
				<button
					onClick={reject}
					className='btn btn--default'
				>
					Rifiuta
				</button>
			</div>
		</div>
	);
}
