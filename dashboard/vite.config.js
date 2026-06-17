import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
	plugins: [react(), tailwindcss()],
	define: {
		'process.env.NODE_ENV': JSON.stringify(
			mode === 'production' ? 'production' : 'development'
		)
	},
	server: {
		port: 5173,
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true
			}
		}
	}
}));
