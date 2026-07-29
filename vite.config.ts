import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    watch: {
      ignored: ['**/animations/**']
    },
    proxy: {
      '/fish-api': {
        target: 'https://api.fish.audio',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fish-api/, '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        profile: './profile.html',
        login: './login.html'
      }
    }
  }
});
