// src/components/widgets/DataTable.jsx
import { useEffect, useState } from 'react';
import { getCo2Stats } from '../../api/dashboardApi';

const MOCK_DATA = [
	{ timestamp_start: '2024-06-01T10:30:00', co2_kgs: 2.5, points: 150 },
	{ timestamp_start: '2024-06-02T14:45:00', co2_kgs: 1.8, points: 120 },
	{ timestamp_start: '2024-06-03T09:15:00', co2_kgs: 3.2, points: 200 },
	{ timestamp_start: '2024-06-04T16:20:00', co2_kgs: 2.1, points: 140 },
	{ timestamp_start: '2024-06-05T11:00:00', co2_kgs: 1.5, points: 100 }
];

export function DataTable({ config }) {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const params = { limit: 50 };
		if (config.startDate) params.date_start = config.startDate;
		if (config.endDate) params.date_end = config.endDate;

		getCo2Stats(params)
			.then((res) => {
				const fetchedData = res.data || [];
				setData(fetchedData.length > 0 ? fetchedData : MOCK_DATA);
			})
			.catch((e) => {
				console.warn('API Error, using mock data:', e.message);
				setData(MOCK_DATA);
			})
			.finally(() => setLoading(false));
	}, [config]);

	if (loading) {
		return (
			<div className='flex items-center justify-center h-full p-5 text-sm font-medium text-(--text-secondary)'>
				Caricamento tabella...
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div className='flex items-center justify-center h-full p-5 text-sm font-medium text-(--text-secondary)'>
				Nessun dato disponibile
			</div>
		);
	}

	const columns = ['Data Inizio', 'CO2 (kg)', 'Punti Guadagnati'];
	const dataKeys = ['timestamp_start', 'co2_kgs', 'points'];

	return (
		<div className='overflow-x-auto h-full w-full rounded-md border border-(--border-color)'>
			<table className='w-full border-collapse text-left text-xs md:text-sm'>
				<thead>
					<tr className='border-b border-(--border-color) bg-(--bg-widget)'>
						{columns.map((col, index) => (
							<th
								key={index}
								className='sticky top-0 px-4 py-3 font-semibold text-(--text-secondary) whitespace-nowrap bg-(--bg-widget) uppercase tracking-wider text-[10px]'
							>
								{col}
							</th>
						))}
					</tr>
				</thead>
				<tbody className='divide-y divide-(--border-color)'>
					{data.map((row, i) => (
						<tr
							key={i}
							className='hover:bg-black/2 dark:hover:bg-white/2 transition-colors odd:bg-transparent even:bg-[color:var(--bg-primary)]/40'
						>
							<td className='px-4 py-3 text-(--text-primary) whitespace-nowrap font-medium'>
								{row.timestamp_start
									? new Date(
											row.timestamp_start
										).toLocaleDateString('it-IT', {
											day: '2-digit',
											month: '2-digit',
											year: 'numeric',
											hour: '2-digit',
											minute: '2-digit'
										})
									: '—'}
							</td>
							<td className='px-4 py-3 text-(--text-primary) whitespace-nowrap font-mono'>
								{row.co2_kgs !== undefined
									? `${parseFloat(row.co2_kgs).toFixed(2)} kg`
									: '—'}
							</td>
							<td className='px-4 py-3 whitespace-nowrap'>
								<span className='inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'>
									+{row.points ?? '0'} pts
								</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
