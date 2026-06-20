import {
	PieChart,
	Pie,
	Cell,
	Tooltip,
	Legend,
	ResponsiveContainer
} from 'recharts';
import { useElementSize } from '../../hooks/useElementSize.js';

import { transportColor } from '../../utils/labels.js';

// Soglia minima: spicchi sotto questa percentuale non mostrano l'etichetta
// (evita sovrapposizioni su fette sottili). I nomi restano nella Legend.
const MIN_LABEL_PERCENT = 0.08;

const renderSliceLabel = ({
	cx,
	cy,
	midAngle,
	innerRadius,
	outerRadius,
	percent
}) => {
	// Niente etichetta per spicchi piccoli o quando la torta è troppo piccola
	if (percent < MIN_LABEL_PERCENT || outerRadius < 40) return null;

	const RADIAN = Math.PI / 180;
	const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
	const x = cx + radius * Math.cos(-midAngle * RADIAN);
	const y = cy + radius * Math.sin(-midAngle * RADIAN);

	return (
		<text
			x={x}
			y={y}
			fill='#fff'
			fontSize={11}
			fontWeight={600}
			textAnchor='middle'
			dominantBaseline='central'
		>
			{`${(percent * 100).toFixed(0)}%`}
		</text>
	);
};

export function ChartPie({ data = [], loading = false }) {
	const [containerRef, { width, height }] = useElementSize();

	return (
		<div ref={containerRef} className='chart-container w-full h-full'>
			{!loading && width > 0 && height > 0 && (
				<ResponsiveContainer width={width} height={height}>
					<PieChart
						margin={{ top: 0, right: 0, left: 0, bottom: 10 }}
					>
						<Pie
							data={data}
							cx='50%'
							cy='45%'
							outerRadius='75%'
							dataKey='co2'
							nameKey='name'
							label={renderSliceLabel}
							labelLine={false}
						>
							{data.map((entry, index) => (
								<Cell
									key={index}
									fill={transportColor(entry.name, index)}
									className='pie-cell-stroke'
								/>
							))}
						</Pie>
						<Tooltip
							contentStyle={{
								background: 'var(--bg-surface)',
								borderColor: 'var(--border-color)',
								borderRadius: '0.375rem',
								boxShadow: 'var(--shadow)',
								color: 'var(--text-primary)',
								textTransform: 'capitalize'
							}}
							formatter={(value, name) => [
								`${value} kg CO2`,
								name
							]}
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
			)}
			{loading && (
				<div className='chart-empty flex items-center justify-center h-full p-5'>
					Caricamento grafico...
				</div>
			)}
		</div>
	);
}
