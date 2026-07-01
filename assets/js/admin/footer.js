// Éditeur du pied de page (section site_content « footer »).
import { mountSingleton } from './singleton.js'

export async function mountFooter(root, onBack) {
  await mountSingleton(root, onBack, {
    title: 'Pied de page',
    section: 'footer',
    intro: 'Le bas de toutes les pages : baseline, copyright, réseaux sociaux et liens légaux.',
    fields: [
      { cle: 'baseline', label: 'Texte du pied de page', type: 'textarea',
        help: 'La phrase d\'accroche sous le logo, en bas de page.' },
      { cle: 'reseau_label', label: 'Libellé du réseau social', type: 'text',
        help: 'Ex : « Instagram · @sarl_plomeo ».' },
      { cle: 'reseau_url', label: 'Lien du réseau social', type: 'url',
        placeholder: 'https://www.instagram.com/sarl_plomeo' },
      { cle: 'copyright', label: 'Mention copyright', type: 'text',
        help: 'La ligne « © … Tous droits réservés ».' },
      { cle: 'mentions_label', label: 'Libellé « Mentions légales »', type: 'text' },
      { cle: 'mentions_url', label: 'Lien « Mentions légales »', type: 'text',
        help: 'Page interne, ex : mentions-legales.html' },
      { cle: 'confidentialite_label', label: 'Libellé « Confidentialité »', type: 'text' },
      { cle: 'confidentialite_url', label: 'Lien « Confidentialité »', type: 'text',
        help: 'Page interne, ex : confidentialite.html' },
    ],
  })
}
