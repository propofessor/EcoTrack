import { useState, useMemo } from 'react';
import { GridBackground } from 'react-grid-layout/extras';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import _ from 'lodash';
import { Plus } from 'lucide-react';

import { WidgetWrapper } from '../widgets/WidgetWrapper.jsx';
import { WidgetConfigModal } from '../modals/WidgetConfigModal.jsx';
export default function Grid({ items, setItems, ...props }) {
	// <-- MODIFICATO: accetta le props
	const gridConfig = { rowHeight: 60, margin: [10, 10] };
	const { width, containerRef, mounted } = useContainerWidth();

	const [cols, setCols] = useState(12);
	const [breakpoint, setBreakpoint] = useState('lg');
	const [newCounter, setNewCounter] = useState(1);
	const [editingWidgetId, setEditingWidgetId] = useState(null);
	const [configuringPlaceholderId, setConfiguringPlaceholderId] =
		useState(null);
	// Stato iniziale con un placeholder predefinito.
	// Usiamo y: 0 per farlo partire in alto, la griglia lo compatterà correttamente.

	// Sincronizza lo stato degli `items` con la posizione reale nella griglia (drag & drop)
	const onLayoutChange = function (newLayout) {
		setItems((prevItems) => {
			return prevItems.map((item) => {
				const layoutItem = newLayout.find((l) => l.i === item.i);
				if (layoutItem) {
					return {
						...item,
						x: layoutItem.x,
						y: layoutItem.y,
						w: layoutItem.w,
						h: layoutItem.h
					};
				}
				return item;
			});
		});
	};

	const onBreakpointChange = function (newBreakpoint, newCols) {
		setBreakpoint(newBreakpoint);
		setCols(newCols);
	};

	// Aggiornamento configurazione widget esistenti
	const handleUpdateWidget = (id, updates) => {
		setItems((prev) =>
			prev.map((item) => (item.i === id ? { ...item, ...updates } : item))
		);
	};

	// Rimozione widget esistenti
	const handleRemoveWidget = (id) => {
		setItems((prev) => prev.filter((item) => item.i !== id));
	};

	// Salvataggio dal WidgetConfigModal aperto da un placeholder
	const handleSaveNewWidget = (updates) => {
		setItems((prevItems) => {
			const updatedItems = [...prevItems];
			const index = updatedItems.findIndex(
				(i) => i.i === configuringPlaceholderId
			);

			if (index !== -1) {
				// 1. Converti il placeholder in un widget effettivo
				updatedItems[index] = {
					...updatedItems[index],
					...updates
				};
				delete updatedItems[index].isAddPlaceholder;

				// 2. Calcola il prossimo ID per il nuovo placeholder
				const nextId = 'placeholder_' + newCounter;
				setNewCounter((c) => c + 1);

				// 3. Aggiungi il nuovo placeholder alla fine.
				// RGL con compactType="vertical" prenderà y: 999 e lo "tirerà su"
				// fino al primo spazio vuoto disponibile in fondo alla griglia.
				updatedItems.push({
					i: nextId,
					x: 0,
					y: 999, // Forza l'elemento in fondo, ci pensa il compattatore
					w: 2,
					h: 2,
					isAddPlaceholder: true
				});
			}

			return updatedItems;
		});

		setConfiguringPlaceholderId(null);
	};

	const handleEditWidget = (id) => {
		setEditingWidgetId(id);
	};

	const createElement = function (el) {
		// Se è un placeholder per aggiungere widget
		if (el.isAddPlaceholder) {
			return (
				<div key={el.i} data-grid={el} className='flex h-full w-full'>
					<div
						onClick={() => setConfiguringPlaceholderId(el.i)}
						className='flex flex-1 flex-col items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-(--border-color) bg-(--bg-primary)/30 text-(--text-secondary) transition-all duration-200 hover:border-(--text-secondary) hover:bg-(--bg-primary)/60 hover:text-(--text-primary)'
					>
						<Plus size={32} className='opacity-60' />
						<span className='text-sm font-medium'>
							Aggiungi Widget
						</span>
					</div>
				</div>
			);
		}

		return (
			<div key={el.i} data-grid={el}>
				<WidgetWrapper
					widgetConfig={el}
					onUpdate={handleUpdateWidget}
					onRemove={handleRemoveWidget}
					onEdit={handleEditWidget} // 3. PASSA LA PROP onEdit QUI
				/>
			</div>
		);
	};

	// Identifica la config in fase di edit per pre-popolare il modal
	const configuringWidget = useMemo(
		() => items.find((i) => i.i === configuringPlaceholderId),
		[items, configuringPlaceholderId]
	);

	return (
		<div>
			<div ref={containerRef} className='relative mt-4'>
				{mounted && (
					<>
						<GridBackground
							width={width}
							cols={cols}
							rowHeight={30}
							containerPadding={gridConfig.margin}
							color='rgba(210, 147, 128, 0.3)'
							borderRadius={0}
							rows={100}
						/>

						<Responsive
							breakpoints={{
								lg: 1200,
								md: 996,
								sm: 768,
								xs: 480,
								xxs: 0
							}}
							cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
							gridConfig={gridConfig}
							width={width}
							onLayoutChange={onLayoutChange}
							onBreakpointChange={onBreakpointChange}
							/*compactor={
								horizontalCompactor
							} /* <-- Abilita esplicitamente il compattatore verticale */
						>
							{_.map(items, (el) => createElement(el))}
						</Responsive>
					</>
				)}
			</div>

			{/* Renderizza il Modale solo quando un Add Placeholder viene cliccato */}
			{configuringPlaceholderId && (
				<WidgetConfigModal
					widget={configuringWidget}
					onSave={handleSaveNewWidget}
					onClose={() => setConfiguringPlaceholderId(null)}
				/>
			)}
			{editingWidgetId && (
				<WidgetConfigModal
					widget={items.find((i) => i.i === editingWidgetId)}
					onSave={(updates) => {
						handleUpdateWidget(editingWidgetId, updates);
						setEditingWidgetId(null);
					}}
					onClose={() => setEditingWidgetId(null)}
				/>
			)}
		</div>
	);
}
