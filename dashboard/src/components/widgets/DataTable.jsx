const fmtDate = ts =>
	ts
		? new Date(ts).toLocaleDateString('it-IT', {
				day: '2-digit', month: '2-digit', year: 'numeric',
				hour: '2-digit', minute: '2-digit',
			})
		: '—';

const fmtCo2 = v => (v !== undefined && v !== null ? `${parseFloat(v).toFixed(2)} kg` : '—');


const COLUMNS = {
	co2_monthly: [
		{ label: 'Mese',        render: r => r.month },
		{ label: 'CO2 Totale',  render: r => fmtCo2(r.co2) },
	],
	transport_split: [
		{ label: 'Mezzo',        render: r => r.name },
		{ label: 'CO2 Totale',   render: r => fmtCo2(r.co2) },
		{ label: 'Viaggi',       render: r => r.count ?? '—' },
	],
	history: [
		{ label: 'Data',   render: r => fmtDate(r.timestamp_start) },
		{ label: 'Mezzo',  render: r => r.movement_type ?? '—' },
		{ label: 'CO2',    render: r => fmtCo2(r.co2_kgs) },
		{
			label: 'Punti',
			render: r => (
				<span className='status-badge inline-flex items-center px-2 py-0.5'>
					+{r.points ?? 0} pts
				</span>
			),
		},
	],
	leaderboard: [
		{ label: '#',      render: r => `#${r.rank}` },
		{ label: 'Utente', render: r => r.label },
		{
			label: 'Punti',
			render: r => (
				<span className='status-badge inline-flex items-center px-2 py-0.5'>
					{(r.points ?? 0).toLocaleString('it-IT')} pt
				</span>
			),
		},
	],
};

export function DataTable({ config = {}, data = [], loading = false }) {
	const columns = COLUMNS[config.dataset] || COLUMNS.history;

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

	return (
		<div className='table-wrapper h-full w-full'>
			<table className='data-table w-full'>
				<thead>
					<tr className='data-table-head'>
						{columns.map((col, i) => (
							<th key={i} className='data-table-th px-4 py-3'>{col.label}</th>
						))}
					</tr>
				</thead>
				<tbody className='data-table-body'>
					{data.map((row, i) => (
						<tr key={i} className='data-table-row'>
							{columns.map((col, j) => (
								<td key={j} className='data-table-td px-4 py-3'>
									{col.render(row)}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
