import React, { useState, useRef } from 'react';
import { Settings, Download, Trash2, GripHorizontal } from 'lucide-react';
import { WidgetConfigModal } from '../modals/WidgetConfigModal';
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
// 1. Aggiungi "onEdit" tra le props
function WidgetWrapperComponent({ widgetConfig, onUpdate, onRemove, onEdit }) {
	console.log(
		`[RENDER] Widget ${widgetConfig.i} - Tipo: ${widgetConfig.widgetType}`
	);

	// 2. RIMUOVI lo stato showConfig
	// const [showConfig, setShowConfig] = useState(false);
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
		<div
			ref={widgetRef}
			className='flex flex-col h-full overflow-hidden rounded-xl border border-(--border-color) bg-(--bg-widget) shadow-(--shadow)'
		>
			{/* Header bilanciato con classi Tailwind standard (No inline styles) */}
			<div className='flex items-center justify-between h-14 px-5 border-b border-(--border-color) bg-(--bg-surface) gap-3 select-none shrink-0 cursor-grab active:cursor-grabbing'>
				<div className='flex items-center gap-3 flex-1 min-w-0'>
					<GripHorizontal
						size={16}
						className='text-(--text-secondary) shrink-0 opacity-50 hover:opacity-100 transition-opacity'
					/>
					<span className='font-mono text-xs font-bold tracking-wider text-(--text-secondary) uppercase overflow-hidden text-ellipsis whitespace-nowrap'>
						{widgetConfig.widgetType || 'NON CONFIGURATO'}
						{widgetConfig.dataset
							? ` // ${widgetConfig.dataset}`
							: ''}
					</span>
				</div>

				{/* Pulsantiera controlli */}
				<div className='no-drag flex items-center gap-1.5 shrink-0'>
					<div className='relative flex items-center'>
						<button
							onClick={() => setShowExportMenu((v) => !v)}
							className='flex items-center justify-center w-8 h-8 rounded-md bg-transparent border-none cursor-pointer text-(--text-secondary) transition-all duration-150 hover:bg-(--accent-hover) hover:text-(--text-primary)'
							title='Esporta'
						>
							<Download size={15} />
						</button>

						{showExportMenu && (
							<div className='absolute top-full right-0 mt-2 min-w-35 rounded-lg border border-(--border-color) bg-(--bg-surface) shadow-xl z-50 animate-slide-up overflow-hidden'>
								{isTable && (
									<button
										onClick={() => handleExport('csv')}
										className='block w-full px-4 py-2.5 text-left text-xs font-medium bg-transparent border-none cursor-pointer text-(--text-primary) transition-all duration-150 hover:bg-(--accent-hover)'
									>
										Scarica CSV
									</button>
								)}
								<button
									onClick={() => handleExport('image')}
									className='block w-full px-4 py-2.5 text-left text-xs font-medium bg-transparent border-none cursor-pointer text-(--text-primary) transition-all duration-150 hover:bg-(--accent-hover)'
								>
									Scarica PNG
								</button>
							</div>
						)}
					</div>

					<button
						onClick={() => onEdit(widgetConfig.i)} // <- QUI
						className='flex items-center justify-center w-8 h-8 rounded-md bg-transparent border-none cursor-pointer text-(--text-secondary) transition-all duration-150 hover:bg-(--accent-hover) hover:text-(--text-primary)'
						title='Configura'
					>
						<Settings size={15} />
					</button>

					{/* Bidone rosso pulito con classi native */}
					<button
						onClick={() => onRemove(widgetConfig.i)}
						className='flex items-center justify-center w-8 h-8 rounded-md bg-transparent border-none cursor-pointer text-red-500 dark:text-red-400 transition-all duration-150 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300'
						title='Rimuovi'
					>
						<Trash2 size={15} />
					</button>
				</div>
			</div>

			{/* Body del Widget */}
			<div className='widget-body-container no-drag flex-1 overflow-auto p-3 min-h-0 min-w-0'>
				{WidgetComponent ? (
					<WidgetComponent config={widgetConfig} />
				) : (
					<div
						onClick={() => onEdit(widgetConfig.i)} // <- QUI (anche nello stato vuoto)
						className='h-full flex flex-col items-center justify-center gap-2.5 cursor-pointer rounded-lg border border-dashed border-(--border-color) bg-(--bg-primary)/30 text-(--text-secondary) transition-all duration-200 hover:border-(--text-secondary) hover:bg-(--bg-primary)/60 hover:text-(--text-primary)'
					>
						<Settings
							size={20}
							className='animate-pulse opacity-60'
						/>
						<span className='text-xs font-medium'>
							Configura Widget
						</span>
					</div>
				)}
			</div>

			{/* 4. RIMUOVI COMPLETAMENTE il blocco {showConfig && <WidgetConfigModal ... />} da qui */}
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
