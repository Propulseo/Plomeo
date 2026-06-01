import { defineConfig } from 'vite'

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
})
