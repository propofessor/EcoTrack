// src/components/widgets/MapWidget.jsx
import { useEffect, useRef, useState } from 'react';

export function MapWidget() {
	const mapContainerRef = useRef(null);
	const mapInstanceRef = useRef(null);
	const [leafletLoaded, setLeafletLoaded] = useState(false);
	const [error, setError] = useState(null);

	// Load Leaflet from CDN asynchronously so it works in any environment
	useEffect(() => {
		if (window.L) {
			setLeafletLoaded(true);
			return;
		}

		const linkElement = document.createElement('link');
		linkElement.rel = 'stylesheet';
		linkElement.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
		linkElement.integrity =
			'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
		linkElement.crossOrigin = '';
		document.head.appendChild(linkElement);

		const scriptElement = document.createElement('script');
		scriptElement.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
		scriptElement.integrity =
			'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
		scriptElement.crossOrigin = '';
		scriptElement.onload = () => setLeafletLoaded(true);
		scriptElement.onerror = () =>
			setError('Impossibile caricare le risorse della mappa.');
		document.head.appendChild(scriptElement);
	}, []);

	// Block native drag events from bubbling up to react-grid-layout
	useEffect(() => {
		const container = mapContainerRef.current;
		if (!container) return;

		const stop = (e) => e.stopPropagation();
		container.addEventListener('mousedown', stop);
		container.addEventListener('touchstart', stop, { passive: true });
		container.addEventListener('pointerdown', stop);

		return () => {
			container.removeEventListener('mousedown', stop);
			container.removeEventListener('touchstart', stop);
			container.removeEventListener('pointerdown', stop);
		};
	}, [leafletLoaded]);

	// Initialise Leaflet map centred on Trento
	useEffect(() => {
		if (!leafletLoaded || !mapContainerRef.current) return;

		if (mapInstanceRef.current) mapInstanceRef.current.remove();

		const L = window.L;
		const TRENTO = [46.0679, 11.1211];

		try {
			const map = L.map(mapContainerRef.current, {
				center: TRENTO,
				zoom: 13,
				zoomControl: true
			});
			mapInstanceRef.current = map;

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution:
					'&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
			}).addTo(map);

			delete L.Icon.Default.prototype._getIconUrl;
			L.Icon.Default.mergeOptions({
				iconRetinaUrl:
					'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
				iconUrl:
					'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
				shadowUrl:
					'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
			});

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

			setTimeout(() => map.invalidateSize(), 150);
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
		<div className='map-container relative w-full h-full flex flex-col'>
			<div className='relative flex-1 w-full h-full min-h-0'>

				{!leafletLoaded && !error && (
					<div className='map-overlay absolute inset-0 flex flex-col items-center justify-center gap-3 z-20'>
						<svg
							className='map-spinner h-6 w-6'
							xmlns='http://www.w3.org/2000/svg'
							fill='none'
							viewBox='0 0 24 24'
						>
							<circle
								className='map-spinner-track'
								cx='12'
								cy='12'
								r='10'
								stroke='currentColor'
								strokeWidth='4'
							/>
							<path
								className='map-spinner-fill'
								fill='currentColor'
								d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
							/>
						</svg>
						<span className='map-hint'>
							Inizializzazione mappa in corso...
						</span>
					</div>
				)}

				{error && (
					<div className='map-error absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 z-20'>
						<span className='map-error-icon'>⚠️</span>
						<span className='map-error-label'>{error}</span>
					</div>
				)}

				<div ref={mapContainerRef} className='map-tiles w-full h-full z-10' />
			</div>
		</div>
	);
}
