import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const base = process.env.VITE_BASE ?? "/"
const publicOrigin = (process.env.VITE_PUBLIC_ORIGIN ?? "https://citeduo.com").replace(/\/+$/, "")
const publicUrl = new URL(base.endsWith("/") ? base : `${base}/`, `${publicOrigin}/`).href
const socialImage = new URL("site-assets/social-preview.jpg", publicUrl).href

export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: "cite-public-meta",
      transformIndexHtml(html) {
        return html
          .replaceAll("%PUBLIC_URL%", publicUrl)
          .replaceAll("%PUBLIC_SOCIAL_IMAGE%", socialImage)
      },
    },
  ],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  build: {
    // three.js is a large but lazily-loaded chunk (only on 3D toggle).
    chunkSizeWarningLimit: 1400,
  },
})

