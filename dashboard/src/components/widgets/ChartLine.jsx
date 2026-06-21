import { useMemo } from 'react';
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer
} from 'recharts';
import { useElementSize } from '../../hooks/useElementSize.js';
import { TRANSPORT_ORDER, transportColor } from '../../utils/labels.js';

export function ChartLine({ config = {}, data: rawData = [], loading = false }) {
	const [containerRef, { width, height }] = useElementSize();

	const dataset = config.dataset;


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




	const lineKeys = useMemo(() => {
		if (dataset !== 'co2_monthly') return ['co2'];
		const totals = {};
		data.forEach(row => {
			Object.keys(row).forEach(k => {
				if (k === 'month' || k === 'co2') return;
				totals[k] = (totals[k] || 0) + (Number(row[k]) || 0);
			});
		});
		const present = Object.keys(totals).filter(k => totals[k] > 0);
		const ordered = [
			...TRANSPORT_ORDER.filter(m => present.includes(m)),
			...present.filter(m => !TRANSPORT_ORDER.includes(m)),
		];
		return ordered.length ? ordered : ['co2'];
	}, [data, dataset]);

	const isMultiLine = lineKeys.length > 1;

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
							formatter={(value, name) => [`${value} kg`, name === 'co2' ? 'CO2' : name]}
						/>
						{isMultiLine && (
							<Legend
								iconType='plainline'
								wrapperStyle={{
									color:      'var(--text-secondary)',
									fontSize:   11,
									paddingTop: '6px',
								}}
							/>
						)}
						{lineKeys.map((key, idx) => {
							const color = isMultiLine ? transportColor(key, idx) : 'var(--accent)';
							return (
								<Line
									key={key}
									type='monotone'
									dataKey={key}
									name={key === 'co2' ? 'CO2' : key}
									stroke={color}
									strokeWidth={2}
									dot={{ fill: color, strokeWidth: 1, r: 4 }}
									activeDot={{ r: 6 }}
								/>
							);
						})}
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
