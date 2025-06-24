import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	plugins: [sveltekit({
		onwarn: (warning, handler) => {
			// Ignore specific warnings
			if (warning.code === 'css-unused-selector') return;
			if (warning.code === 'element_invalid_self_closing_tag') return;
			if (warning.code === 'a11y_no_noninteractive_tabindex') return;
			if (warning.code === 'a11y_label_has_associated_control') return;
			if (warning.code === 'a11y_no_noninteractive_element_interactions') return;
			if (warning.code === 'a11y_autofocus') return;
			if (warning.code === 'export_let_unused') return;
			
			// Pass through other warnings
			handler(warning);
		}
	})],
	
	root: process.cwd(),
	
	server: {
		port: 8005,
		host: '0.0.0.0'
	},
	
	build: {
		target: 'esnext',
		minify: 'terser',
		sourcemap: false,
		rollupOptions: {
			onwarn: (warning, warn) => {
				// Ignore specific warnings during build
				if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
				if (warning.message.includes('Self-closing HTML tags')) return;
				warn(warning);
			}
		}
	},

	resolve: {
		alias: {
			'$lib': path.resolve('./src/lib')
		}
	},

	optimizeDeps: {
		include: [],
		exclude: []
	}
});