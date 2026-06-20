import {
	PieChart,
	Pie,
	Cell,
	Tooltip,
	Legend,
	ResponsiveContainer
} from 'recharts';
import { useElementSize } from '../../hooks/useElementSize.js';

const COLORS = ['#8ab834', '#e7dc0c', '#f59e0b', '#d05305', '#b73410', '#3f981e'];

export function ChartPie({ data = [], loading = false }) {
	const [containerRef, { width, height }] = useElementSize();

	return (
		<div ref={containerRef} className='chart-container w-full h-full'>
			{!loading && width > 0 && height > 0 && (
				<ResponsiveContainer width={width} height={height}>
					<PieChart margin={{ top: 0, right: 0, left: 0, bottom: 10 }}>
						<Pie
							data={data}
							cx='50%'
							cy='45%'
							outerRadius='75%'
							dataKey='co2'
							nameKey='name'
						>
							{data.map((_, index) => (
								<Cell
									key={index}
									fill={COLORS[index % COLORS.length]}
									className='pie-cell-stroke'
								/>
							))}
						</Pie>
						<Tooltip
							contentStyle={{
								background:   'var(--bg-surface)',
								borderColor:  'var(--border-color)',
								borderRadius: '0.375rem',
								boxShadow:    'var(--shadow)',
								color:        'var(--text-primary)',
								textTransform: 'capitalize',	
							}}
							formatter={(value, name) => [`${value} kg CO2`, name]}
						/>
						<Legend
							layout='horizontal'
							verticalAlign='bottom'
							align='center'
							iconType='circle'
							iconSize={8}
							wrapperStyle={{
								color:      'var(--text-secondary)',
								fontSize:   11,
								paddingTop: '10px',
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
