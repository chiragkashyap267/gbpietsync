import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "GBPIET sync",
        short_name: "GBPIET",
        theme_color: "#ffffff",
        background_color: "#356b81",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "/gbpietsync2.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/gbpietsync.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/gbpietsync2.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      }
    })
  ]
})
