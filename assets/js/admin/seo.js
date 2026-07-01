// Éditeur « Avancé / Référencement » (balises SEO + schema.org du <head>).
import { mountSingleton } from './singleton.js'

export async function mountSeo(root, onBack) {
  await mountSingleton(root, onBack, {
    title: 'Avancé / Référencement',
    section: 'seo',
    intro: 'Réglages techniques pour Google et les partages sur les réseaux. À ne modifier qu\'avec précaution.',
    fields: [
      {
        cle: 'meta_title',
        label: 'Titre Google (balise title)',
        type: 'text',
        help: 'Le titre bleu cliquable affiché dans les résultats Google (~60 caractères).',
        placeholder: 'Ploméo | Plomberie, chauffage… dans le Var (83)',
      },
      {
        cle: 'meta_description',
        label: 'Description Google (meta description)',
        type: 'textarea',
        help: 'Le petit texte gris sous le titre dans Google (~155 caractères).',
      },
      {
        cle: 'og_type',
        label: 'Type de page (og:type)',
        type: 'text',
        help: 'Pour les partages sur les réseaux. En général « website ».',
        placeholder: 'website',
      },
      {
        cle: 'schema_type',
        label: 'Type d\'activité (schema.org)',
        type: 'text',
        help: 'Catégorie de l\'entreprise pour Google. Ex : « Plumber ».',
        placeholder: 'Plumber',
      },
      {
        cle: 'knows_about',
        label: 'Domaines de compétence',
        type: 'textarea',
        help: 'Les 4 métiers, un par ligne (Plomberie, Chauffage, Climatisation, Piscine).',
      },
      {
        cle: 'address_region',
        label: 'Région / département',
        type: 'text',
        help: 'Zone principale. Ex : « Var ».',
        placeholder: 'Var',
      },
      {
        cle: 'address_country',
        label: 'Pays (code)',
        type: 'text',
        help: 'Code pays à 2 lettres. Ex : « FR ».',
        placeholder: 'FR',
      },
    ],
  })
}
