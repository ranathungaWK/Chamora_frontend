import { defineConfig, loadEnv } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://13.49.183.64:8000'
  const compareServiceTarget = env.VITE_COMPARE_SERVICE_URL || 'http://13.49.183.64:8030'

  return {
    plugins: [
      figmaAssetResolver(),
      // The React and Tailwind plugins are both required for Make, even if
      // Tailwind is not being actively used – do not remove them
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        // Alias @ to the src directory
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/retriever': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/compare-service': {
          target: compareServiceTarget,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/compare-service/, ''),
        },
        '/recommendation-service': {
          target: env.VITE_RECOMMENDATION_SERVICE_URL || proxyTarget,
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/recommendation-service/, ''),
        },
      },
    },

    // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
    assetsInclude: ['**/*.svg', '**/*.csv'],
  }
})
