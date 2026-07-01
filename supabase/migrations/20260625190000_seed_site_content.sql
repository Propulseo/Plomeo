-- ============================================================
--  Seed des contenus « texte » (singletons) → table site_content
--  Valeurs = texte ACTUEL du site, extrait de index.html / pages légales.
--  to_jsonb(...::text) : chaque valeur est stockée comme chaîne JSON.
--  ON CONFLICT DO NOTHING : ne réécrit jamais une valeur déjà éditée.
-- ============================================================

insert into public.site_content (section, cle, valeur) values

-- ---------- hero ----------
('hero','eyebrow',     to_jsonb($v$Ploméo,$v$::text)),
('hero','titre',       to_jsonb($v$L'ARTISAN$v$::text)),
('hero','accent',      to_jsonb($v$qu'il vous faut !$v$::text)),
('hero','lead',        to_jsonb($v$Votre artisan plombier dans le Var. Plomberie, chauffage, climatisation et piscine, du dépannage à la construction neuve.$v$::text)),
('hero','cta1_label',  to_jsonb($v$Demander un devis$v$::text)),
('hero','cta2_label',  to_jsonb($v$Voir les réalisations$v$::text)),

-- ---------- nav ----------
('nav','nav_accueil',      to_jsonb($v$Accueil$v$::text)),
('nav','nav_apropos',      to_jsonb($v$À propos$v$::text)),
('nav','nav_prestations',  to_jsonb($v$Prestations$v$::text)),
('nav','nav_realisations', to_jsonb($v$Réalisations$v$::text)),
('nav','nav_conseils',     to_jsonb($v$Conseils$v$::text)),
('nav','nav_cta',          to_jsonb($v$Contact$v$::text)),

-- ---------- intro ----------
('intro','texte_intro', to_jsonb($v$Votre artisan plombier dans le Var. Plomberie, chauffage, climatisation et piscine, du dépannage à la construction neuve.$v$::text)),
('intro','pastille_1',  to_jsonb($v$★ 4,9/5 Google$v$::text)),
('intro','pastille_2',  to_jsonb($v$📍 Intervention dans le Var$v$::text)),
('intro','pastille_3',  to_jsonb($v$Devis gratuit$v$::text)),

-- ---------- about (Ayoub) ----------
('about','surtitre',    to_jsonb($v$Le fondateur$v$::text)),
('about','titre',       to_jsonb($v$Ayoub Berkane, artisan de terrain$v$::text)),
('about','citation',    to_jsonb($v$« Je préfère un chantier bien fait et bien expliqué à une belle promesse. Le reste suit tout seul. »$v$::text)),
('about','bio',         to_jsonb($v$<p><strong>Cinq ans d'apprentissage en alternance</strong>, un double CAP et un BP en génie climatique : Ayoub a appris le métier sur le terrain avant de fonder Ploméo en 2023, dans le Var.</p><p>Plomberie, chauffage, climatisation et piscine, <strong>du dépannage à la construction neuve</strong> : un même objectif à chaque intervention, propre, clair et fiable.</p>$v$::text)),
('about','nom',         to_jsonb($v$Ayoub Berkane$v$::text)),
('about','role',        to_jsonb($v$Fondateur & dirigeant$v$::text)),
('about','annee',       to_jsonb($v$2023$v$::text)),
('about','annee_label', to_jsonb($v$Création de Ploméo$v$::text)),

-- ---------- identite (Contact & coordonnées — source unique) ----------
('identite','telephone',      to_jsonb($v$06 95 16 58 89$v$::text)),
('identite','email',          to_jsonb($v$contact@plomeo.fr$v$::text)),
('identite','instagram',      to_jsonb($v$https://www.instagram.com/sarl_plomeo$v$::text)),
('identite','zone',           to_jsonb($v$Var (83)$v$::text)),
('identite','message_succes', to_jsonb($v$Merci ! Votre demande a bien été envoyée, on revient vers vous rapidement.$v$::text)),
('identite','message_erreur', to_jsonb($v$Oups, l'envoi a échoué. Réessayez ou appelez-nous au 06 95 16 58 89.$v$::text)),
('identite','bouton_envoi',   to_jsonb($v$Envoi…$v$::text)),

-- ---------- sections (en-têtes : surtitre + titre par bloc) ----------
('sections','about_eyebrow',   to_jsonb($v$Le fondateur$v$::text)),
('sections','about_titre',     to_jsonb($v$Ayoub Berkane,<br><em>artisan de terrain</em>$v$::text)),
('sections','pil_eyebrow',     to_jsonb($v$Nos expertises$v$::text)),
('sections','pil_titre',       to_jsonb($v$Quatre piliers, <em>une même exigence</em>$v$::text)),
('sections','pil_intro',       to_jsonb($v$Du simple dépannage au chantier neuf. On vous explique tout simplement, et on soigne chaque finition.$v$::text)),
('sections','process_eyebrow', to_jsonb($v$Comment ça se passe$v$::text)),
('sections','process_titre',   to_jsonb($v$Simple, <em>du premier appel à la fin du chantier</em>$v$::text)),
('sections','work_eyebrow',    to_jsonb($v$Réalisations$v$::text)),
('sections','work_titre',      to_jsonb($v$Des chantiers <em>qui parlent d'eux-mêmes</em>$v$::text)),
('sections','zone_eyebrow',    to_jsonb($v$Zone d'intervention$v$::text)),
('sections','zone_titre',      to_jsonb($v$Ploméo intervient <em>partout dans le Var</em>$v$::text)),
('sections','zone_intro',      to_jsonb($v$Du littoral à l'arrière-pays, on se déplace dans tout le département (83) pour vos dépannages comme pour vos chantiers neufs.$v$::text)),
('sections','blog_eyebrow',    to_jsonb($v$Conseils$v$::text)),
('sections','blog_titre',      to_jsonb($v$Pour <em>y voir clair</em> avant de se lancer$v$::text)),
('sections','faq_eyebrow',     to_jsonb($v$Questions fréquentes$v$::text)),
('sections','faq_titre',       to_jsonb($v$Vous vous demandez <em>peut-être…</em>$v$::text)),
('sections','contact_eyebrow', to_jsonb($v$Contact$v$::text)),
('sections','contact_titre',   to_jsonb($v$Parlons de <em>votre projet</em>$v$::text)),
('sections','contact_desc',    to_jsonb($v$Un projet précis ou juste une question ? Décrivez votre besoin : on revient vers vous avec une première orientation claire, sans engagement.$v$::text)),

-- ---------- seo / avancé ----------
('seo','meta_title',       to_jsonb($v$Ploméo | Plomberie, chauffage, climatisation & piscine dans le Var (83)$v$::text)),
('seo','meta_description', to_jsonb($v$Ploméo, artisan plombier dans le Var (83) : plomberie, chauffage, climatisation et piscine, du dépannage à la construction neuve. Travail soigné, résultat fiable.$v$::text)),
('seo','og_type',          to_jsonb($v$website$v$::text)),
('seo','schema_type',      to_jsonb($v$Plumber$v$::text)),
('seo','knows_about',      to_jsonb($v$Plomberie
Chauffage
Climatisation
Piscine$v$::text)),
('seo','address_region',   to_jsonb($v$Var$v$::text)),
('seo','address_country',  to_jsonb($v$FR$v$::text)),

-- ---------- footer ----------
('footer','baseline',              to_jsonb($v$Plomberie, chauffage, climatisation et piscine : du dépannage à la construction neuve, partout dans le Var (83).$v$::text)),
('footer','reseau_label',          to_jsonb($v$Instagram · @sarl_plomeo$v$::text)),
('footer','reseau_url',            to_jsonb($v$https://www.instagram.com/sarl_plomeo$v$::text)),
('footer','copyright',             to_jsonb($v$© 2026 Ploméo. Tous droits réservés.$v$::text)),
('footer','mentions_label',        to_jsonb($v$Mentions légales$v$::text)),
('footer','mentions_url',          to_jsonb($v$mentions-legales.html$v$::text)),
('footer','confidentialite_label', to_jsonb($v$Confidentialité$v$::text)),
('footer','confidentialite_url',   to_jsonb($v$confidentialite.html$v$::text)),

-- ---------- legal (pages mentions & confidentialité) ----------
('legal','marque',      to_jsonb($v$Ploméo$v$::text)),
('legal','retour_haut', to_jsonb($v$← Retour à l'accueil$v$::text)),
('legal','retour_bas',  to_jsonb($v$← Revenir à l'accueil$v$::text)),
('legal','mentions_legales', to_jsonb($v$<h2>Éditeur du site</h2><p>Le présent site est édité par <strong>Ploméo</strong>, artisan en plomberie, chauffage, climatisation et piscine, exerçant dans le Var (83).</p><ul><li>Dirigeant : Ayoub Berkane</li><li>Forme juridique : <em>à compléter (ex. SARL)</em></li><li>Adresse : <em>à compléter</em></li><li>SIRET : <em>à compléter</em></li><li>Numéro de TVA intracommunautaire : <em>à compléter</em></li><li>Email : <a href="mailto:contact@plomeo.fr">contact@plomeo.fr</a></li><li>Téléphone : <a href="tel:+33695165889">+33 6 95 16 58 89</a></li></ul><h2>Directeur de la publication</h2><p>Ayoub Berkane, en qualité de dirigeant.</p><h2>Hébergement</h2><p>Le site est hébergé par : <em>à compléter (nom de l'hébergeur, adresse, contact)</em>.</p><h2>Propriété intellectuelle</h2><p>L'ensemble des contenus présents sur ce site (textes, photographies de réalisations, logo, éléments graphiques) est la propriété de Ploméo, sauf mention contraire. Toute reproduction ou utilisation sans autorisation préalable est interdite.</p><h2>Responsabilité</h2><p>Ploméo s'efforce d'assurer l'exactitude des informations diffusées sur ce site, mais ne peut garantir l'absence d'erreurs. Les informations sont fournies à titre indicatif et ne constituent pas un engagement contractuel.</p><h2>Crédits</h2><p>Conception et réalisation : <a href="https://propulseo-site.com" target="_blank" rel="noopener noreferrer">Propul'SEO</a>.</p>$v$::text)),
('legal','confidentialite', to_jsonb($v$<h2>Responsable du traitement</h2><p>Les données collectées via ce site sont traitées par <strong>Ploméo</strong> (dirigeant : Ayoub Berkane), que vous pouvez contacter à <a href="mailto:contact@plomeo.fr">contact@plomeo.fr</a>.</p><h2>Données collectées</h2><p>Lorsque vous remplissez le formulaire de contact, nous collectons les informations que vous nous transmettez : prénom, nom, email, téléphone, type de projet et description de votre demande. Ces données servent uniquement à traiter votre demande et à vous recontacter.</p><h2>Finalité et base légale</h2><p>Vos données sont utilisées pour répondre à votre demande de devis ou de renseignement. Le traitement repose sur votre consentement et sur l'intérêt légitime de Ploméo à répondre à ses prospects et clients.</p><h2>Durée de conservation</h2><p>Vos données sont conservées le temps nécessaire au traitement de votre demande, puis archivées ou supprimées conformément aux obligations légales. <em>Durée précise à compléter.</em></p><h2>Vos droits</h2><p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement et d'opposition sur vos données. Pour l'exercer, écrivez à <a href="mailto:contact@plomeo.fr">contact@plomeo.fr</a>.</p><h2>Cookies</h2><p>Ce site utilise uniquement les cookies nécessaires à son bon fonctionnement. <em>Si des outils de mesure d'audience sont ajoutés (ex. Google Analytics), cette section devra être complétée.</em></p>$v$::text))

on conflict (section, cle) do nothing;
