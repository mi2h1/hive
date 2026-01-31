import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/hive/', // GitHub Pages用
  resolve: {
    // Three.jsの重複を防ぐ（dddice-js と @react-three/fiber の両方が使用）
    dedupe: ['three'],
  },
  build: {
    rollupOptions: {
      output: {
        // Three.jsを含むライブラリを別チャンクに分離
        manualChunks: {
          'three-vendor': ['three'],
          'dddice': ['dddice-js'],
        },
      },
    },
  },
})
