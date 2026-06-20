import { useState } from 'react';
import Header from '../components/layout/Header.jsx';
import Grid from '../components/layout/Grid.jsx';

const LAYOUT_KEY = 'ecoTrack_layout';

export default function Dashboard() {
	// Lazy initializer: reads from localStorage before the first render
	const [items, setItems] = useState(() => {
		try {
			const saved = localStorage.getItem(LAYOUT_KEY);
			if (saved) return JSON.parse(saved);
		} catch {
			// corrupted entry — fall through to default
		}
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

	// Save button: persists current grid state to localStorage
	const saveLayout = () => {
		localStorage.setItem(LAYOUT_KEY, JSON.stringify(items));
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
						"Configurazione importata! Clicca 'Salva' se vuoi memorizzarla in locale."
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
		<div className='dashboard-page'>
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
