// src/components/widgets/ChartBar.jsx
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer
} from 'recharts';
import { useMonthlyCo2Stats } from '../../hooks/useMonthlyCo2Stats.js';

export function ChartBar({ config = {} }) {
	const { data, loading } = useMonthlyCo2Stats(config);

	if (loading) {
		return (
			<div className='chart-empty flex items-center justify-center h-full p-5'>
				Caricamento grafico...
			</div>
		);
	}

	return (
		<div className='chart-container w-full h-full'>
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
					<Bar dataKey='co2' fill='var(--accent)' radius={[4, 4, 0, 0]} />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
