-- ============================================================
--  Seed de la FAQ (section #faq) depuis index.html.
--  N'insere que si la table est vide (idempotent).
-- ============================================================
insert into public.faq (question, reponse, ordre, visible)
select v.question, v.reponse, v.ordre, true
from (values
  ($t$Intervenez-vous en urgence ?$t$,
    $t$Oui, selon nos disponibilités et votre commune. Le téléphone reste le plus rapide pour une urgence : appelez-nous directement au 06 95 16 58 89.$t$, 0),
  ($t$Vous faites du neuf ou de la rénovation ?$t$,
    $t$Les deux. Du simple dépannage à la construction neuve, en passant par la rénovation complète de salle de bain.$t$, 1),
  ($t$Le devis est-il vraiment gratuit ?$t$,
    $t$Oui, le devis est gratuit et sans engagement. On évalue votre projet et on vous remet un prix clair avant tout démarrage.$t$, 2),
  ($t$Dans quelle zone intervenez-vous ?$t$,
    $t$Partout dans le Var (83), du littoral à l'arrière-pays. Si vous avez un doute pour votre commune, contactez-nous.$t$, 3),
  ($t$Travaillez-vous sur les 4 métiers ?$t$,
    $t$Oui : plomberie, chauffage, climatisation et piscine. Un seul interlocuteur pour l'ensemble de votre projet.$t$, 4)
) as v(question, reponse, ordre)
where not exists (select 1 from public.faq);
