import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { cmsPlugin } from './build/vite-plugin-cms.mjs'
import { copyAssetsPlugin } from './build/vite-plugin-copy-assets.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Évite que le watcher Vite plante sur les fichiers lourds/verrouillés
// (vidéos .mov, dossiers d'archives) — erreur EBUSY sous Windows.
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      cmsPlugin({
        url: env.VITE_SUPABASE_URL,
        anonKey: env.VITE_SUPABASE_ANON_KEY,
        isBuild: command === 'build',
      }),
      copyAssetsPlugin(),
    ],
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
          admin: resolve(__dirname, 'admin/index.html'),
        },
      },
    },
  }
})
