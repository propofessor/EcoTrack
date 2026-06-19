import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';
import './i18n'; // RNF: i18n initialization (must run before first render)

const root = createRoot(document.getElementById('root'));
root.render(<App />);
