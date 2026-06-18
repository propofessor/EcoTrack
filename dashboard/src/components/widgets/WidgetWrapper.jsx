import React, { useState, useRef } from 'react';
import { Settings, Download, Trash2, GripHorizontal } from 'lucide-react';
import {
	exportWidgetAsImage,
	exportWidgetAsCsv
} from '../../utils/exportUtils';
import { ChartBar } from './ChartBar';
import { ChartPie } from './ChartPie';
import { ChartLine } from './ChartLine';
import { DataTable } from './DataTable';
import { MapWidget } from './MapWidget';

const WIDGET_COMPONENTS = {
	ChartBar,
	ChartPie,
	ChartLine,
	DataTable,
	MapWidget
};

function WidgetWrapperComponent({ widgetConfig, onRemove, onEdit }) {
	console.log(
		`[RENDER] Widget ${widgetConfig.i} - Tipo: ${widgetConfig.widgetType}`
	);

	const [showExportMenu, setShowExportMenu] = useState(false);
	const widgetRef = useRef(null);

	const WidgetComponent = WIDGET_COMPONENTS[widgetConfig.widgetType];
	const isTable = widgetConfig.widgetType === 'DataTable';

	const handleExport = async (format) => {
		setShowExportMenu(false);
		if (format === 'image') {
			await exportWidgetAsImage(
				widgetRef.current,
				`widget-${widgetConfig.i}`
			);
		} else if (format === 'csv') {
			exportWidgetAsCsv(widgetConfig.dataset, widgetConfig);
		}
	};

	return (
		<div ref={widgetRef} className='widget flex flex-col h-full'>

			{/* Header bar */}
			<div className='widget-header flex items-center justify-between h-14 px-5 gap-3 shrink-0'>
				<div className='flex items-center gap-3 flex-1 min-w-0'>
					<GripHorizontal
						size={16}
						className='widget-icon shrink-0'
					/>
					<span className='widget-title'>
						{widgetConfig.widgetType || 'NON CONFIGURATO'}
						{widgetConfig.dataset ? ` // ${widgetConfig.dataset}` : ''}
					</span>
				</div>

				{/* Action buttons */}
				<div className='no-drag flex items-center gap-1.5 shrink-0'>
					<div className='relative flex items-center'>
						<button
							onClick={() => setShowExportMenu((v) => !v)}
							className='widget-action-btn flex items-center justify-center w-8 h-8'
							title='Esporta'
						>
							<Download size={15} />
						</button>

						{showExportMenu && (
							<div className='widget-dropdown absolute top-full right-0 mt-2 z-50'>
								{isTable && (
									<button
										onClick={() => handleExport('csv')}
										className='widget-dropdown-item block w-full px-4 py-2.5'
									>
										Scarica CSV
									</button>
								)}
								<button
									onClick={() => handleExport('image')}
									className='widget-dropdown-item block w-full px-4 py-2.5'
								>
									Scarica PNG
								</button>
							</div>
						)}
					</div>

					<button
						onClick={() => onEdit(widgetConfig.i)}
						className='widget-action-btn flex items-center justify-center w-8 h-8'
						title='Configura'
					>
						<Settings size={15} />
					</button>

					<button
						onClick={() => onRemove(widgetConfig.i)}
						className='widget-action-btn widget-action-btn--delete flex items-center justify-center w-8 h-8'
						title='Rimuovi'
					>
						<Trash2 size={15} />
					</button>
				</div>
			</div>

			{/* Widget body */}
			<div className='widget-body-container no-drag flex-1 overflow-auto p-3 min-h-0 min-w-0'>
				{WidgetComponent ? (
					<WidgetComponent config={widgetConfig} />
				) : (
					<div
						onClick={() => onEdit(widgetConfig.i)}
						className='widget-unconfigured h-full flex flex-col items-center justify-center gap-2.5'
					>
						<Settings size={20} className='widget-loading' />
						<span className='widget-hint'>Configura Widget</span>
					</div>
				)}
			</div>
		</div>
	);
}

const areEqual = (prevProps, nextProps) => {
	const prev = prevProps.widgetConfig;
	const next = nextProps.widgetConfig;

	return (
		prev.widgetType === next.widgetType &&
		prev.dataset === next.dataset &&
		prev.w === next.w &&
		prev.h === next.h &&
		JSON.stringify(prev.props || {}) === JSON.stringify(next.props || {})
	);
};

export const WidgetWrapper = React.memo(WidgetWrapperComponent, areEqual);
