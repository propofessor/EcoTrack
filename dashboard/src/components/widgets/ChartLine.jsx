import { useMemo } from 'react';
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer
} from 'recharts';
import { useElementSize } from '../../hooks/useElementSize.js';

export function ChartLine({ config = {}, data: rawData = [], loading = false }) {
	const [containerRef, { width, height }] = useElementSize();

	const dataset = config.dataset;

	// For 'history', rawData is per-trip; aggregate to daily totals for a smooth line
	const data = useMemo(() => {
		if (dataset !== 'history') return rawData;
		const agg = {};
		rawData.forEach(r => {
			const date = r.timestamp_start?.slice(0, 10) || 'N/D';
			agg[date] = (agg[date] || 0) + (r.co2_kgs || 0);
		});
		return Object.entries(agg)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([date, co2]) => ({ date, co2: parseFloat(co2.toFixed(2)) }));
	}, [rawData, dataset]);

	const xKey = dataset === 'history' ? 'date' : 'month';

	const tooltipStyle = {
		contentStyle: {
			background:   'var(--bg-surface)',
			borderColor:  'var(--border-color)',
			borderRadius: '0.375rem',
			boxShadow:    'var(--shadow)',
			color:        'var(--text-primary)',
		},
		labelStyle: { fontWeight: 600, marginBottom: '4px' },
	};

	return (
		<div ref={containerRef} className='chart-container w-full h-full'>
			{!loading && width > 0 && height > 0 && (
				<ResponsiveContainer width={width} height={height}>
					<LineChart
						data={data}
						margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
					>
						<CartesianGrid
							strokeDasharray='3 3'
							stroke='var(--border-color)'
							vertical={false}
						/>
						<XAxis
							dataKey={xKey}
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
							{...tooltipStyle}
							formatter={value => [`${value} kg`, 'CO2']}
						/>
						<Line
							type='monotone'
							dataKey='co2'
							stroke='var(--accent)'
							strokeWidth={2}
							dot={{ fill: 'var(--accent)', strokeWidth: 1, r: 4 }}
							activeDot={{ r: 6 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			)}
			{loading && (
				<div className='chart-empty flex items-center justify-center h-full p-5'>
					Caricamento grafico...
				</div>
			)}
		</div>
	);
}
