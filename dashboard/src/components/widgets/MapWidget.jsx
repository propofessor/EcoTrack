// src/components/widgets/MapWidget.jsx
import { useEffect, useRef, useState } from 'react';

export function MapWidget() {
	const mapContainerRef = useRef(null);
	const mapInstanceRef = useRef(null);
	const [leafletLoaded, setLeafletLoaded] = useState(false);
	const [error, setError] = useState(null);

	// Caricamento asincrono di Leaflet da CDN per garantire l'esecuzione ovunque
	useEffect(() => {
		if (window.L) {
			setLeafletLoaded(true);
			return;
		}

		// Inietta CSS di Leaflet
		const linkElement = document.createElement('link');
		linkElement.rel = 'stylesheet';
		linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
		linkElement.integrity =
			'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
		linkElement.crossOrigin = '';
		document.head.appendChild(linkElement);

		// Inietta JS di Leaflet
		const scriptElement = document.createElement('script');
		scriptElement.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
		scriptElement.integrity =
			'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
		scriptElement.crossOrigin = '';

		scriptElement.onload = () => {
			setLeafletLoaded(true);
		};

		scriptElement.onerror = () => {
			setError('Impossibile caricare le risorse della mappa.');
		};

		document.head.appendChild(scriptElement);

		return () => {
			// Pulizia eventuale delle risorse caricate
		};
	}, []);

	// Blocca la propagazione degli eventi di trascinamento nativi a react-grid-layout
	useEffect(() => {
		const container = mapContainerRef.current;
		if (!container) return;

		const stopPropagation = (e) => {
			e.stopPropagation();
		};

		// Blocca gli eventi di interazione del mouse e del touch prima che salgano alla griglia
		container.addEventListener('mousedown', stopPropagation);
		container.addEventListener('touchstart', stopPropagation, {
			passive: true
		});
		container.addEventListener('pointerdown', stopPropagation);

		return () => {
			container.removeEventListener('mousedown', stopPropagation);
			container.removeEventListener('touchstart', stopPropagation);
			container.removeEventListener('pointerdown', stopPropagation);
		};
	}, [leafletLoaded]);

	// Inizializzazione della mappa Leaflet
	useEffect(() => {
		if (!leafletLoaded || !mapContainerRef.current) return;

		// Evita doppie inizializzazioni
		if (mapInstanceRef.current) {
			mapInstanceRef.current.remove();
		}

		const L = window.L;

		// Coordinate predefinite di Trento
		const TRENTO_LAT = 46.0679;
		const TRENTO_LNG = 11.1211;

		try {
			// Inizializza la mappa su Trento
			const map = L.map(mapContainerRef.current, {
				center: [TRENTO_LAT, TRENTO_LNG],
				zoom: 13,
				zoomControl: true
			});

			mapInstanceRef.current = map;

			// Tile layer OpenStreetMap standard
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution:
					'&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
			}).addTo(map);

			// Fix per le icone di Leaflet mancanti a causa del bundler
			delete L.Icon.Default.prototype._getIconUrl;
			L.Icon.Default.mergeOptions({
				iconRetinaUrl:
					'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
				iconUrl:
					'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
				shadowUrl:
					'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
			});

			// Marker d'esempio (Stazione, Duomo, MUSE)
			const markers = [
				{
					coords: [46.0679, 11.1211],
					title: 'Trento Centro',
					desc: 'Monitoraggio CO2 attivo.'
				},
				{
					coords: [46.0631, 11.1132],
					title: 'MUSE - Museo delle Scienze',
					desc: 'Punto di interesse smart-mobility.'
				},
				{
					coords: [46.0718, 11.1204],
					title: 'Stazione di Trento',
					desc: 'Interscambio treno-bus ad alta efficienza.'
				}
			];

			markers.forEach((m) => {
				L.marker(m.coords).addTo(map).bindPopup(`
            <div class="p-1 font-sans">
              <strong class="text-zinc-900 block text-sm">${m.title}</strong>
              <span class="text-zinc-500 text-xs">${m.desc}</span>
            </div>
          `);
			});

			// Corregge le dimensioni di Leaflet all'avvio
			setTimeout(() => {
				map.invalidateSize();
			}, 150);
		} catch (err) {
			console.error('Leaflet Init Error:', err);
			setError("Errore nell'inizializzazione della mappa.");
		}

		return () => {
			if (mapInstanceRef.current) {
				mapInstanceRef.current.remove();
				mapInstanceRef.current = null;
			}
		};
	}, [leafletLoaded]);

	return (
		<div className='relative w-full h-full flex flex-col bg-[color:var(--bg-widget)] rounded-md overflow-hidden min-h-[300px]'>
			{/* Area Mappa o Schermata di Caricamento/Errore */}
			<div className='relative flex-1 w-full h-full min-h-0'>
				{!leafletLoaded && !error && (
					<div className='absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[color:var(--bg-widget)] text-[color:var(--text-secondary)] z-20'>
						<svg
							className='animate-spin h-6 w-6 text-emerald-500'
							xmlns='http://www.w3.org/2000/svg'
							fill='none'
							viewBox='0 0 24 24'
						>
							<circle
								className='opacity-25'
								cx='12'
								cy='12'
								r='10'
								stroke='currentColor'
								strokeWidth='4'
							></circle>
							<path
								className='opacity-75'
								fill='currentColor'
								d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
							></path>
						</svg>
						<span className='text-xs font-medium'>
							Inizializzazione mappa in corso...
						</span>
					</div>
				)}

				{error && (
					<div className='absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[color:var(--bg-widget)] text-rose-500 p-4 text-center z-20'>
						<span className='text-2xl'>⚠️</span>
						<span className='text-xs font-semibold'>{error}</span>
					</div>
				)}

				{/* Elemento DOM per la mappa di Leaflet */}
				<div
					ref={mapContainerRef}
					className='w-full h-full z-10 bg-zinc-100 dark:bg-zinc-900'
				/>
			</div>
		</div>
	);
}
