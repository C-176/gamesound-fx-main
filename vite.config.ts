import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'remove-crossorigin-css',
      enforce: 'post',
      transformIndexHtml(html) {
        // Remove crossorigin attribute from stylesheet links to avoid
        // CORS issues with Electron's app:// custom protocol handler
        return html.replace(
          /<link\s+rel="stylesheet"\s+(?:crossorigin\s+)?href="([^"]+)"\s*\/?>/gi,
          '<link rel="stylesheet" href="$1">'
        );
      },
    },
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  base: './',
})
