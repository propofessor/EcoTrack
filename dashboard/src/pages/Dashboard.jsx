import { useState, useEffect } from 'react';
import Header from '../components/layout/Header.jsx';
import Grid from '../components/layout/Grid.jsx';

// Spostiamo la funzione di lettura fuori dal componente per pulizia
const getCookie = (name) => {
	if (typeof document === 'undefined') return null;
	const value = `; ${document.cookie}`;
	const parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
	return null;
};

export default function Dashboard() {
	// 1. INIZIALIZZAZIONE PIGRA: Lo stato legge il cookie PRIMA del primo render
	const [items, setItems] = useState(() => {
		const savedCookie = getCookie('ecoTrack_layout');
		if (savedCookie) {
			try {
				return JSON.parse(decodeURIComponent(savedCookie));
			} catch (error) {
				console.error(
					"Errore nel parsing del cookie all'avvio:",
					error
				);
			}
		}
		// Fallback iniziale se il cookie non esiste
		return [
			{
				i: 'placeholder_0',
				x: 0,
				y: 0,
				w: 2,
				h: 2,
				isAddPlaceholder: true
			}
		];
	});

	// 2. EFFECT PULITO: Rinnova solo la scadenza del cookie, SENZA fare setState
	useEffect(() => {
		const savedCookie = getCookie('ecoTrack_layout');
		if (savedCookie) {
			// "Rolling Cookie": Estendi la durata per altri 30 giorni
			const d = new Date();
			d.setTime(d.getTime() + 30 * 24 * 60 * 60 * 1000);
			const expires = 'expires=' + d.toUTCString();
			document.cookie = `ecoTrack_layout=${savedCookie}; ${expires}; path=/`;
		}
	}, []);

	// 3. Funzione BOTTONE SALVA: Salva lo stato attuale nel cookie
	const saveLayout = () => {
		const d = new Date();
		d.setTime(d.getTime() + 30 * 24 * 60 * 60 * 1000);
		const expires = 'expires=' + d.toUTCString();

		const jsonStr = encodeURIComponent(JSON.stringify(items));
		document.cookie = `ecoTrack_layout=${jsonStr}; ${expires}; path=/`;

		alert('Layout e configurazioni salvati con successo!');
	};

	// 4. Funzione BOTTONE ESPORTA: Scarica un file JSON su disco
	const exportConfig = () => {
		const dataStr = JSON.stringify(items, null, 2);
		const blob = new Blob([dataStr], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = 'ecotrack_config.json';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	// 5. Funzione BOTTONE IMPORTA: Legge il file JSON e sovrascrive la griglia
	const handleImportFile = (event) => {
		const file = event.target.files[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const importedItems = JSON.parse(e.target.result);

				if (Array.isArray(importedItems)) {
					setItems(importedItems);
					alert(
						"Configurazione importata! Clicca 'Salva' se vuoi memorizzarla anche nei cookie."
					);
				} else {
					alert(
						'Il file non contiene una configurazione di widget valida.'
					);
				}
			} catch (error) {
				console.error('Errore di lettura del file:', error);
				alert('File JSON non valido o danneggiato.');
			}
			event.target.value = null;
		};
		reader.readAsText(file);
	};

	return (
		<div
			style={{
				padding: '20px',
				minHeight: '100vh',
				background: 'var(--bg-primary)'
			}}
		>
			<Header
				className='w-full'
				saveLayout={saveLayout}
				exportConfig={exportConfig}
				handleImportFile={handleImportFile}
			/>
			<Grid items={items} setItems={setItems} />
		</div>
	);
}
