// Éditeur « Contact & coordonnées » — coordonnées source unique propagées partout.
import { mountSingleton } from './singleton.js'

export async function mountContact(root, onBack) {
  await mountSingleton(root, onBack, {
    title: 'Contact & coordonnées',
    section: 'identite',
    intro: 'Ces coordonnées sont utilisées partout sur le site (en-tête, pied de page, section contact). Une seule modification ici met tout à jour.',
    fields: [
      { cle: 'telephone', label: 'Téléphone', type: 'tel', placeholder: '06 95 16 58 89' },
      { cle: 'email', label: 'Email', type: 'email', placeholder: 'contact@plomeo.fr' },
      { cle: 'instagram', label: 'Lien Instagram', type: 'url', help: 'Adresse complète du profil', placeholder: 'https://www.instagram.com/sarl_plomeo' },
      { cle: 'zone', label: "Zone d'intervention", type: 'text', placeholder: 'Var (83)' },
      { cle: 'message_succes', label: 'Message de confirmation', type: 'text', help: 'Affiché après l’envoi réussi du formulaire' },
      { cle: 'message_erreur', label: 'Message d’erreur', type: 'textarea', help: 'Affiché si l’envoi échoue (pense à y laisser le téléphone)' },
      { cle: 'bouton_envoi', label: 'Texte du bouton pendant l’envoi', type: 'text', placeholder: 'Envoi…' },
    ],
  })
}
