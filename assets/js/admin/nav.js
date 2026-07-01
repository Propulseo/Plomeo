// Éditeur du menu de navigation & boutons de l'en-tête (section "nav").
import { mountSingleton } from './singleton.js'

export async function mountNav(root, onBack) {
  await mountSingleton(root, onBack, {
    title: 'Menu & boutons',
    section: 'nav',
    intro: 'Libellés des liens du menu en haut du site et du bouton de l\'en-tête.',
    fields: [
      { cle: 'nav_accueil', label: 'Lien « Accueil »', type: 'text', help: 'Premier lien du menu' },
      { cle: 'nav_apropos', label: 'Lien « À propos »', type: 'text' },
      { cle: 'nav_prestations', label: 'Lien « Prestations »', type: 'text' },
      { cle: 'nav_realisations', label: 'Lien « Réalisations »', type: 'text' },
      { cle: 'nav_conseils', label: 'Lien « Conseils »', type: 'text' },
      { cle: 'nav_cta', label: 'Bouton de l\'en-tête', type: 'text', help: 'Le bouton bleu en haut à droite (mène au contact)' },
    ],
  })
}
