import { useState } from 'react'; // <-- Ricordati di importare useState!

import { GridBackground } from 'react-grid-layout/extras';

import { Responsive, useContainerWidth } from 'react-grid-layout';

import { noCompactor } from 'react-grid-layout/core';

import _ from 'lodash';

import { WidgetWrapper } from '../widgets/WidgetWrapper.jsx';

export default function Grid(props) {
	const gridConfig = { rowHeight: 60, margin: [10, 10] };

	const { width, containerRef, mounted } = useContainerWidth();

	// 1. Niente più "const state = {}". Usiamo gli hook di React!

	const [items, setItems] = useState([
		{ i: '0', x: 0, y: 0, w: 2, h: 2, add: true }
	]);

	const [newCounter, setNewCounter] = useState(0);

	const [cols, setCols] = useState(12);

	// Questi forse non ti servono strictamente nello state se non li leggi da qualche parte,

	// ma li mettiamo per completezza rispetto al tuo codice originale

	const [breakpoint, setBreakpoint] = useState('lg');

	const [layout, setLayout] = useState([]);

	const createElement = function (el) {
		const i = el.add ? '+' : el.i;

		const widgetConfig = {
			i: i,

			widgetType: 'DataTable'
		};

		return (
			<div key={i} data-grid={el}>
				<WidgetWrapper widgetConfig={widgetConfig} />
			</div>
		);
	};

	const onAddItem = function () {
		console.log('adding', 'n' + newCounter);

		// 2. Modifica lo stato usando le funzioni "set" (setItems, setNewCounter)

		setItems((prevItems) =>
			prevItems.concat({
				i: 'n' + newCounter,

				x: (prevItems.length * 2) % cols,

				y: Infinity, // lo sbatte in fondo

				w: 2,

				h: 2
			})
		);

		setNewCounter((prevCounter) => prevCounter + 1);
	};

	const onBreakpointChange = function (newBreakpoint, newCols) {
		setBreakpoint(newBreakpoint);

		setCols(newCols);
	};

	const onLayoutChange = function (newLayout) {
		console.log('layout changed', newLayout);

		setLayout(newLayout);
	};

	const onRemoveItem = function (i) {
		console.log('removing', i);

		setItems((prevItems) => _.reject(prevItems, { i: i }));
	};

	return (
		<div>
			<button onClick={onAddItem}>Add Item</button>

			<div ref={containerRef} className='relative border border-red-500'>
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
							compactor={noCompactor}
							preventCollision={true}
						>
							{/* Usa direttamente 'items' invece di 'state.items' */}

							{_.map(items, (el) => createElement(el))}
						</Responsive>
					</>
				)}
			</div>
		</div>
	);
}
