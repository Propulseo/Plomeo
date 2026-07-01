// Éditeur « Intro & réassurance » : texte d'intro + pastilles de confiance.
import { mountSingleton } from './singleton.js'

export async function mountIntro(root, onBack) {
  await mountSingleton(root, onBack, {
    title: 'Intro & réassurance',
    section: 'intro',
    intro: "Le texte d'accroche affiché sous le titre, et les 3 pastilles de confiance (badges) de la page d'accueil.",
    fields: [
      {
        cle: 'texte_intro',
        label: "Texte d'accroche",
        type: 'richtext',
        help: 'Phrase d\'introduction affichée sous le grand titre du site.',
      },
      {
        cle: 'pastille_1',
        label: 'Pastille de confiance 1',
        type: 'text',
        placeholder: 'Ex : ★ 4,9/5 Google',
        help: 'Premier badge (avis / note).',
      },
      {
        cle: 'pastille_2',
        label: 'Pastille de confiance 2',
        type: 'text',
        placeholder: 'Ex : 📍 Intervention dans le Var',
        help: 'Deuxième badge (zone d\'intervention).',
      },
      {
        cle: 'pastille_3',
        label: 'Pastille de confiance 3',
        type: 'text',
        placeholder: 'Ex : Devis gratuit',
        help: 'Troisième badge (devis / engagement).',
      },
    ],
  })
}
