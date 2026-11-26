import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false
  },
  build: {
    rollupOptions: {
      // Sito/app, pannello amministratore e pagina di disiscrizione dalle email
      input: {
        main: 'index.html',
        admin: 'admin.html',
        unsubscribe: 'unsubscribe.html',
        benvenuto: 'benvenuto.html',
        anteprima: 'anteprima.html'
      }
    }
  }
});
