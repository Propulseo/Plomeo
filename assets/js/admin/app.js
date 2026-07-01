// Back office Ploméo — coquille : connexion + tableau de tuiles + routage vers les éditeurs.
import { supabase, configured } from './client.js'
import { mountRealisations } from './realisations.js'
import { mountPiliers } from './piliers.js'
import { mountProcess } from './process.js'
import { mountAvis } from './avis.js'
import { mountFaq } from './faq.js'
import { mountArticles } from './articles.js'
import { mountCommunes } from './communes.js'
import { mountHero } from './hero.js'
import { mountNav } from './nav.js'
import { mountIntro } from './intro.js'
import { mountAbout } from './about.js'
import { mountContact } from './contact.js'
import { mountSections } from './sections.js'
import { mountFooter } from './footer.js'
import { mountLegal } from './legal.js'
import { mountSeo } from './seo.js'

const app = document.getElementById('app')
let current = null

init()
async function init() {
  if (!configured) return renderConfigMissing()
  const { data } = await supabase.auth.getSession()
  current = data.session
  current ? renderDashboard() : renderLogin()
  supabase.auth.onAuthStateChange((event, session) => {
    const wasLogged = !!current
    current = session
    if (!session) return renderLogin()
    if (!wasLogged) renderDashboard() // connexion : on ouvre le tableau de bord
    // sinon (rafraîchissement de jeton) : on ne perturbe pas la vue en cours
  })
}

function renderConfigMissing() {
  app.innerHTML = `
    <div class="adm-login">
      <div class="adm-login__box">
        <div class="adm-logo">Ploméo</div>
        <p class="adm-error">Configuration à compléter</p>
        <p class="adm-muted">Ajoute ces 2 lignes dans <b>.env.local</b> (à la racine du projet), puis recharge :</p>
        <pre class="adm-code">VITE_SUPABASE_URL=https://qetptoyouhtyzueequdy.supabase.co
VITE_SUPABASE_ANON_KEY=ta_clé_anon</pre>
        <p class="adm-muted">La clé « anon » est dans Supabase → Settings → API → Project API keys.</p>
      </div>
    </div>`
}

// ---------- Connexion ----------
function renderLogin() {
  app.innerHTML = `
    <div class="adm-login">
      <form class="adm-login__box" id="lform">
        <div class="adm-logo">Ploméo</div>
        <p class="adm-muted">Espace administration</p>
        <label>Email <input type="email" id="l-email" autocomplete="username" required></label>
        <label>Mot de passe <input type="password" id="l-pass" autocomplete="current-password" required></label>
        <button class="primary" id="l-go" type="submit">Se connecter</button>
        <p class="adm-error" id="l-err" hidden></p>
      </form>
    </div>`
  document.getElementById('lform').addEventListener('submit', async e => {
    e.preventDefault()
    const email = document.getElementById('l-email').value.trim()
    const password = document.getElementById('l-pass').value
    const err = document.getElementById('l-err'); err.hidden = true
    const btn = document.getElementById('l-go'); btn.disabled = true; btn.textContent = 'Connexion…'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      err.textContent = 'Email ou mot de passe incorrect.'
      err.hidden = false; btn.disabled = false; btn.textContent = 'Se connecter'
    }
  })
}

// ---------- Tableau de bord ----------
const TILES = [
  { key: 'hero', label: "Accueil (bannière)", icon: '🏠', ready: true },
  { key: 'nav', label: 'Menu & boutons', icon: '🧭', ready: true },
  { key: 'intro', label: 'Intro & réassurance', icon: '✨', ready: true },
  { key: 'piliers', label: 'Nos expertises', icon: '🧰', ready: true },
  { key: 'process', label: 'Étapes (process)', icon: '📋', ready: true },
  { key: 'realisations', label: 'Réalisations', icon: '🛠️', ready: true },
  { key: 'avis', label: 'Avis clients', icon: '⭐', ready: true },
  { key: 'communes', label: 'Communes desservies', icon: '📍', ready: true },
  { key: 'blog', label: 'Articles / conseils', icon: '📝', ready: true },
  { key: 'faq', label: 'Questions / FAQ', icon: '❓', ready: true },
  { key: 'about', label: 'À propos (Ayoub)', icon: '👤', ready: true },
  { key: 'contact', label: 'Contact & coordonnées', icon: '✉️', ready: true },
  { key: 'sections', label: 'En-têtes de sections', icon: '🔖', ready: true },
  { key: 'footer', label: 'Pied de page', icon: '🦶', ready: true },
  { key: 'legal', label: 'Pages légales', icon: '📄', ready: true },
  { key: 'seo', label: 'Avancé / Référencement', icon: '⚙️', ready: true },
]

// Barre du haut PERMANENTE : on ne la reconstruit pas entre les vues.
function ensureShell() {
  let view = document.getElementById('adm-view')
  if (view) return view
  app.innerHTML = `
    <header class="adm-topbar">
      <div class="adm-logo" id="adm-home" role="button" tabindex="0" style="cursor:pointer">Ploméo <small>Admin</small></div>
      <div class="adm-topbar__r">
        <a class="adm-link" href="/" target="_blank" rel="noopener">Voir le site ↗</a>
        <button class="ghost" id="logout">Déconnexion</button>
      </div>
    </header>
    <div id="adm-view"></div>`
  document.getElementById('logout').onclick = () => supabase.auth.signOut()
  document.getElementById('adm-home').onclick = () => renderDashboard()
  return document.getElementById('adm-view')
}

function renderDashboard() {
  const view = ensureShell()
  view.innerHTML = `
    <main class="adm-main">
      <p class="adm-hello">Bonjour 👋 Choisis ce que tu veux modifier.</p>
      <div class="adm-tiles">
        ${TILES.map(t => `
          <button class="adm-tile ${t.ready ? '' : 'soon'}" data-tile="${t.key}" ${t.ready ? '' : 'disabled'}>
            <span class="adm-tile__i">${t.icon}</span>
            <span class="adm-tile__l">${t.label}</span>
            ${t.ready ? '' : '<span class="adm-tile__soon">bientôt</span>'}
          </button>`).join('')}
      </div>
    </main>`
  view.querySelectorAll('[data-tile]').forEach(b => b.onclick = () => openEditor(b.dataset.tile))
}

const EDITORS = {
  realisations: mountRealisations,
  piliers: mountPiliers,
  process: mountProcess,
  avis: mountAvis,
  faq: mountFaq,
  blog: mountArticles,
  communes: mountCommunes,
  hero: mountHero,
  nav: mountNav,
  intro: mountIntro,
  about: mountAbout,
  contact: mountContact,
  sections: mountSections,
  footer: mountFooter,
  legal: mountLegal,
  seo: mountSeo,
}

function openEditor(key) {
  const mount = EDITORS[key]
  if (!mount) return
  const view = ensureShell()
  view.innerHTML = ''
  const container = document.createElement('main')
  container.className = 'adm-main'
  view.appendChild(container)
  mount(container, () => renderDashboard())
}
