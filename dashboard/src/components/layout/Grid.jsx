import { useState, useMemo } from 'react';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import { Plus } from 'lucide-react';

import { WidgetWrapper } from '../widgets/WidgetWrapper.jsx';
import { WidgetConfigModal } from '../modals/WidgetConfigModal.jsx';

export default function Grid({ items, setItems }) {
	const { width, containerRef, mounted } = useContainerWidth();

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

	const onBreakpointChange = function (newBreakpoint) {
		setBreakpoint(newBreakpoint);
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

		const dataGrid = { ...el, minW: 2, minH: 2 };

		if (el.isAddPlaceholder) {
			return (
				<div key={el.i} data-grid={dataGrid} className='flex h-full w-full'>
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
			<div key={el.i} data-grid={dataGrid} className='h-full'>
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
						<Responsive
							breakpoints={{
								lg: 1200,
								md: 996,
								sm: 768,
								xs: 480,
								xxs: 0
							}}
							cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
							rowHeight={150}
							margin={[10, 10]}
							width={width}
							onLayoutChange={onLayoutChange}
							onBreakpointChange={onBreakpointChange}
							draggableHandle='.drag-handle'
						>
							{items.map((el) => createElement(el))}
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
