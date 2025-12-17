import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    build({
      exclude: [
        '/static/*',
        '/feedback.html',
        '/activity.html',
        '/activity-detail.html',
        '/admin-dashboard.html',
        '/admin-login.html',
        '/staff-face-scanner.html',
        '/staff-pass-scanner.html',
        '/vendor-dashboard.html',
        '/vendor-login.html',
        '/welcome.html',
        '/guestconnect-logo.png',
        '/guestconnect-logo-small.png',
        '/guestconnect-logo-horizontal.png'
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
