import { useEffect, useRef, useState } from 'react';

export function MapWidget({ data: heatmapData = [] }) {
	const mapContainerRef  = useRef(null);
	const mapInstanceRef   = useRef(null);
	const heatCirclesRef   = useRef([]);
	const [leafletLoaded, setLeafletLoaded] = useState(false);
	const [error, setError] = useState(null);




	useEffect(() => {
		if (window.L) { setLeafletLoaded(true); return; }

		const SCRIPT_ID = 'leaflet-cdn-script';
		const existing = document.getElementById(SCRIPT_ID);
		if (existing) {
			if (existing.dataset.loaded === 'true') setLeafletLoaded(true);
			else {
				existing.addEventListener('load', () => setLeafletLoaded(true));
				existing.addEventListener('error', () =>
					setError('Impossibile caricare le risorse della mappa.')
				);
			}
			return;
		}

		const link = document.createElement('link');
		link.rel        = 'stylesheet';
		link.href       = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
		link.integrity  = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
		link.crossOrigin = '';
		document.head.appendChild(link);

		const script = document.createElement('script');
		script.id         = SCRIPT_ID;
		script.src        = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
		script.integrity  = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
		script.crossOrigin = '';
		script.onload  = () => { script.dataset.loaded = 'true'; setLeafletLoaded(true); };
		script.onerror = () => setError('Impossibile caricare le risorse della mappa.');
		document.head.appendChild(script);
	}, []);


	useEffect(() => {
		const container = mapContainerRef.current;
		if (!container) return;
		const stop = e => e.stopPropagation();
		container.addEventListener('mousedown',  stop);
		container.addEventListener('touchstart', stop, { passive: true });
		container.addEventListener('pointerdown', stop);
		return () => {
			container.removeEventListener('mousedown',  stop);
			container.removeEventListener('touchstart', stop);
			container.removeEventListener('pointerdown', stop);
		};
	}, [leafletLoaded]);


	useEffect(() => {
		if (!leafletLoaded || !mapContainerRef.current) return;
		if (mapInstanceRef.current) mapInstanceRef.current.remove();

		const L      = window.L;
		const TRENTO = [46.0679, 11.1211];

		try {
			const map = L.map(mapContainerRef.current, { center: TRENTO, zoom: 13, zoomControl: true });
			mapInstanceRef.current = map;

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom:     19,
				attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
			}).addTo(map);

			delete L.Icon.Default.prototype._getIconUrl;
			L.Icon.Default.mergeOptions({
				iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
				iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
				shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
			});


			[
				{ coords: [46.0679, 11.1211], title: 'Trento Centro',          desc: 'Monitoraggio CO2 attivo.' },
				{ coords: [46.0631, 11.1132], title: 'MUSE - Museo delle Scienze', desc: 'Punto di interesse smart-mobility.' },
				{ coords: [46.0718, 11.1204], title: 'Stazione di Trento',     desc: 'Interscambio treno-bus ad alta efficienza.' },
			].forEach(m => {
				L.marker(m.coords).addTo(map).bindPopup(`
					<div class="map-popup">
						<strong class="map-popup-title">${m.title}</strong>
						<span class="map-popup-desc">${m.desc}</span>
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


	useEffect(() => {
		if (!leafletLoaded || !mapInstanceRef.current || heatmapData.length === 0) return;

		const L   = window.L;
		const map = mapInstanceRef.current;


		heatCirclesRef.current.forEach(c => c.remove());
		heatCirclesRef.current = [];

		heatmapData.forEach(({ lat, lng, weight }) => {
			const circle = L.circle([lat, lng], {
				radius:      150 + weight * 250,
				color:       'transparent',
				fillColor:   '#ef4444',
				fillOpacity: 0.15 + weight * 0.45,
			}).addTo(map);
			heatCirclesRef.current.push(circle);
		});
	}, [leafletLoaded, heatmapData]);

	return (
		<div className='map-container relative w-full h-full flex flex-col'>
			<div className='relative flex-1 w-full h-full min-h-0'>

				{!leafletLoaded && !error && (
					<div className='map-overlay absolute inset-0 flex flex-col items-center justify-center gap-3 z-20'>
						<svg className='map-spinner h-6 w-6' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
							<circle className='map-spinner-track' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
							<path className='map-spinner-fill' fill='currentColor'
								d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
						</svg>
						<span className='map-hint'>Inizializzazione mappa in corso...</span>
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
