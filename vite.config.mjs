import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Évite que le watcher Vite plante sur les fichiers lourds/verrouillés
// (vidéos .mov, dossiers d'archives) — erreur EBUSY sous Windows.
export default defineConfig({
  server: {
    watch: {
      ignored: [
        '**/Elements/Vidéo/**',
        '**/Plomeo v1/**',
        '**/*.mov',
        '**/*.mp4',
        '**/*-backup.html',
      ],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        confidentialite: resolve(__dirname, 'confidentialite.html'),
        mentions: resolve(__dirname, 'mentions-legales.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
})
