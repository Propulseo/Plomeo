// Éditeur de la section « À propos » (présentation d'Ayoub, #about).
import { mountSingleton } from './singleton.js'

export async function mountAbout(root, onBack) {
  await mountSingleton(root, onBack, {
    title: 'À propos (Ayoub)',
    section: 'about',
    intro: "La section de présentation du fondateur, en page d'accueil.",
    fields: [
      { cle: 'surtitre', label: 'Surtitre', type: 'text', placeholder: 'Ex : Le fondateur' },
      { cle: 'titre', label: 'Titre', type: 'text', help: 'Le grand titre de la section', placeholder: 'Ex : Ayoub Berkane, artisan de terrain' },
      { cle: 'citation', label: 'Citation', type: 'textarea', help: "La phrase mise en avant (entre guillemets)" },
      { cle: 'bio', label: 'Présentation', type: 'richtext', help: 'Les paragraphes de présentation (gras / italique / lien possibles)' },
      { cle: 'nom', label: 'Nom', type: 'text', placeholder: 'Ex : Ayoub Berkane' },
      { cle: 'role', label: 'Rôle', type: 'text', placeholder: 'Ex : Fondateur & dirigeant' },
      { cle: 'photo', label: 'Photo', type: 'image', bucket: 'site', help: 'Portrait du fondateur' },
      { cle: 'annee', label: 'Année de création', type: 'text', help: 'Affichée sur le badge', placeholder: 'Ex : 2023' },
      { cle: 'annee_label', label: 'Libellé sous l\'année', type: 'text', placeholder: 'Ex : Création de Ploméo' },
    ],
  })
}
