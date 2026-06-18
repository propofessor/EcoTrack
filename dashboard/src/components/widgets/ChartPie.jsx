// src/components/widgets/ChartPie.jsx
import { useEffect, useState } from 'react';
import {
	PieChart,
	Pie,
	Cell,
	Tooltip,
	Legend,
	ResponsiveContainer
} from 'recharts';
import { getCo2Stats } from '../../api/dashboardApi';

// Colori moderni per Tailwind integration
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

const MOCK_DATA = [
	{ name: 'Auto', value: 240 },
	{ name: 'Autobus', value: 150 },
	{ name: 'Bicicletta', value: 80 },
	{ name: 'Treno', value: 120 }
];

export function ChartPie({ config }) {
	const [data, setData] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		getCo2Stats({})
			.then((res) => {
				const agg = {};
				res.data?.forEach((d) => {
					const label = d.movement_types?.label || 'altro';
					agg[label] =
						(agg[label] || 0) + (parseFloat(d.co2_kgs) || 0);
				});
				const formattedData = Object.entries(agg).map(
					([name, value]) => ({
						name,
						value: parseFloat(value.toFixed(2))
					})
				);
				setData(formattedData.length > 0 ? formattedData : MOCK_DATA);
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
				Caricamento grafico...
			</div>
		);
	}

	return (
		<div className='w-full h-full min-h-55'>
			<ResponsiveContainer width='100%' height='100%'>
				<PieChart margin={{ top: 0, right: 0, left: 0, bottom: 10 }}>
					<Pie
						data={data}
						cx='50%'
						cy='45%'
						outerRadius='75%'
						dataKey='value'
						label={({ name, percent }) =>
							`${name} ${(percent * 100).toFixed(0)}%`
						}
						labelLine={false}
					>
						{data.map((_, index) => (
							<Cell
								key={index}
								fill={COLORS[index % COLORS.length]}
								className='stroke-(--bg-widget) stroke-2'
							/>
						))}
					</Pie>
					<Tooltip
						contentStyle={{
							background: 'var(--bg-surface)',
							borderColor: 'var(--border-color)',
							borderRadius: '0.375rem',
							boxShadow: 'var(--shadow)',
							color: 'var(--text-primary)'
						}}
						formatter={(value) => [`${value} kg CO2`, 'Impatto']}
					/>
					<Legend
						layout='horizontal'
						verticalAlign='bottom'
						align='center'
						iconType='circle'
						iconSize={8}
						wrapperStyle={{
							color: 'var(--text-secondary)',
							fontSize: 11,
							paddingTop: '10px'
						}}
					/>
				</PieChart>
			</ResponsiveContainer>
		</div>
	);
}
