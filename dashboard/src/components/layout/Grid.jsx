import { useState, useMemo } from 'react';
import { GridBackground } from 'react-grid-layout/extras';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import _ from 'lodash';
import { Plus } from 'lucide-react';

import { WidgetWrapper } from '../widgets/WidgetWrapper.jsx';
import { WidgetConfigModal } from '../modals/WidgetConfigModal.jsx';

export default function Grid({ items, setItems }) {
	const gridConfig = { rowHeight: 60, margin: [10, 10] };
	const { width, containerRef, mounted } = useContainerWidth();

	const [cols, setCols] = useState(12);
	const [, setBreakpoint] = useState('lg');
	const [editingWidgetId, setEditingWidgetId] = useState(null);
	const [configuringPlaceholderId, setConfiguringPlaceholderId] =
		useState(null);

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

	const handleUpdateWidget = (id, updates) => {
		setItems((prev) =>
			prev.map((item) => (item.i === id ? { ...item, ...updates } : item))
		);
	};

	const handleRemoveWidget = (id) => {
		setItems((prev) => prev.filter((item) => item.i !== id));
	};

	const handleSaveNewWidget = (updates) => {
		setItems((prevItems) => {
			const updatedItems = [...prevItems];
			const index = updatedItems.findIndex(
				(i) => i.i === configuringPlaceholderId
			);

			if (index !== -1 && updatedItems[index].isAddPlaceholder) {
				updatedItems[index] = {
					...updatedItems[index],
					...updates
				};
				delete updatedItems[index].isAddPlaceholder;

				// Derive next ID from prevItems so it's always unique, regardless
				// of any external counter state that could be stale or reset.
				const maxN = prevItems.reduce((max, item) => {
					const m = /^placeholder_(\d+)$/.exec(item.i);
					return m ? Math.max(max, Number(m[1])) : max;
				}, -1);

				updatedItems.push({
					i: 'placeholder_' + (maxN + 1),
					x: 0,
					y: 999,
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
		if (el.isAddPlaceholder) {
			return (
				<div key={el.i} data-grid={el} className='flex h-full w-full'>
					<div
						onClick={() => setConfiguringPlaceholderId(el.i)}
						className='add-widget-cell flex flex-1 flex-col items-center justify-center gap-2'
					>
						<Plus size={32} className='add-widget-icon' />
						<span className='add-widget-label'>
							Aggiungi Widget
						</span>
					</div>
				</div>
			);
		}

		return (
			<div key={el.i} data-grid={el} className='h-full'>
				<WidgetWrapper
					widgetConfig={el}
					onUpdate={handleUpdateWidget}
					onRemove={handleRemoveWidget}
					onEdit={handleEditWidget}
				/>
			</div>
		);
	};

	const configuringWidget = useMemo(
		() => items.find((i) => i.i === configuringPlaceholderId),
		[items, configuringPlaceholderId]
	);

	return (
		<div>
			<div ref={containerRef} className='relative mt-4'>
				{mounted && (
					<>
						{/*<GridBackground
							width={width}
							cols={cols}
							rowHeight={30}
							containerPadding={gridConfig.margin}
							color='rgba(210, 147, 128, 0.3)'
							borderRadius={0}
							rows={100}
						/>*/}

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
							draggableHandle='.drag-handle'
						>
							{_.map(items, (el) => createElement(el))}
						</Responsive>
					</>
				)}
			</div>

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
