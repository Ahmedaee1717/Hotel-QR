import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

export default defineConfig({
  // Build id for self-updating pages (OPS_BUILD in src/index.tsx).
  define: {
    __OPS_BUILD__: JSON.stringify(Date.now().toString(36))
  },
  plugins: [
    build({
      exclude: [
        '/static/*',
        '/feedback.html',
        '/activity.html',
        '/activity-detail.html',
        '/admin-login.html',
        '/staff-face-scanner.html',
        '/staff-pass-scanner.html',
        '/staff-unified-scanner.html',
        '/vendor-dashboard.html',
        '/vendor-login.html',
        '/waiter-dashboard.html',
        '/welcome.html',
        '/guestconnect-logo.png',
        '/guestconnect-logo-small.png',
        '/guestconnect-logo-horizontal.png',
        '/guestconnect-logo-transparent.png',
        '/onepass-logo.png',
        '/*.png',
        '/*.jpg',
        '/*.jpeg',
        '/*.gif',
        '/*.svg',
        '/*.ico',
        '/*.webp'
      ]
    }),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ],
  publicDir: 'public',
  build: {
    outDir: 'dist'
  }
})
