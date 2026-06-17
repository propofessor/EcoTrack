import Header from '../components/layout/Header.jsx';
import Grid from '../components/layout/Grid.jsx';

export default function Dashboard() {
	return (
		<div
			style={{
				padding: '20px',
				minHeight: '100vh',
				background: 'var(--bg-primary)'
			}}
		>
			<Header className='w-full' />
			<Grid />
			{/* Widget Configuration Modal }
      {configuringWidget && (
        <WidgetConfigModal
          widget={configuringWidget}
          onSave={(updates) => {
            console.log("Saving widget config", configuringWidget.i, updates)
            updateWidget(configuringWidget.i, updates)
            setConfiguringWidget(null)
          }}
          onClose={() => {
            console.log("Closing config for widget", configuringWidget.i)
            removeWidget(configuringWidget.i)
            setConfiguringWidget(null)
          }}
        />
      )}
  
    */}
		</div>
	);
}
