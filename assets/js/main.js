// Ploméo — interactions (extrait de l’inline d’index.html)
// ---- Hero: split letters + replay ----
const heroTitle=document.getElementById('heroTitle');
function splitHero(w){heroTitle.innerHTML=[...w].map((c,i)=>`<span class="ltr" style="animation-delay:${i*0.06}s">${c===' '?'&nbsp;':c}</span>`).join('')+'<span class="u"></span>';}
splitHero(heroTitle.textContent.trim());
function replayHero(){const h=document.getElementById('hero');h.classList.remove('play');void h.offsetWidth;h.classList.add('play');}

// ---- Counters ----
function runCounters(){
  document.querySelectorAll('[data-count]').forEach(el=>{
    const end=parseFloat(el.dataset.count),dec=+el.dataset.dec||0;let t0=null;
    const step=ts=>{t0??=ts;const p=Math.min((ts-t0)/900,1);el.textContent=(end*p).toFixed(dec).replace('.',',');if(p<1)requestAnimationFrame(step);};
    requestAnimationFrame(step);
  });
}
runCounters();

// ---- Marquee reviews ----
const reviews=[
  ['Travail soigné, propre, dans les délais. Je recommande.','François R.'],
  ['Super plombier, efficace et de bon conseil. Merci !','Manon S.'],
  ['Réponse rapide, prix justes, chantier nickel.','Camille L.'],
  ['Intervention propre, tout bien expliqué.','Karim B.'],
];
const track=document.getElementById('reaTrack');
const cards=[...reviews,...reviews].map(([t,w])=>`<div class="rea__rev"><div class="stars">★★★★★</div><p>« ${t} »</p><div class="who">${w}</div></div>`).join('');
track.innerHTML=cards;

// ---- Pillars: reveal volet au scroll ----
const io=new IntersectionObserver(es=>es.forEach(en=>{if(en.isIntersecting)en.target.classList.add('in')}),{threshold:.35});
document.querySelectorAll('.sb, .about, .work, .blog').forEach(s=>io.observe(s));

// ---- Réalisations filter ----
document.getElementById('wfilters').addEventListener('click',e=>{
  const b=e.target.closest('.wfilter'); if(!b)return;
  document.querySelectorAll('.wfilter').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  const f=b.dataset.f;
  document.querySelectorAll('.proj').forEach(p=>p.classList.toggle('hide',f!=='all'&&p.dataset.m!==f));
});

// ---- Header scrolled ----
const lhead=document.getElementById('lhead');
addEventListener('scroll',()=>lhead.classList.toggle('scrolled',scrollY>60),{passive:true});

// ---- Menu mobile ----
const burger=document.getElementById('burger'),mnav=document.getElementById('mnav');
function toggleMenu(open){const o=open??!mnav.classList.contains('open');mnav.classList.toggle('open',o);burger.classList.toggle('open',o);burger.setAttribute('aria-expanded',o);document.body.style.overflow=o?'hidden':'';}
burger.addEventListener('click',()=>toggleMenu());
mnav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>toggleMenu(false)));

// ---- Modal Réalisations ----
const pm=document.getElementById('pmodal');
const pmDescs={
  plomberie:"Réseaux propres et fiables, finitions soignées, du dépannage à la rénovation complète, jusque dans les détails qu'on ne voit plus une fois le chantier fini.",
  chauffage:"Installation et mise en service d'une solution performante, dimensionnée selon le logement, avec une régulation simple à piloter au quotidien.",
  climatisation:"Une climatisation discrète et silencieuse, posée dans les règles. On vous explique le fonctionnement et l'entretien avant de partir.",
  piscine:"Local technique, raccordements et mise en service de la partie hydraulique, avec des réglages clairs pour un entretien facile au fil des saisons."
};
function openPM(p){
  pm.dataset.m=p.dataset.m;
  document.getElementById('pmImg').src=p.querySelector('img').src;
  document.getElementById('pmTag').textContent=p.querySelector('.proj__tag').textContent;
  document.getElementById('pmTitle').textContent=p.querySelector('h3').textContent;
  document.getElementById('pmLoc').textContent=p.querySelector('.proj__loc').textContent;
  document.getElementById('pmDesc').textContent=pmDescs[p.dataset.m]||'';
  pm.classList.add('open');
}
function closePM(){pm.classList.remove('open');}
document.querySelectorAll('.proj').forEach(p=>p.addEventListener('click',()=>openPM(p)));
pm.querySelector('.pmodal__backdrop').addEventListener('click',closePM);
pm.querySelector('.pmodal__close').addEventListener('click',closePM);

// ---- Modal Article ----
const am=document.getElementById('amodal');
const articlesData={
  1:{cat:'Plomberie',title:'Pourquoi une installation bien faite dure vraiment plus longtemps',body:`
    <p>Sur une fuite ou une rénovation, la différence ne se voit pas toujours le jour J. Elle se voit dans le temps : une installation soignée, on l'oublie ; une installation bâclée, on la retrouve vite.</p>
    <h3>Le matériel compte</h3>
    <p>On privilégie des matériaux fiables et adaptés à l'usage (cuivre, PER multicouche de qualité, raccords sérieux). Un bon composant mal posé ne sert à rien, mais un composant bas de gamme ne pardonne pas non plus.</p>
    <h3>La pose fait la durée</h3>
    <ul><li>des supports adaptés et des pentes respectées,</li><li>des arrivées et vannes d'arrêt accessibles pour l'entretien,</li><li>une étanchéité contrôlée avant de refermer.</li></ul>
    <p>Résultat : moins de fuites, moins d'interventions, et un budget mieux maîtrisé sur la durée.</p>`},
  2:{cat:'Chauffage',title:'Bien choisir entre pompe à chaleur, chaudière et plancher chauffant',body:`
    <p>Il n'y a pas de « meilleure » solution dans l'absolu : tout dépend de votre logement, de l'isolation et de votre budget. Voici les grandes lignes.</p>
    <h3>La pompe à chaleur</h3>
    <p>Performante et économe à l'usage, idéale en neuf comme en rénovation bien isolée. Elle demande un bon dimensionnement pour donner le meilleur.</p>
    <h3>Le plancher chauffant</h3>
    <p>Le confort par excellence : une chaleur douce et homogène, sans radiateurs apparents. Parfait associé à une pompe à chaleur basse température.</p>
    <h3>La chaudière</h3>
    <p>Toujours pertinente sur certains logements. On vous oriente vers la solution réellement adaptée, sans surdimensionner.</p>`},
  3:{cat:'Climatisation',title:'Gainable ou split : comment bien rafraîchir sa maison',body:`
    <p>Rester au frais l'été sans transformer sa facture en fournaise, c'est surtout une histoire de bon choix au départ.</p>
    <h3>Le split mural</h3>
    <p>Simple, efficace et économique à installer pièce par pièce. La solution la plus courante en rénovation.</p>
    <h3>Le gainable</h3>
    <p>Plus discret : les unités sont cachées, la diffusion se fait par des grilles. Idéal quand on veut une clim invisible et homogène dans toute la maison.</p>
    <p>Dans les deux cas, on dimensionne selon les volumes et on vous explique l'entretien (filtres, contrôle) pour que ça dure.</p>`}
};
function openAM(a){const d=articlesData[a.dataset.a];if(!d)return;document.getElementById('amCat').textContent=d.cat;document.getElementById('amTitle').textContent=d.title;document.getElementById('amBody').innerHTML=d.body;am.classList.add('open');}
function closeAM(){am.classList.remove('open');}
document.querySelectorAll('.bitem').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();openAM(b);}));
am.querySelector('.amodal__backdrop').addEventListener('click',closeAM);
am.querySelector('.amodal__close').addEventListener('click',closeAM);
addEventListener('keydown',e=>{if(e.key==='Escape'){closePM();closeAM();}});

// ---- FAQ accordéon ----
document.querySelectorAll('.faqitem__q').forEach(q=>q.addEventListener('click',()=>{
  const item=q.closest('.faqitem');const wasOpen=item.classList.contains('open');
  document.querySelectorAll('.faqitem').forEach(i=>i.classList.remove('open'));
  if(!wasOpen)item.classList.add('open');
}));

// ---- Intro (1re visite de la session seulement) ----
const intro=document.getElementById('intro');
function endIntro(){if(intro.classList.contains('done'))return;intro.classList.add('done');replayHero();setTimeout(()=>intro.style.display='none',650);}
// MODE TEST : l'intro se joue à chaque rechargement.
// Pour la prod (1re visite par session seulement), remplacer par :
//   if(sessionStorage.getItem('plomeo_intro')){intro.style.display='none'}
//   else{sessionStorage.setItem('plomeo_intro','1'); setTimeout(endIntro,3500); document.getElementById('introSkip').addEventListener('click',endIntro);}
setTimeout(endIntro,3500);
document.getElementById('introSkip').addEventListener('click',endIntro);

// ---- Formulaire contact : envoi AJAX (le visiteur reste sur le site) ----
const cform=document.querySelector('.cform');
if(cform){
  const status=document.getElementById('cformStatus');
  const btn=cform.querySelector('.cbtn');
  cform.addEventListener('submit',async e=>{
    e.preventDefault();
    if(cform._honey&&cform._honey.value)return; // honeypot rempli = bot
    const label=btn.textContent;
    btn.disabled=true;btn.textContent='Envoi…';
    status.hidden=true;status.className='cform__status';
    try{
      const res=await fetch('https://formsubmit.co/ajax/contact@plomeo.fr',{
        method:'POST',headers:{'Accept':'application/json'},body:new FormData(cform)
      });
      const data=await res.json();
      if(res.ok&&(data.success==='true'||data.success===true)){
        cform.reset();
        status.textContent="Merci ! Votre demande a bien été envoyée, on revient vers vous rapidement.";
        status.classList.add('ok');
      }else throw new Error(data.message||'Erreur');
    }catch(err){
      status.textContent="Oups, l'envoi a échoué. Réessayez ou appelez-nous au 06 95 16 58 89.";
      status.classList.add('err');
    }finally{
      status.hidden=false;btn.disabled=false;btn.textContent=label;
    }
  });
}
