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
			<div className='table-empty flex items-center justify-center h-full p-5'>
				Caricamento tabella...
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div className='table-empty flex items-center justify-center h-full p-5'>
				Nessun dato disponibile
			</div>
		);
	}

	const columns = ['Data Inizio', 'CO2 (kg)', 'Punti Guadagnati'];

	return (
		<div className='table-wrapper h-full w-full'>
			<table className='data-table w-full'>
				<thead>
					<tr className='data-table-head'>
						{columns.map((col, index) => (
							<th key={index} className='data-table-th px-4 py-3'>
								{col}
							</th>
						))}
					</tr>
				</thead>
				<tbody className='data-table-body'>
					{data.map((row, i) => (
						<tr key={i} className='data-table-row'>
							<td className='data-table-td px-4 py-3'>
								{row.timestamp_start
									? new Date(row.timestamp_start).toLocaleDateString(
											'it-IT',
											{
												day: '2-digit',
												month: '2-digit',
												year: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											}
										)
									: '—'}
							</td>
							<td className='data-table-td--mono px-4 py-3'>
								{row.co2_kgs !== undefined
									? `${parseFloat(row.co2_kgs).toFixed(2)} kg`
									: '—'}
							</td>
							<td className='data-table-td--plain px-4 py-3'>
								<span className='status-badge inline-flex items-center px-2 py-0.5'>
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
