// src/components/modals/WidgetConfigModal.jsx
import { useState } from 'react';
import { X } from 'lucide-react';

const WIDGET_TYPES = [
	{ value: 'ChartBar',   label: 'Istogramma'         },
	{ value: 'ChartPie',   label: 'Grafico a Torta'    },
	{ value: 'ChartLine',  label: 'Grafico a Linee'    },
	{ value: 'DataTable',  label: 'Tabella Dati'       },
	{ value: 'MapWidget',  label: 'Mappa Interattiva'  },
];

const DATASETS = [
	{ value: 'co2_monthly',     label: 'CO2 Mensile per Mezzo'           },
	{ value: 'transport_split', label: 'Distribuzione Mezzi di Trasporto' },
	{ value: 'history',         label: 'Storico Viaggi'                   },
	{ value: 'leaderboard',     label: 'Classifica Utenti (Anonimizzata)' },
	{ value: 'co2_heatmap',     label: 'Dati Mappa CO2'                  },
];

// Which datasets make sense for each chart type
const VALID_DATASETS = {
	ChartBar:  ['co2_monthly', 'transport_split', 'leaderboard'],
	ChartLine: ['co2_monthly', 'history'],
	ChartPie:  ['transport_split'],
	DataTable: ['co2_monthly', 'transport_split', 'history', 'leaderboard'],
	MapWidget: ['co2_heatmap'],
};

// Datasets for which a date range is irrelevant
const NO_DATE_FILTER = new Set(['leaderboard', 'co2_heatmap']);

export function WidgetConfigModal({ widget, onSave, onClose }) {
	const [type,        setType]        = useState(widget?.widgetType  || '');
	const [dataset,     setDataset]     = useState(widget?.dataset     || '');
	const [dateMode,    setDateMode]    = useState(widget?.dateMode    || 'dynamic');
	const [dynamicDays, setDynamicDays] = useState(widget?.dynamicDays || 30);
	const [startDate,   setStartDate]   = useState(widget?.startDate   || '');
	const [endDate,     setEndDate]     = useState(widget?.endDate     || '');

	const handleTypeChange = (e) => {
		const newType = e.target.value;
		setType(newType);
		const valid = VALID_DATASETS[newType] || [];
		if (!valid.includes(dataset)) {
			// Auto-select when there is only one valid option (e.g. MapWidget → co2_heatmap)
			setDataset(valid.length === 1 ? valid[0] : '');
		}
	};

	const validDatasets = type ? (VALID_DATASETS[type] || []) : DATASETS.map(d => d.value);
	const showDateFilter = dataset && !NO_DATE_FILTER.has(dataset);

	const handleSave = () => {
		if (!type || !dataset) {
			alert('Seleziona il tipo di grafico e il dataset');
			return;
		}
		// Valida l'intervallo statico: la data di inizio non può essere
		// successiva a quella di fine.
		if (
			showDateFilter &&
			dateMode === 'static' &&
			startDate &&
			endDate &&
			startDate > endDate
		) {
			alert('La data di inizio non può essere successiva alla data di fine');
			return;
		}
		onSave({
			widgetType:  type,
			dataset,
			dateMode:    showDateFilter ? dateMode    : undefined,
			dynamicDays: showDateFilter && dateMode === 'dynamic'  ? dynamicDays : undefined,
			startDate:   showDateFilter && dateMode === 'static'   ? startDate   : undefined,
			endDate:     showDateFilter && dateMode === 'static'   ? endDate     : undefined,
		});
	};

	return (
		<div className='modal-overlay flex items-center justify-center'>
			<div className='modal'>
				<div className='modal-header flex items-center justify-between px-5 py-4'>
					<h2 className='modal-heading'>Configura Widget</h2>
					<button onClick={onClose} className='modal-close-btn p-1'>
						<X size={20} />
					</button>
				</div>

				<div className='p-5'>
					{/* Widget type */}
					<label className='modal-label mb-1.5'>Tipo di Visualizzazione</label>
					<select
						value={type}
						onChange={handleTypeChange}
						className='modal-input px-3 py-2 mb-4'
					>
						<option value=''>-- Seleziona --</option>
						{WIDGET_TYPES.map(t => (
							<option key={t.value} value={t.value}>{t.label}</option>
						))}
					</select>

					{/* Dataset — filtered to only show valid options for the selected type */}
					<label className='modal-label mb-1.5'>Dataset</label>
					<select
						value={dataset}
						onChange={e => setDataset(e.target.value)}
						className='modal-input px-3 py-2 mb-4'
						disabled={!type}
					>
						<option value=''>-- Seleziona --</option>
						{DATASETS
							.filter(d => validDatasets.includes(d.value))
							.map(d => (
								<option key={d.value} value={d.value}>{d.label}</option>
							))}
					</select>

					{/* Date range — hidden for datasets that don't support it */}
					{showDateFilter && (
						<>
							<label className='modal-label mb-1.5'>Intervallo Temporale</label>
							<div className='flex gap-3 mb-3'>
								<label>
									<input
										type='radio'
										value='dynamic'
										checked={dateMode === 'dynamic'}
										onChange={() => setDateMode('dynamic')}
									/>{' '}
									Dinamico (ultimi N giorni)
								</label>
								<label>
									<input
										type='radio'
										value='static'
										checked={dateMode === 'static'}
										onChange={() => setDateMode('static')}
									/>{' '}
									Statico (date fisse)
								</label>
							</div>

							{dateMode === 'dynamic' && (
								<>
									<label className='modal-label mb-1.5'>Ultimi N giorni</label>
									<input
										type='number'
										min={1}
										max={365}
										value={dynamicDays}
										onChange={e => setDynamicDays(Number(e.target.value))}
										className='modal-input px-3 py-2 mb-4'
									/>
								</>
							)}

							{dateMode === 'static' && (
								<>
									<label className='modal-label mb-1.5'>Data Inizio</label>
									<input
										type='date'
										value={startDate}
										onChange={e => setStartDate(e.target.value)}
										className='modal-input px-3 py-2 mb-4'
									/>
									<label className='modal-label mb-1.5'>Data Fine</label>
									<input
										type='date'
										value={endDate}
										onChange={e => setEndDate(e.target.value)}
										className='modal-input px-3 py-2 mb-4'
									/>
								</>
							)}
						</>
					)}
				</div>

				<div className='flex justify-end gap-2 p-4'>
					<button onClick={onClose} className='modal-btn modal-btn--cancel px-4 py-2'>
						Annulla
					</button>
					<button onClick={handleSave} className='modal-btn modal-btn--save px-4 py-2'>
						Salva Widget
					</button>
				</div>
			</div>
		</div>
	);
}
