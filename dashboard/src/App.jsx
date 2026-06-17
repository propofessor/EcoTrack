import Dashboard from './pages/Dashboard.jsx';
//import "react-grid-layout/css/styles.css";
//import "react-resizable/css/styles.css";

import { ThemeProvider } from './context/ThemeContext.jsx';

export default function App() {
	return (
		<ThemeProvider>
			<Dashboard />
		</ThemeProvider>
	);
}
