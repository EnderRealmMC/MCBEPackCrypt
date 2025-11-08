import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync } from 'fs'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '');

  return {
  plugins: [
    react(),
    {
      name: 'md-file-loader',
      transform(code, id) {
        if (id.endsWith('.md')) {
          const content = readFileSync(id, 'utf-8');
          return {
            code: `export default ${JSON.stringify(content)}`,
            map: null
          };
        }
      }
    }
  ],
  root: 'src/frontend',
  build: {
    outDir: '../../dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/frontend')
    }
  },
  define: {
    global: 'globalThis',
    'process.env.DEPLOYMENT_MODE': JSON.stringify(env.DEPLOYMENT_MODE || 'fullstack'),
    'process.env.NODE_ENV': JSON.stringify(env.NODE_ENV || 'development'),
    'process.env.REQUIRE_EULA_AGREEMENT': JSON.stringify(env.REQUIRE_EULA_AGREEMENT || 'false')
  },
  server: {
    port: parseInt(process.env.FRONTEND_PORT || '3000'),
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.BACKEND_PORT || '3001'}`,
        changeOrigin: true
      }
    }
  },
  publicDir: '../../resources',
  base: '/'
  };
});