import Dashboard from './pages/Dashboard.jsx';

import { ThemeProvider } from './context/ThemeContext.jsx';
import CookieBanner from './components/ui/CookieBanner.jsx';

export default function App() {
	return (
		<ThemeProvider>
			<Dashboard />
			{}
			<CookieBanner />
		</ThemeProvider>
	);
}
