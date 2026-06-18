import { useEffect, useState } from 'react';
import { getCo2Stats } from '../api/dashboardapi.js';

const MOCK_DATA = [
	{ month: '2024-01', co2: 150.25 },
	{ month: '2024-02', co2: 165.8 },
	{ month: '2024-03', co2: 145.6 },
	{ month: '2024-04', co2: 180.45 },
	{ month: '2024-05', co2: 155.3 },
	{ month: '2024-06', co2: 175.9 }
];

export function useMonthlyCo2Stats(config = {}) {
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
				const agg = {};
				(res?.data || []).forEach((row) => {
					const month = row.timestamp_start?.slice(0, 7) || 'N/D';
					agg[month] = (agg[month] || 0) + (parseFloat(row.co2_kgs) || 0);
				});

				const formatted = Object.entries(agg).map(([month, co2]) => ({
					month,
					co2: parseFloat(co2.toFixed(2))
				}));

				setData(formatted.length > 0 ? formatted : MOCK_DATA);
			})
			.catch(() => setData(MOCK_DATA))
			.finally(() => setLoading(false));
	}, [config]);

	return { data, loading };
}
