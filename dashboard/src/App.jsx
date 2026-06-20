import Dashboard from './pages/Dashboard.jsx';

import { ThemeProvider } from './context/ThemeContext.jsx';
import CookieBanner from './components/ui/CookieBanner.jsx';

export default function App() {
	return (
		<ThemeProvider>
			<Dashboard />
			{/* RNF8: cookie consent banner — shown on first visit */}
			<CookieBanner />
		</ThemeProvider>
	);
}
