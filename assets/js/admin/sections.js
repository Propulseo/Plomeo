// Éditeur des en-têtes de sections (surtitre + titre de chaque grande section).
import { mountSingleton } from './singleton.js'

export async function mountSections(root, onBack) {
  await mountSingleton(root, onBack, {
    title: 'En-têtes de sections',
    section: 'sections',
    intro: "Le petit surtitre et le grand titre affichés en haut de chaque section. Le titre peut contenir une partie en italique (balise <em>).",
    fields: [
      { cle: 'about_eyebrow', label: 'Fondateur — surtitre', type: 'text' },
      { cle: 'about_titre', label: 'Fondateur — titre', type: 'richtext', help: 'Astuce : mets en italique la partie qui doit ressortir.' },
      { cle: 'pil_eyebrow', label: 'Expertises — surtitre', type: 'text' },
      { cle: 'pil_titre', label: 'Expertises — titre', type: 'richtext' },
      { cle: 'pil_intro', label: 'Expertises — phrase d\'intro', type: 'textarea' },
      { cle: 'process_eyebrow', label: 'Déroulé — surtitre', type: 'text' },
      { cle: 'process_titre', label: 'Déroulé — titre', type: 'richtext' },
      { cle: 'work_eyebrow', label: 'Réalisations — surtitre', type: 'text' },
      { cle: 'work_titre', label: 'Réalisations — titre', type: 'richtext' },
      { cle: 'zone_eyebrow', label: 'Zone d\'intervention — surtitre', type: 'text' },
      { cle: 'zone_titre', label: 'Zone d\'intervention — titre', type: 'richtext' },
      { cle: 'zone_intro', label: 'Zone d\'intervention — phrase d\'intro', type: 'textarea' },
      { cle: 'blog_eyebrow', label: 'Conseils — surtitre', type: 'text' },
      { cle: 'blog_titre', label: 'Conseils — titre', type: 'richtext' },
      { cle: 'faq_eyebrow', label: 'FAQ — surtitre', type: 'text' },
      { cle: 'faq_titre', label: 'FAQ — titre', type: 'richtext' },
      { cle: 'contact_eyebrow', label: 'Contact — surtitre', type: 'text' },
      { cle: 'contact_titre', label: 'Contact — titre', type: 'richtext' },
      { cle: 'contact_desc', label: 'Contact — phrase d\'intro', type: 'textarea' },
    ],
  })
}
