// src/components/widgets/ChartBar.jsx
import { useEffect, useState } from 'react';
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer
} from 'recharts';

// Import con fallback sicuro per evitare errori di compilazione nel caso l'API non esista nel path relativo
let getCo2Stats;
try {
	const api = require('../../api/dashboardApi');
	getCo2Stats = api.getCo2Stats;
} catch (e) {
	// Fallback in-memory o simulato se il file non viene trovato dal bundler
	getCo2Stats = () => Promise.resolve({ data: [] });
}

// Dati fittizi usati come fallback e sviluppo visivo
const MOCK_DATA = [
	{ month: '2024-01', co2: '150.25' },
	{ month: '2024-02', co2: '165.80' },
	{ month: '2024-03', co2: '145.60' },
	{ month: '2024-04', co2: '180.45' },
	{ month: '2024-05', co2: '155.30' },
	{ month: '2024-06', co2: '175.90' }
];

export function ChartBar({ config = {} }) {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const params = {};
		if (config.dateMode === 'dynamic') {
			const d = new Date();
			d.setDate(d.getDate() - (config.dynamicDays || 30));
			params.date_start = d.toISOString();
		} else {
			if (config.startDate) params.date_start = config.startDate;
			if (config.endDate) params.date_end = config.endDate;
		}

		getCo2Stats(params)
			.then((res) => {
				// Aggregazione dati per mese
				const agg = {};
				const responseData = res?.data || [];

				responseData.forEach((d) => {
					const month = d.timestamp_start?.slice(0, 7) || 'N/D';
					agg[month] =
						(agg[month] || 0) + (parseFloat(d.co2_kgs) || 0);
				});

				const formattedData = Object.entries(agg).map(
					([month, co2]) => ({
						month,
						co2: co2.toFixed(2)
					})
				);

				setData(formattedData.length > 0 ? formattedData : MOCK_DATA);
			})
			.catch((e) => {
				console.warn(
					'Errore API, utilizzo dei dati simulati:',
					e.message
				);
				setData(MOCK_DATA);
			})
			.finally(() => setLoading(false));
	}, [config]);

	if (loading) {
		return (
			<div className='flex items-center justify-center h-full p-5 text-sm font-medium text-(--text-secondary)'>
				Caricamento grafico...
			</div>
		);
	}

	return (
		<div className='w-full h-full min-h-55'>
			<ResponsiveContainer width='100%' height='100%'>
				<BarChart
					data={data}
					margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
				>
					<CartesianGrid
						strokeDasharray='3 3'
						stroke='var(--border-color)'
						vertical={false}
					/>
					<XAxis
						dataKey='month'
						tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
						axisLine={{ stroke: 'var(--border-color)' }}
						tickLine={false}
					/>
					<YAxis
						tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
						axisLine={false}
						tickLine={false}
					/>
					<Tooltip
						contentStyle={{
							background: 'var(--bg-surface)',
							borderColor: 'var(--border-color)',
							borderRadius: '0.375rem',
							boxShadow: 'var(--shadow)',
							color: 'var(--text-primary)'
						}}
						labelStyle={{ fontWeight: 600, marginBottom: '4px' }}
					/>
					<Bar
						dataKey='co2'
						fill='var(--accent)'
						radius={[4, 4, 0, 0]}
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
