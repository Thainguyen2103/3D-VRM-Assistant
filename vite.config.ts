import { defineConfig } from 'vite';

export default defineConfig({
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
        profile: './profile.html'
      }
    }
  }
});
