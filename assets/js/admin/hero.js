// Éditeur de la bannière d'accueil (section « hero » de index.html).
// Fichier mince : délègue tout au socle mountSingleton.
import { mountSingleton } from './singleton.js'

export async function mountHero(root, onBack) {
  await mountSingleton(root, onBack, {
    title: 'Accueil (bannière)',
    section: 'hero',
    intro: 'Le grand bandeau tout en haut de la page d\'accueil.',
    fields: [
      // « Surtitre » (eyebrow) retiré : à cet emplacement le hero affiche le
      // logo, pas de texte — le champ n'avait donc aucun effet sur le site.
      { cle: 'titre', label: 'Titre principal', type: 'text',
        help: 'Le grand mot en gros (ex : « L\'ARTISAN »).' },
      { cle: 'accent', label: 'Suite du titre (accent)', type: 'text',
        help: 'La ligne colorée juste sous le titre (ex : « qu\'il vous faut ! »).' },
      { cle: 'lead', label: 'Phrase d\'accroche', type: 'textarea',
        help: 'Le paragraphe sous le titre.' },
      { cle: 'cta1_label', label: 'Bouton principal — libellé', type: 'text',
        help: 'Texte du bouton orange (ex : « Demander un devis »).' },
      { cle: 'cta2_label', label: 'Bouton secondaire — libellé', type: 'text',
        help: 'Texte du second bouton (ex : « Voir les réalisations »).' },
      { cle: 'image_mobile', label: 'Image de fond (mobile)', type: 'image', bucket: 'site',
        help: 'Photo affichée derrière la bannière sur téléphone (la vidéo ne s\'y affiche pas).' },
    ],
  })
}
