// Éditeur des pages légales (mentions légales + confidentialité).
import { mountSingleton } from './singleton.js'

export async function mountLegal(root, onBack) {
  await mountSingleton(root, onBack, {
    title: 'Pages légales',
    section: 'legal',
    intro: 'Le contenu des pages « Mentions légales » et « Confidentialité », plus les libellés communs.',
    fields: [
      {
        cle: 'marque',
        label: 'Nom de la marque (barre du haut)',
        type: 'text',
        placeholder: 'Ploméo',
        help: 'Affiché en haut à droite des pages légales.',
      },
      {
        cle: 'retour_haut',
        label: 'Libellé du retour (en haut)',
        type: 'text',
        placeholder: '← Retour à l\'accueil',
      },
      {
        cle: 'retour_bas',
        label: 'Libellé du retour (en bas)',
        type: 'text',
        placeholder: '← Revenir à l\'accueil',
      },
      {
        cle: 'mentions_legales',
        label: 'Mentions légales',
        type: 'richtext',
        help: 'Corps complet de la page « Mentions légales ».',
      },
      {
        cle: 'confidentialite',
        label: 'Politique de confidentialité',
        type: 'richtext',
        help: 'Corps complet de la page « Politique de confidentialité ».',
      },
    ],
  })
}
