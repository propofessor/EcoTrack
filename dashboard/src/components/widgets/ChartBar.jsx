import {
	BarChart,
	Bar,
	Cell,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer
} from 'recharts';
import { useElementSize } from '../../hooks/useElementSize.js';
import { transportColor } from '../../utils/labels.js';

// Dataset → axis / label mapping
const DATASET_CONFIG = {
	co2_monthly: {
		xKey: 'month',
		yKey: 'co2',
		yUnit: ' kg',
		yLabel: 'CO2 (kg)'
	},
	transport_split: {
		xKey: 'name',
		yKey: 'co2',
		yUnit: ' kg',
		yLabel: 'CO2 (kg)'
	},
	leaderboard: {
		xKey: 'label',
		yKey: 'points',
		yUnit: ' pt',
		yLabel: 'Punti'
	}
};

export function ChartBar({ config = {}, data = [], loading = false }) {
	const [containerRef, { width, height }] = useElementSize();

	const { xKey, yKey, yUnit, yLabel } =
		DATASET_CONFIG[config.dataset] || DATASET_CONFIG.co2_monthly;

	// Quando l'asse X è un mezzo di trasporto (transport_split), coloriamo ogni
	// barra con il colore canonico del mezzo, così ogni mezzo ha sempre lo stesso
	// colore in tutti i grafici. Per gli altri dataset resta una tinta unica.
	const colorByTransport = xKey === 'name';

	const tooltipStyle = {
		contentStyle: {
			background: 'var(--bg-surface)',
			borderColor: 'var(--border-color)',
			borderRadius: '0.375rem',
			boxShadow: 'var(--shadow)',
			color: 'var(--text-primary)'
		},
		labelStyle: { fontWeight: 600, marginBottom: '4px' }
	};

	return (
		<div ref={containerRef} className='chart-container w-full h-full'>
			{!loading && width > 0 && height > 0 && (
				<ResponsiveContainer width={width} height={height}>
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
							dataKey={xKey}
							tick={{
								fill: 'var(--text-secondary)',
								fontSize: 11
							}}
							axisLine={{ stroke: 'var(--border-color)' }}
							tickLine={false}
						/>
						<YAxis
							tick={{
								fill: 'var(--text-secondary)',
								fontSize: 11
							}}
							axisLine={false}
							tickLine={false}
						/>
						<Tooltip
							{...tooltipStyle}
							formatter={(value) => [`${value}${yUnit}`, yLabel]}
						/>
						<Bar
							dataKey={yKey}
							fill='var(--accent)'
							radius={[4, 4, 0, 0]}
						>
							{colorByTransport &&
								data.map((entry, index) => (
									<Cell
										key={index}
										fill={transportColor(
											entry[xKey],
											index
										)}
									/>
								))}
						</Bar>
					</BarChart>
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
