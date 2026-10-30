/* Guides Clair — outils interactifs (calculs dans le navigateur ; seul le formulaire de demande de devis envoie des données, avec consentement) */
(function () {
  'use strict';
  var fmt = function (n) { return Math.round(n).toLocaleString('fr-FR') + ' €'; };
  /* Typographie française des textes générés : insécable avant : et €, fine avant ; ? ! %, fine entre les milliers */
  var ty = function (s) { return String(s).replace(/(\d) (?=\d{3}(?!\d))/g, '$1\u202f').replace(/ ([:€»])/g, '\u00a0$1').replace(/« /g, '«\u00a0').replace(/ ([;?!%])/g, '\u202f$1'); };
  var rng = function (a, b) { return a === b ? fmt(a) : fmt(a) + ' à ' + fmt(b); };
  var rngT = function (a, b) { return rng(Math.floor(a / 100) * 100, Math.ceil(b / 100) * 100); };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* Apparition douce au défilement */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else { $$('.reveal').forEach(function (el) { el.classList.add('on'); }); }

  /* Sommaire actif */
  var tocLinks = $$('.toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    tocLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var tio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { tocLinks.forEach(function (a) { a.classList.remove('on'); }); if (map[e.target.id]) map[e.target.id].classList.add('on'); }
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    Object.keys(map).forEach(function (id) { var h = document.getElementById(id); if (h) tio.observe(h); });
  }

  /* Boutons de choix (aria-pressed) */
  function bindChoices(root, onChange) {
    $$('.choices', root).forEach(function (group) {
      $$('button', group).forEach(function (b) {
        b.type = 'button';
        b.addEventListener('click', function () {
          $$('button', group).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          group.dataset.value = b.dataset.v;
          onChange(group);
        });
      });
    });
  }

  /* ---------- 1. Budget assainissement ---------- */
  var ANC = {
    epandage: { l: 'Fosse toutes eaux + tranchées d’épandage', r: [5000, 10000], n: 'Ordre de grandeur : les sources publiées divergent.', energie: false },
    sable: { l: 'Fosse + filtre à sable (drainé ou non)', r: [9000, 10000], n: 'Repère de la Charte ANC Vendée (2024).', energie: false },
    tertre: { l: 'Fosse + tertre d’infiltration', r: null, n: 'Aucun prix public fiable : plus cher qu’un épandage, devis indispensable.', energie: false },
    compact: { l: 'Filtre compact agréé', r: [8000, 12000], n: 'Fourchette commune à plusieurs sources.', energie: false },
    micro: { l: 'Micro-station agréée', r: [8000, 11000], n: 'Fourchette commune à plusieurs sources. Consomme de l’électricité.', energie: true },
    plante: { l: 'Filtre planté de roseaux agréé', r: [8000, 14000], n: 'Écarts importants selon les sources (8 000 à 14 000 €).', energie: false }
  };
  var ancTool = $('[data-tool="anc-budget"]');
  if (ancTool) {
    var upd = function () {
      var f = ANC[$('#anc-f', ancTool).value];
      var lo = 0, hi = 0, lines = [], unknown = !f.r;
      if (f.r) { lo += f.r[0]; hi += f.r[1]; lines.push('<li>' + esc(f.l) + ' : <b>' + rng(f.r[0], f.r[1]) + '</b></li>'); }
      else { lines.push('<li>' + esc(f.l) + ' : <b>sur devis</b></li>'); }
      if ($('#anc-etude', ancTool).checked) { lo += 350; hi += 800; lines.push('<li>Étude de sol et de filière : ' + rng(350, 800) + '</li>'); }
      if ($('#anc-spanc', ancTool).checked) { lo += 150; hi += 365; lines.push('<li>Redevances SPANC conception + bonne exécution : ' + rng(150, 365) + ' (selon le territoire)</li>'); }
      if ($('#anc-depose', ancTool).checked) { lo += 2000; hi += 5000; lines.push('<li>Dépose de l’ancien système : ' + rng(2000, 5000) + ' (repère d’une seule source)</li>'); }
      var ptz = $('#anc-rp', ancTool).checked && !f.energie;
      var out = $('.result', ancTool);
      out.innerHTML = '<div class="small">Budget estimé, TTC, pose comprise</div>' +
        '<div class="big">' + (unknown ? 'À partir de ' + fmt(lo) + ' + travaux sur devis' : rngT(lo, hi)) + '</div>' +
        '<ul>' + lines.join('') + '</ul>' +
        '<p class="fine">' + esc(f.n) + '</p>' +
        (ptz ? '<div class="note ok"><strong>Éco-PTZ possible</strong>Prêt à taux zéro jusqu’à 10 000 €, sur 15 ans maximum, sans condition de ressources (résidence principale de plus de 2 ans, dispositif sans consommation d’énergie).</div>'
             : (f.energie ? '<div class="note warn"><strong>Pas d’éco-PTZ pour une micro-station</strong>L’éco-PTZ ne finance que les dispositifs qui ne consomment pas d’énergie.</div>' : '')) +
        '<p class="fine">Estimation indicative tirée de prix publiés (voir les sources en bas de page). Seul un devis après étude de sol fait foi.</p>';
    };
    $$('select,input', ancTool).forEach(function (el) { el.addEventListener('change', upd); });
    upd();
  }

  /* ---------- 2. Quiz « Mon cas » assainissement ---------- */
  var quiz = $('[data-tool="anc-quiz"]');
  if (quiz) {
    var st = {}, steps = $$('.quiz-step', quiz), bar = $('.progress i', quiz);
    var show = function (i) { steps.forEach(function (s, k) { s.classList.toggle('on', k === i); }); bar.style.width = Math.round((i + 1) / steps.length * 100) + '%'; };
    var R = {
      'achat-nc': ['Travaux obligatoires dans l’année qui suit la vente', ['Vous avez <b>1 an après la signature de l’acte</b> pour mettre l’installation en conformité (Code de la construction, art. L271-4).', 'Étapes : étude de filière, dossier de conception validé par le SPANC, travaux, contrôle <b>avant remblaiement</b>.', 'Avant de signer, faites chiffrer les travaux : leur coût peut entrer dans la négociation du prix.', 'Le notaire transmet au SPANC une attestation de vente dans le mois qui suit la signature.'], ['vente-achat-maison', 'etapes-travaux', 'prix']],
      'achat-ok': ['Pas de travaux obligatoires', ['Une installation conforme n’impose pas de travaux.', 'Pensez à l’entretien : vidange dès que les boues dépassent 50 % du volume utile de la fosse, par un vidangeur agréé.', 'Le SPANC reviendra pour un contrôle périodique, au plus tous les 10 ans.'], ['entretien-vidange', 'spanc-controle']],
      'achat-abs': ['Installation à créer', ['L’absence d’installation est une non-conformité : l’installation doit être réalisée dans les meilleurs délais, et au plus tard dans l’année qui suit la vente.', 'Commencez par une étude de sol et de filière, puis le dossier de conception au SPANC.'], ['etapes-travaux', 'filieres', 'prix']],
      'achat-nsp': ['Demandez le rapport du SPANC', ['Le vendeur doit fournir un document du SPANC de <b>moins de 3 ans</b> (date de la visite) à la signature de l’acte.', 'Il est joint au dossier de diagnostic technique. Lisez sa conclusion avant de vous engager.'], ['vente-achat-maison', 'loire-atlantique', 'vendee']],
      'vente': ['Ce que vous devez fournir', ['Un document du SPANC de <b>moins de 3 ans</b> à la signature de l’acte, à compter de la date de la visite.', 'S’il manque ou s’il est trop ancien, le contrôle est à votre charge (environ 100 à 300 € selon les territoires).', 'Vous n’êtes pas obligé de faire les travaux avant de vendre : l’acquéreur dispose d’un an. Leur coût entre souvent dans la négociation.', 'Sans document valide, vous ne pouvez pas vous exonérer de la garantie des vices cachés.'], ['vente-achat-maison', 'spanc-controle']],
      'proprio-nc': ['Le délai dépend du type de non-conformité', ['<b>Danger sanitaire, défaut de structure, ou installation à moins de 35 m en amont d’un puits utilisé pour l’eau potable</b> : travaux sous 4 ans maximum (le maire peut réduire ce délai).', '<b>Installation incomplète ou très sous-dimensionnée</b> : 4 ans en zone à enjeu sanitaire ou environnemental, pas de délai imposé ailleurs, sauf vente (1 an).', 'Refuser les travaux expose à une pénalité au moins égale à la redevance, majorable jusqu’à 400 %.'], ['spanc-controle', 'aides', 'prix']],
      'proprio-ok': ['Tout va bien : place à l’entretien', ['Vidange dès que les boues dépassent 50 % du volume utile (seuil souvent plus bas pour les micro-stations, voir leur avis d’agrément).', 'Gardez le bordereau de vidange : le SPANC peut le demander.'], ['entretien-vidange']],
      'proprio-abs': ['Installation à créer rapidement', ['L’absence d’installation entraîne une mise en demeure : les travaux doivent être faits dans les meilleurs délais.', 'Vérifiez les aides de votre intercommunalité et l’éco-PTZ.'], ['etapes-travaux', 'aides', 'prix']],
      'proprio-nsp': ['Contactez votre SPANC', ['Chaque intercommunalité gère son SPANC : il peut vous renvoyer votre dernier rapport et vous expliquer les délais qui s’appliquent.'], ['loire-atlantique', 'vendee']],
      'construction': ['Le projet d’assainissement se valide avant le permis', ['Depuis 2012, l’attestation de conformité du projet d’assainissement délivrée par le SPANC doit être jointe à la demande de permis de construire.', 'L’étude de sol et de filière est souvent exigée localement : elle fixe la filière adaptée au terrain.'], ['etapes-travaux', 'filieres', 'prix']],
      'entretien': ['L’essentiel de l’entretien', ['Vidange dès 50 % de boues dans la fosse, par un vidangeur agréé par la préfecture, avec un bordereau en 3 volets.', 'Comptez environ 200 à 350 € par vidange.', 'Micro-station : contrat d’entretien conseillé et électricité à prévoir.'], ['entretien-vidange']]
    };
    var titles = { 'vente-achat-maison': 'Vente et achat', 'etapes-travaux': 'Les étapes des travaux', 'prix': 'Prix et calculateur', 'entretien-vidange': 'Entretien et vidange', 'spanc-controle': 'Le contrôle du SPANC', 'filieres': 'Choisir sa filière', 'loire-atlantique': 'SPANC de Loire-Atlantique', 'vendee': 'SPANC de Vendée', 'aides': 'Aides financières' };
    var finish = function (key) {
      var r = R[key], out = $('.quiz-result', quiz);
      out.innerHTML = '<div class="result"><div class="small">Votre situation</div><div class="big sm">' + r[0] + '</div><ul>' +
        r[1].map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><p><b>À lire ensuite :</b> ' +
        r[2].map(function (s) { return '<a href="/' + s + '">' + titles[s] + '</a>'; }).join(' · ') +
        '</p><p class="fine">Information générale, à confirmer avec votre SPANC. <button type="button" class="btn ghost sm" data-restart>Recommencer</button></p></div>';
      steps.forEach(function (s) { s.classList.remove('on'); }); bar.style.width = '100%';
      $('[data-restart]', out).addEventListener('click', function () { out.innerHTML = ''; st = {}; $$('button[aria-pressed]', quiz).forEach(function (b) { b.setAttribute('aria-pressed', 'false'); }); show(0); });
    };
    bindChoices(quiz, function (g) {
      var q = g.dataset.q, v = g.dataset.value; st[q] = v;
      if (q === 'situation') {
        if (v === 'achat' || v === 'proprio') { show(1); } else { finish(v); }
      } else if (q === 'etat') { finish(st.situation + '-' + v); }
    });
    show(0);
  }

  /* ---------- 3. Quelle filière pour mon terrain ? ---------- */
  var fil = $('[data-tool="anc-filiere"]');
  if (fil) {
    var upf = function () {
      var place = $('#fi-place', fil).value, sol = $('#fi-sol', fil).value, nappe = $('#fi-nappe', fil).checked, inter = $('#fi-inter', fil).checked, elec = $('#fi-elec', fil).checked;
      var c = [];
      var add = function (t, w) { c.push('<li><b>' + t + '</b> — ' + w + '</li>'); };
      if (!nappe && sol === 'normal' && place === 'grande') add('Épandage dans le sol en place', 'la solution de base prévue par la réglementation quand le sol filtre bien (perméabilité de 15 à 500 mm/h) et qu’il y a de la place (environ 150 à 200 m²).');
      if (!nappe && sol === 'tres' && place !== 'petite') add('Filtre à sable vertical non drainé', 'pour un sol trop perméable ; emprise totale d’environ 70 m².');
      if (!nappe && sol === 'peu' && place !== 'petite') add('Filtre à sable vertical drainé', 'pour un sol peu perméable, avec rejet vers un exutoire (fossé…) ; emprise d’environ 70 m².');
      if (nappe && place !== 'petite') add('Tertre d’infiltration', 'filtre construit hors sol quand la nappe est trop proche ou le terrain inondable ; 60 m² minimum.');
      add('Filtre compact agréé', 'peu d’emprise (environ 5 à 20 m²), sans électricité sauf poste de relevage ; média filtrant à renouveler tous les 10 à 15 ans.');
      if (!inter && elec) add('Micro-station agréée', 'très compacte, mais consomme de l’électricité, demande un entretien régulier et est déconseillée en résidence secondaire.');
      if (place !== 'petite') add('Filtre planté de roseaux agréé', 'environ 2 m² par équivalent-habitant selon les modèles, sans électricité en écoulement gravitaire ; entretien des roseaux chaque année.');
      $('.result', fil).innerHTML = '<div class="small">Filières à étudier en priorité</div><ul>' + c.join('') + '</ul><p class="fine">Seule l’étude de sol et de filière permet de trancher, et le SPANC doit valider le projet avant les travaux.</p>';
    };
    $$('select,input', fil).forEach(function (el) { el.addEventListener('change', upf); });
    upf();
  }

  /* ---------- 4. Budget piscine ---------- */
  var POOL = {
    coque: { l: 'Piscine coque polyester 8 × 4 m posée', r: [18000, 30000] },
    beton: { l: 'Piscine béton coulé ou banché 8 × 4 m', r: [20000, 45000] },
    kitpro: { l: 'Kit posé par un professionnel', r: [18000, 30000] },
    kit: { l: 'Kit enterré à monter soi-même', r: [7000, 18000] },
    semi: { l: 'Piscine semi-enterrée 8 × 4 m', r: [8000, 25000] },
    bois: { l: 'Piscine hors-sol en bois (modèles courants)', r: [2500, 10000] }
  };
  var POOLOPT = {
    terr: ['Terrassement et évacuation des terres (si non compris)', [2000, 7000]],
    roc: ['Surcoût sol rocheux', [3000, 6000]],
    pac: ['Pompe à chaleur', [2500, 6000]],
    volet: ['Volet roulant automatique', [3000, 8000]],
    abri: ['Abri de piscine', [5000, 25000]],
    local: ['Local technique', [1000, 5000]]
  };
  var SECU = { alarme: ['Alarme (NF P90-307)', [150, 800]], barriere: ['Barrière (NF P90-306)', [1000, 5000]], couverture: ['Couverture de sécurité (NF P90-308)', [2000, 5000]], abri: ['Abri (NF P90-309) : déjà compté ci-dessus', [0, 0]] };
  var pool = $('[data-tool="pool-budget"]');
  if (pool) {
    var upp = function () {
      var t = POOL[$('#pb-type', pool).value], lo = t.r[0], hi = t.r[1], li = ['<li>' + t.l + ' : <b>' + rng(t.r[0], t.r[1]) + '</b></li>'];
      $$('input[data-opt]', pool).forEach(function (c) { if (c.checked) { var o = POOLOPT[c.dataset.opt]; lo += o[1][0]; hi += o[1][1]; li.push('<li>' + o[0] + ' : ' + rng(o[1][0], o[1][1]) + '</li>'); } });
      var s = $('#pb-secu', pool).value, so = SECU[s];
      if (s === 'abri' && !$('input[data-opt="abri"]', pool).checked) { so = ['Abri (NF P90-309)', [5000, 25000]]; }
      lo += so[1][0]; hi += so[1][1]; li.push('<li>Sécurité obligatoire — ' + so[0] + (so[1][1] ? ' : ' + rng(so[1][0], so[1][1]) : '') + '</li>');
      var surf = parseFloat($('#pb-surf', pool).value) || 0, tx = parseFloat($('#pb-tx', pool).value) || 0;
      var ta = surf * 251 * (tx + 2.5) / 100;
      $('.result', pool).innerHTML = '<div class="small">Budget estimé, TTC, pose comprise</div><div class="big">' + rngT(lo, hi) + '</div><ul>' + li.join('') + '</ul>' +
        '<div class="note"><strong>Taxe d’aménagement estimée : ' + fmt(ta) + '</strong>' + surf + ' m² × 251 €/m² (valeur 2026) × (' + tx + ' % communal + 2,5 % départemental maximum). Montant exact : simulateur officiel des impôts.</div>' +
        '<p class="fine">Puis environ 1 000 à 1 500 € par an d’entretien (électricité, produits, eau, hivernage) selon les sources. Fourchettes publiées par la FPP et des sites de prix (voir les sources).</p>';
    };
    $$('select,input', pool).forEach(function (el) { el.addEventListener('change', upp); el.addEventListener('input', upp); });
    upp();
  }

  /* ---------- 5. Budget projets extérieurs (pergola, terrasse, clôture, véranda) ---------- */
  var EXT = {
    pergola: { u: 'm²', def: 15, m: { bio: ['Pergola bioclimatique aluminium posée', [450, 1000]] }, opt: { moteur: ['Motorisation des lames (si non incluse)', [800, 2000]] }, n: 'Une pergola adossée coûte environ 10 à 20 % de moins qu’une autoportée.' },
    terrasse: { u: 'm²', def: 25, m: { resineux: ['Bois résineux (pin, douglas)', [80, 160]], exotique: ['Bois exotique', [110, 240]], composite: ['Composite (sources très divergentes)', [70, 270]], carrelage: ['Carrelage sur dalle béton', [100, 150]], beton: ['Béton (lissé à désactivé)', [50, 210]] }, opt: {}, n: 'Hors dalle ou plots si non compris dans le prix au m².' },
    cloture: { u: 'mètres linéaires', def: 30, m: { grillage: ['Grillage souple', [30, 100]], rigide: ['Panneaux rigides', [35, 120]], bois: ['Bois', [80, 200]], pvc: ['PVC', [50, 180]], alu: ['Aluminium', [150, 380]], composite: ['Composite', [100, 185]], mur: ['Mur parpaing ou béton', [110, 215]] }, opt: { portail: ['Portail motorisé posé', [2000, 8000], true] }, n: 'Prix au mètre linéaire, pose comprise.' },
    veranda: { u: 'm²', def: 15, m: { alu: ['Véranda aluminium', [1200, 2300]], pvc: ['Véranda PVC', [700, 1800]], bois: ['Véranda bois', [1500, 3200]] }, opt: {}, n: 'Prix au m² pose comprise ; dalle et fondations parfois en plus.' }
  };
  var ext = $('[data-tool="ext-budget"]');
  if (ext) {
    var fill = function () {
      var p = EXT[$('#eb-p', ext).value];
      $('#eb-m', ext).innerHTML = Object.keys(p.m).map(function (k) { return '<option value="' + k + '">' + p.m[k][0] + '</option>'; }).join('');
      $('#eb-u', ext).textContent = p.u;
      $('#eb-q', ext).value = p.def;
      $('#eb-opts', ext).innerHTML = Object.keys(p.opt).map(function (k) { return '<label><input type="checkbox" data-o="' + k + '"> ' + p.opt[k][0] + '</label>'; }).join('') || '<span class="small">Pas d’option pour ce projet.</span>';
      $$('#eb-opts input', ext).forEach(function (c) { c.addEventListener('change', upe); });
      upe();
    };
    var upe = function () {
      var p = EXT[$('#eb-p', ext).value], m = p.m[$('#eb-m', ext).value], q = Math.max(0, parseFloat($('#eb-q', ext).value) || 0);
      var lo = m[1][0] * q, hi = m[1][1] * q, li = ['<li>' + m[0] + ' : ' + rng(m[1][0], m[1][1]) + ' par ' + (p.u === 'm²' ? 'm²' : 'mètre') + ' × ' + q + ' = <b>' + rng(lo, hi) + '</b></li>'];
      $$('#eb-opts input', ext).forEach(function (c) { if (c.checked) { var o = p.opt[c.dataset.o]; lo += o[1][0]; hi += o[1][1]; li.push('<li>' + o[0] + ' : ' + rng(o[1][0], o[1][1]) + '</li>'); } });
      $('.result', ext).innerHTML = '<div class="small">Budget estimé, TTC, pose comprise</div><div class="big">' + rngT(lo, hi) + '</div><ul>' + li.join('') + '</ul><p class="fine">' + p.n + ' Fourchettes publiées par plusieurs sites de prix (voir les sources). Seul un devis fait foi.</p>';
    };
    if (ext.dataset.p) { $('#eb-p', ext).value = ext.dataset.p; }
    $('#eb-p', ext).addEventListener('change', fill);
    $('#eb-m', ext).addEventListener('change', upe);
    $('#eb-q', ext).addEventListener('input', upe);
    fill();
  }

  /* ---------- 6. Simulateur de formalités d'urbanisme ---------- */
  var fo = $('[data-tool="formalites"]');
  if (fo) {
    var showIf = function () {
      var p = $('#fo-p', fo).value;
      $$('[data-for]', fo).forEach(function (el) { el.style.display = el.dataset.for.split(' ').indexOf(p) > -1 ? '' : 'none'; });
    };
    var upo = function () {
      showIf();
      var p = $('#fo-p', fo).value, s = parseFloat($('#fo-s', fo).value) || 0, zu = $('#fo-zu', fo).value, prot = $('#fo-prot', fo).checked;
      var res = '', why = [], extra = [], ta = null;
      var DP = 'Déclaration préalable', PC = 'Permis de construire', NONE = 'Aucune formalité';
      if (p === 'piscine') {
        var abri = $('#fo-abri', fo).value;
        if (s <= 10) { res = prot ? DP : NONE; why.push('Bassin de 10 m² ou moins' + (prot ? ' en secteur protégé' : '') + '.'); }
        else if (s <= 100) { res = (abri === 'haut') ? PC : DP; why.push('Bassin entre 10 et 100 m²' + (abri === 'haut' ? ' avec un abri de plus de 1,80 m' : (abri === 'bas' ? ' avec un abri de 1,80 m ou moins' : '')) + '.'); }
        else { res = PC; why.push('Bassin de plus de 100 m².'); }
        extra.push('Un dispositif de sécurité normalisé est obligatoire (barrière, alarme, couverture ou abri) : 45 000 € d’amende sinon.');
        extra.push('Déclaration aux impôts dans les 90 jours suivant l’achèvement, même sans autorisation d’urbanisme.');
        ta = { base: s * 251, l: s + ' m² × 251 €/m²' };
      } else if (p === 'pergola') {
        var ad = $('#fo-adosse', fo).checked;
        if (prot) { res = s <= 20 ? DP : PC; why.push('Secteur protégé : déclaration jusqu’à 20 m², permis au-delà.'); }
        else if (ad) { var lim = zu === 'oui' ? 40 : 20; res = s <= lim ? DP : PC; why.push('Pergola adossée traitée comme une extension : déclaration jusqu’à ' + lim + ' m²' + (zu === 'oui' ? ' en zone U du PLU' : '') + ', permis au-delà.'); if (s <= 5) why.push('À 5 m² ou moins, vérifiez en mairie : le PLU peut la traiter comme une construction nouvelle, sans formalité.'); }
        else { res = s <= 5 ? NONE : (s <= 20 ? DP : PC); why.push('Pergola indépendante : aucune formalité jusqu’à 5 m² d’emprise au sol, déclaration de 5 à 20 m², permis au-delà.'); }
        extra.push('Une pergola ouverte n’est pas comptée dans la surface taxable de la taxe d’aménagement.');
      } else if (p === 'terrasse') {
        var sur = $('#fo-sur', fo).value;
        if (sur === 'plain') { res = prot ? DP : NONE; why.push('Terrasse de plain-pied (non ou très faiblement surélevée)' + (prot ? ' en secteur protégé' : '') + '.'); }
        else if (sur === 'accolee') { var l2 = zu === 'oui' ? 40 : 20; res = s <= l2 ? DP : PC; why.push('Terrasse surélevée ou couverte accolée à la maison : déclaration jusqu’à ' + l2 + ' m², permis au-delà.'); }
        else { res = s <= 20 ? DP : PC; why.push('Terrasse indépendante surélevée ou couverte : déclaration jusqu’à 20 m², permis au-delà.'); }
        extra.push('Il n’existe pas de hauteur officielle séparant « plain-pied » et « surélevée » : en cas de doute, demandez à la mairie.');
        extra.push('Une terrasse se déclare aux impôts dans les 90 jours (changement de consistance).');
      } else if (p === 'veranda') {
        var l3 = zu === 'oui' ? 40 : 20; res = s <= l3 ? DP : PC;
        why.push('Une véranda est une extension : déclaration jusqu’à ' + l3 + ' m²' + (zu === 'oui' ? ' en zone U du PLU' : '') + ', permis au-delà.');
        if (zu === 'oui') extra.push('En zone U, un permis est aussi requis au-delà de 20 m² si la maison dépasse ensuite 150 m² de surface de plancher (architecte obligatoire au-delà de 150 m²).');
        extra.push('Taxe d’aménagement due, et déclaration aux impôts dans les 90 jours.');
        ta = { base: s * 892 * 0.5, l: s + ' m² × 892 €/m² × 50 % (abattement sur les 100 premiers m² de la résidence principale ; sans lui, le montant double)' };
      } else if (p === 'cloture') {
        var mur = $('#fo-mur', fo).checked;
        res = (prot || mur) ? DP : 'Aucune formalité en principe';
        why.push(prot ? 'Secteur protégé : déclaration préalable.' : (mur ? 'Mur de clôture de 2 m ou plus : déclaration préalable.' : 'Une clôture est en principe libre…'));
        extra.push('…sauf si votre commune ou votre PLU a soumis les clôtures à déclaration : c’est fréquent, vérifiez en mairie.');
        extra.push('Respectez aussi le règlement de lotissement ou de copropriété.');
      }
      if (prot && p !== 'cloture') extra.push('En secteur protégé, l’instruction est plus longue et l’avis de l’architecte des Bâtiments de France peut être requis.');
      var delai = res === DP ? 'Instruction : 1 mois (2 mois en secteur protégé). Sans réponse, l’accord est en principe tacite.' : (res === PC ? 'Instruction : 2 mois pour une maison individuelle et ses annexes (3 mois en secteur protégé).' : '');
      var tx = parseFloat($('#fo-tx', fo).value) || 0;
      var tahtml = ta ? '<div class="note"><strong>Taxe d’aménagement estimée : ' + fmt(ta.base * (tx + 2.5) / 100) + '</strong>' + ta.l + ' × (' + tx + ' % communal + 2,5 % départemental maximum). Montant exact : simulateur officiel des impôts.</div>' : '';
      $('.result', fo).innerHTML = '<div class="small">Formalité probable</div><div class="big">' + res + '</div><ul>' + why.concat(extra).map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' + (delai ? '<p>' + delai + '</p>' : '') + tahtml +
        '<p class="fine">D’après les fiches officielles service-public (vérifiées en 2025-2026). Le PLU de votre commune peut ajouter des règles : la mairie a le dernier mot.</p>';
    };
    $$('select,input', fo).forEach(function (el) { el.addEventListener('change', upo); el.addEventListener('input', upo); });
    upo();
  }
  /* ---------- 7. Demande de mise en relation (activée seulement si un partenaire existe) ---------- */
  var lf = $('[data-tool="lead-form"]');
  if (lf) {
    var form = $('form', lf), steps2 = $$('.quiz-step', lf), bar2 = $('.progress i', lf), msg = $('.lead-msg', lf), t0 = Date.now();
    var go = function (i) { steps2.forEach(function (s, k) { s.classList.toggle('on', k === i); }); bar2.style.width = (i === 0 ? 50 : 90) + '%'; };
    var bad = function (el, t) { el.setAttribute('aria-invalid', 'true'); msg.innerHTML = '<div class="note warn">' + t + '</div>'; el.focus(); return false; };
    var ok1 = function () {
      $$('[aria-invalid]', lf).forEach(function (e) { e.removeAttribute('aria-invalid'); }); msg.innerHTML = '';
      var cp = $('#ld-cp', lf); if (!/^[0-9]{5}$/.test(cp.value.trim())) return bad(cp, 'Indiquez un code postal à 5 chiffres.');
      return true;
    };
    go(0);
    $('[data-next]', lf).addEventListener('click', function () { if (ok1()) { go(1); var f2 = $('#ld-prenom', lf); if (f2) f2.focus(); } });
    $('[data-prev]', lf).addEventListener('click', function () { go(0); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!ok1()) { go(0); return; }
      var p = $('#ld-prenom', lf), tel = $('#ld-tel', lf), em = $('#ld-email', lf), c = $('input[name=consent]', lf);
      if (!p.value.trim()) return bad(p, 'Indiquez votre prénom.');
      if (tel.value.replace(/[^0-9]/g, '').length < 9) return bad(tel, 'Indiquez un numéro de téléphone valide.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em.value.trim())) return bad(em, 'Indiquez un email valide.');
      if (!c.checked) return bad(c, 'Cochez la case d’accord pour que nous puissions vous proposer un professionnel.');
      var d = {}; $$('input,select', form).forEach(function (x) { if (x.name) d[x.name] = x.type === 'checkbox' ? x.checked : x.value.trim(); });
      d.page = location.pathname; d.site = location.hostname; d.delai_saisie = Math.round((Date.now() - t0) / 1000);
      var btn = $('button[type=submit]', lf); btn.disabled = true; btn.textContent = 'Envoi…';
      fetch(lf.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) })
        .then(function (r) { return r.json(); })
        .then(function (r) {
          if (!r || !r.ok) throw new Error('refus');
          form.style.display = 'none'; bar2.style.width = '100%';
          msg.innerHTML = '<div class="result"><div class="big sm">Merci, votre demande est bien reçue' + (r.ref ? ' (' + r.ref + ')' : '') + '.</div><ul><li>Je vous recontacte sous 24 h ouvrées pour faire le point sur votre projet.</li><li>Un email de confirmation vient de vous être envoyé.</li><li>Vous pouvez demander la suppression de vos données à tout moment.</li></ul></div>';
        })
        .catch(function () { btn.disabled = false; btn.textContent = 'Envoyer ma demande'; msg.innerHTML = '<div class="note warn">L’envoi n’a pas fonctionné. Réessayez dans un instant, ou écrivez-moi via la page <a href="/mentions-legales">mentions légales</a>.</div>'; });
    });
  }
  /* ---------- 7 bis. Préremplir la demande avec l'estimation du simulateur ---------- */
  if (lf) {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href="#demande"]') : null; if (!a) return;
      if (a.hasAttribute('data-precis')) return;
      var tool = a.closest('.tool'); if (!tool || tool === lf) return;
      var big = $('.result .big', tool), pr = $('#ld-precisions', lf);
      if (big && pr && (!pr.value || pr.dataset.auto === '1')) { pr.value = ('Estimation du simulateur : ' + big.textContent.replace(/\s+/g, ' ').trim()).slice(0, 300); pr.dataset.auto = '1'; }
    });
  }
  /* ---------- 8. Barre de lecture ---------- */
  var rb = $('.readbar i');
  if (rb) {
    var tick = false;
    var upr = function () { var h = document.documentElement, m = h.scrollHeight - h.clientHeight; rb.style.transform = 'scaleX(' + (m > 0 ? Math.min(1, h.scrollTop / m) : 0) + ')'; tick = false; };
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(upr); } }, { passive: true });
  }

  /* ---------- 9. Étape suivante après un calcul ---------- */
  var nextStep = function (tool) {
    var res = $('.result', tool); if (!res) return;
    var href = document.getElementById('demande') ? '#demande' : tool.dataset.nextHref, label = document.getElementById('demande') ? 'Recevoir un devis précis' : tool.dataset.nextLabel;
    if (!href) return;
    var p = $('.next', res); if (!p) { p = document.createElement('p'); p.className = 'next'; res.appendChild(p); }
    p.innerHTML = '<a class="btn cta" href="' + href + '">' + label + ' →</a>';
  };
  $$('[data-next-href]').forEach(function (tool) {
    var obs = new MutationObserver(function () { obs.disconnect(); nextStep(tool); obs.observe($('.result', tool), { childList: true }); });
    var r = $('.result', tool); if (r) { nextStep(tool); obs.observe(r, { childList: true }); }
  });

  /* ---------- 10. Checklist de devis ---------- */
  var dc = $('[data-tool="devis-check"]');
  if (dc) {
    var sel = $('#dc-p', dc);
    var upd2 = function () {
      var p = sel ? sel.value : null;
      var boxes = $$('.checks label', dc).filter(function (l) { var f = l.dataset.for; var vis = !sel || f === 'tous' || f === p; l.style.display = vis ? '' : 'none'; return vis; });
      var miss = boxes.filter(function (l) { return !$('input', l).checked; });
      var done = boxes.length - miss.length;
      $('.result', dc).innerHTML = '<div class="small">Points vérifiés</div><div class="big">' + done + ' / ' + boxes.length + '</div>' +
        (miss.length ? '<p><b>À demander à l’entreprise :</b></p><ul>' + miss.map(function (l) { return '<li><b>' + l.textContent.trim() + '</b> — ' + $('input', l).dataset.why + '</li>'; }).join('') + '</ul>'
                     : '<p class="dc-ok">Votre devis contient tous les points de la checklist.</p>') +
        '<p class="fine">Checklist indicative tirée des sources citées en bas de page. Elle ne remplace pas une lecture attentive du devis.</p>';
    };
    $$('input,select', dc).forEach(function (el) { el.addEventListener('change', upd2); });
    upd2();
  }
  /* ---------- 11. Barre d'actions mobile : apparaît après le premier écran ---------- */
  var mb = $('.mbar');
  if (mb) {
    var lim = document.querySelector('.hero') ? window.innerHeight * 0.8 : 280, t2 = false;
    var upm = function () { mb.classList.toggle('show', window.scrollY > lim); t2 = false; };
    window.addEventListener('scroll', function () { if (!t2) { t2 = true; requestAnimationFrame(upm); } }, { passive: true });
    upm();
  }

  /* ---------- 12. Accueil : votre commune -> votre fiche SPANC (liste officielle geo.api.gouv.fr, octobre 2026) ---------- */
  var cq = document.getElementById('commune-q');
  if (cq) {
    var nz = function (s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim(); };
    var copts = [].slice.call(document.querySelectorAll('#communes-ra option'));
    var cr = document.getElementById('commune-r');
    var cgo = function () {
      var v = nz(cq.value); cr.textContent = '';
      if (v.length < 2) return;
      var hit = copts.filter(function (o) { return nz(o.value) === v; })[0];
      if (!hit) { var c = copts.filter(function (o) { return nz(o.value).indexOf(v) === 0; }); if (c.length === 1) hit = c[0]; }
      if (hit) {
        var a = document.createElement('a'); a.href = '/spanc/' + hit.getAttribute('data-s');
        a.textContent = hit.value + ' dépend du SPANC ' + hit.getAttribute('data-n') + ' : voir sa fiche →';
        cr.appendChild(a);
      } else if (v.length > 3 && !copts.some(function (o) { return nz(o.value).indexOf(v) === 0; })) {
        cr.textContent = 'Commune introuvable dans la Loire-Atlantique et la Vendée : vérifiez l’orthographe.';
      }
    };
    cq.addEventListener('input', cgo); cq.addEventListener('change', cgo);
  }
  /* ---------- 12 bis. Pages « SPANC par commune » : filtre du tableau ---------- */
  var fc = document.getElementById('filtre-communes');
  if (fc) {
    var nzf = function (s) { return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim(); };
    var ftb = document.getElementById(fc.getAttribute('data-filter'));
    var frows = ftb ? [].slice.call(ftb.querySelectorAll('tbody tr')) : [];
    var fr = document.getElementById('filtre-communes-r');
    var ff = function () {
      var v = nzf(fc.value), n = 0;
      frows.forEach(function (tr) { var ok = !v || (' ' + nzf(tr.getAttribute('data-q'))).indexOf(' ' + v) !== -1; tr.style.display = ok ? '' : 'none'; if (ok) n++; });
      if (fr) fr.textContent = n === 0 ? 'Aucune commune trouvée : vérifiez l’orthographe ou tapez le début du nom.' : (n + (n > 1 ? ' communes affichées.' : ' commune affichée.'));
    };
    fc.addEventListener('input', ff);
    try { var q0 = new URLSearchParams(location.search).get('commune'); if (q0) { fc.value = q0; ff(); } } catch (e) {}
  }
  /* ---------- 13. Simulateur « Quelles aides pour votre assainissement ? » ----------
     Plafonds de revenus Anah 2026 hors Île-de-France (guide des aides de l'Anah, édition septembre 2026).
     Aides locales : reprises des fiches /spanc/* (fiches ANIL et documents des collectivités, dates indiquées sur chaque fiche).
     Anah : délibération n° 2026-23 du 26/06/2026 (dossiers déposés depuis le 01/09/2026). Calcul fait dans le navigateur : rien n'est envoyé. */
  var ANAH26 = { tmo: [[17363, 25393, 30540, 35676, 40835], 5151], mo: [[22259, 32553, 39148, 45735, 52348], 6598], int: [[31185, 45842, 55196, 64550, 73907], 9357] };
  var plafA = function (k, n) { var t = ANAH26[k]; return n <= 5 ? t[0][n - 1] : t[0][4] + (n - 5) * t[1]; };
  var catOf = function (n, r) { if (!n || r === null) return null; return r <= plafA('tmo', n) ? 'tmo' : (r <= plafA('mo', n) ? 'mo' : (r <= plafA('int', n) ? 'int' : 'sup')); };
  var CATL = { tmo: 'ménage très modeste', mo: 'ménage modeste', int: 'ménage aux revenus intermédiaires', sup: 'ménage aux revenus supérieurs' };
  var sa = $('[data-tool="aides-anc"]');
  if (sa) {
    var NO = function (w) { return { k: 'no', why: w }; };
    var NC = 'réservée aux installations déclarées non conformes (ou absentes) par le SPANC';
    var ht = function (m) { return m / 1.1; };
    var byCat = function (p, rates, base, caps) {
      if (!p.cat) { var rs = []; Object.keys(rates).forEach(function (k) { if (rates[k]) rs.push(rates[k]); }); return { k: 'rng', lo: Math.min.apply(null, rs) * base, hi: Math.min(Math.max.apply(null, rs) * base, caps ? Math.max.apply(null, Object.keys(caps).map(function (k) { return caps[k]; })) : Infinity), why: 'taux selon vos revenus : indiquez votre revenu fiscal pour préciser' }; }
      var r = rates[p.cat]; if (!r) return null;
      return { k: 'val', v: Math.min(r * base, caps && caps[p.cat] ? caps[p.cat] : Infinity), why: Math.round(r * 100) + ' % de ' + fmt(base) + ' de travaux retenus' };
    };
    var LOC = {
      'nantes-metropole': { t: '15 % des travaux (30 % pour les ménages modestes), 50 % (65 %) si la non-conformité est jugée prioritaire ; travaux plafonnés à 8 000 € HT selon la métropole (10 500 € HT selon l’ANIL) ; dispositif 2025-2030.',
        c: function (p) { if (p.z === 'vol') return NO(NC); var b = Math.min(ht(p.m), 8000); return { k: 'rng', lo: 0.15 * b, hi: 0.65 * b, why: 'le taux dépend de vos revenus et de la priorité de la non-conformité : à confirmer auprès du service' }; } },
      'grand-lieu': { t: 'Depuis le 01/07/2025 : 35 % (très modestes), 25 % (modestes) ou 15 % (modestes + 10 %) de travaux plafonnés à 10 000 € TTC, pour des travaux d’au moins 3 000 € TTC validés par le SPANC.',
        c: function (p) {
          if (p.z === 'vol') return NO(NC); if (p.m < 3000) return NO('travaux d’au moins 3 000 € TTC exigés');
          var b = Math.min(p.m, 10000);
          if (!p.cat) return { k: 'rng', lo: 0.15 * b, hi: 0.35 * b, why: 'taux selon vos revenus : indiquez votre revenu fiscal pour préciser' };
          var r = p.cat === 'tmo' ? 0.35 : (p.cat === 'mo' ? 0.25 : (p.mo11 ? 0.15 : 0));
          return r ? { k: 'val', v: r * b, why: Math.round(r * 100) + ' % de ' + fmt(b) + ' de travaux retenus' } : NO('réservée aux revenus sous le plafond « modeste » de l’Anah majoré de 10 %');
        } },
      'sud-estuaire': { t: '75 % (très modestes), 50 % (modestes), 25 % (intermédiaires et bailleurs) ou 10 % (autres) d’un montant de 3 000 à 11 000 € TTC ; micro-stations exclues (règlement du 19/12/2020, plafonds de revenus au 01/01/2025).',
        c: function (p) {
          if (p.z === 'vol') return NO(NC); if (p.f === 'micro') return NO('micro-stations exclues'); if (p.m < 3000) return NO('montant subventionnable d’au moins 3 000 € TTC');
          var b = Math.min(p.m, 11000);
          if (p.st === 'pb') return { k: 'val', v: 0.25 * b, why: '25 % de ' + fmt(b) + ' (taux des bailleurs)' };
          return byCat(p, { tmo: 0.75, mo: 0.5, int: 0.25, sup: 0.1 }, b);
        } },
      'sud-retz-atlantique': { t: 'En 2025 : jusqu’à 3 000 € (revenus modestes) ou 4 000 € (très modestes, grille Anah), filière économe en énergie avec infiltration des eaux traitées ; budget annuel limité.',
        c: function (p) {
          if (p.z === 'vol') return NO(NC); if (p.f === 'micro') return NO('filière économe en énergie exigée');
          if (!p.cat) return { k: 'max', v: 4000, why: 'selon vos revenus (modestes ou très modestes)' };
          if (p.cat === 'tmo') return { k: 'max', v: Math.min(4000, p.m), why: 'plafond des ménages très modestes' };
          if (p.cat === 'mo') return { k: 'max', v: Math.min(3000, p.m), why: 'plafond des ménages modestes' };
          return NO('réservée aux ménages modestes et très modestes');
        } },
      'pornic-agglo': { t: 'De 800 à 6 000 € selon les plafonds de ressources de l’Anah, avec un palier pour les propriétaires occupants quel que soit leur revenu (conseil communautaire du 02/02/2023).',
        c: function (p) { if (p.z === 'vol') return NO(NC); return { k: 'rng', lo: 800, hi: Math.min(6000, p.m), why: 'montant selon vos revenus : barème à demander au SPANC' }; } },
      'sevre-et-loire': { t: '30 % plafonnés à 3 000 € (sous le plafond Anah) ou 20 % plafonnés à 2 000 € (plafond Anah majoré de 10 %), pour des travaux de 3 000 à 10 000 € TTC (conditions de 2021, à confirmer).',
        c: function (p) {
          if (p.z === 'vol') return NO(NC); if (p.m < 3000) return NO('travaux d’au moins 3 000 € TTC exigés');
          var b = Math.min(p.m, 10000);
          if (!p.cat) return { k: 'rng', lo: Math.min(0.2 * b, 2000), hi: Math.min(0.3 * b, 3000), why: 'taux selon vos revenus' };
          if (p.cat === 'tmo' || p.cat === 'mo') return { k: 'val', v: Math.min(0.3 * b, 3000), why: '30 % de ' + fmt(b) + ', plafonné à 3 000 € (conditions de 2021)' };
          if (p.mo11) return { k: 'val', v: Math.min(0.2 * b, 2000), why: '20 % de ' + fmt(b) + ', plafonné à 2 000 € (conditions de 2021)' };
          return NO('réservée aux revenus sous le plafond Anah majoré de 10 %');
        } },
      'nozay': { t: 'En 2025 : 40 % des travaux TTC compris entre 3 000 et 7 000 €, soit 2 800 € au plus, pour les propriétaires occupants sous plafonds de revenu (dossier monté avec SOLIHA).',
        c: function (p) {
          if (p.z === 'vol') return NO(NC); if (p.st === 'pb' || p.st === 'rs') return NO('réservée aux propriétaires occupants'); if (p.m < 3000) return NO('travaux d’au moins 3 000 € TTC exigés');
          var v = Math.min(0.4 * Math.min(p.m, 7000), 2800);
          if (p.r === null) return { k: 'max', v: v, why: 'sous condition de revenus : indiquez votre revenu fiscal pour vérifier' };
          var pl = [22015, 32197, 38719, 45234, 51775], lim = p.n <= 5 ? pl[p.n - 1] : pl[4] + (p.n - 5) * 6525;
          return p.r <= lim ? { k: 'val', v: v, why: '40 % de ' + fmt(Math.min(p.m, 7000)) } : NO('revenu fiscal au-dessus du plafond de la CC (' + fmt(lim) + ' pour ' + p.n + ' pers.)');
        } },
      'erdre-et-gesvres': { t: 'Forfait de 3 000 € pour un propriétaire occupant (ou bailleur conventionné) sous les plafonds Anah « modestes », installation non conforme, demande avant travaux (dossier de 2017, à confirmer).',
        c: function (p) {
          if (p.z === 'vol') return NO(NC); if (p.st === 'rs') return NO('réservée aux propriétaires occupants et aux bailleurs conventionnés');
          if (p.st === 'pb') return { k: 'unk', why: 'seulement pour un logement conventionné : à vérifier avec le service' };
          if (!p.cat) return { k: 'max', v: 3000, why: 'sous condition de revenus (plafonds Anah « modestes »)' };
          return (p.cat === 'tmo' || p.cat === 'mo') ? { k: 'val', v: Math.min(3000, p.m), why: 'forfait' } : NO('réservée aux ménages modestes et très modestes');
        } },
      'redon-agglomeration': { t: '20 % des travaux pour les propriétaires occupants (résidence principale) aux revenus très modestes ; plafond non publié.',
        c: function (p) {
          if (p.z === 'vol') return NO(NC); if (p.st === 'pb' || p.st === 'rs') return NO('réservée aux propriétaires occupants');
          if (!p.cat) return { k: 'unk', why: 'réservée aux ménages très modestes : indiquez votre revenu fiscal' };
          return p.cat === 'tmo' ? { k: 'max', v: 0.2 * p.m, why: '20 % des travaux, plafond non publié' } : NO('réservée aux ménages très modestes');
        } },
      'carene-saint-nazaire': { t: 'Aides locales pouvant être soumises à conditions de revenus, gérées par le service Habitat de la CARENE (02 51 76 10 00) ; montant non publié.',
        c: function () { return { k: 'unk', why: 'montant non publié : service Habitat de la CARENE, 02 51 76 10 00' }; } },
      'pays-des-herbiers': { t: '35 % des travaux TTC, plafonnés à 3 000 €, sans condition de revenus, pour une résidence principale de plus de 2 ans dont l’installation est non conforme ou absente (délibération du 23/02/2023, fiche ANIL du 23/03/2026).',
        c: function (p) { if (p.z === 'vol') return NO(NC); if (p.st === 'rs') return NO('réservée aux résidences principales'); return { k: 'val', v: Math.min(0.35 * p.m, 3000), why: '35 % des travaux, plafonnés à 3 000 €' }; } },
      'pays-de-pouzauges': { t: 'De 5 à 40 % des travaux, plafonnés entre 500 et 4 000 € selon les ressources, pour un propriétaire occupant ou bailleur, après étude de filière (fiche ANIL du 23/03/2026).',
        c: function (p) { if (p.z === 'vol') return NO(NC); if (p.st === 'rs') return NO('réservée aux propriétaires occupants ou bailleurs'); return { k: 'rng', lo: Math.min(500, 0.05 * p.m), hi: Math.min(4000, 0.4 * p.m), why: 'taux selon vos ressources : barème à demander au SPANC' }; } },
      'pays-de-fontenay-vendee': { t: 'Forfait de 2 000 € par installation réhabilitée, pour un bien acquis avant le 01/01/2011 (hors résidence secondaire), étude par un bureau d’études charté, dossier avant travaux.',
        c: function (p) { if (p.z === 'vol') return NO(NC); if (p.st === 'rs') return NO('résidences secondaires exclues'); if (p.a !== '15') return NO('réservée aux biens acquis avant le 01/01/2011'); return { k: 'val', v: Math.min(2000, p.m), why: 'forfait' }; } },
      'pays-de-la-chataigneraie': { t: '10 % ou 50 % selon le type de travaux, sur une base plafonnée à 8 000 € TTC (étude et travaux) ; justificatifs sous 12 mois (fiche ANIL du 26/03/2026).',
        c: function (p) { if (p.z === 'vol') return NO(NC); var b = Math.min(p.m, 8000); return { k: 'rng', lo: 0.1 * b, hi: 0.5 * b, why: 'taux selon le type de travaux, à confirmer par le SPANC' }; } },
      'pays-de-chantonnay': { t: 'Forfait de 1 000 € par propriétaire du 01/01/2024 au 31/12/2027, sans condition de revenus, y compris après une vente ; demande avant la signature du devis.',
        c: function (p) { if (p.z === 'vol') return NO(NC); return { k: 'val', v: Math.min(1000, p.m), why: 'forfait' }; } },
      'pays-de-saint-fulgent-les-essarts': { t: 'Subvention de 800 € pour un propriétaire occupant ou bailleur d’une maison dont l’installation est non conforme (fiche ANIL du 26/03/2026).',
        c: function (p) { if (p.z === 'vol') return NO(NC); if (p.st === 'rs') return NO('réservée aux propriétaires occupants ou bailleurs'); return { k: 'val', v: Math.min(800, p.m), why: 'forfait' }; } },
      'vendee-sevre-autise': { t: 'Subvention de 700 € pour un logement de plus de 15 ans, hors mise aux normes consécutive à une vente, après diagnostic préalable (fiche ANIL du 25/03/2026).',
        c: function (p) { if (p.z === 'vente' || p.st === 'acq') return NO('mise aux normes après une vente exclue'); return { k: 'val', v: Math.min(700, p.m), why: 'forfait, logement de plus de 15 ans' }; } },
      'pays-de-saint-gilles-croix-de-vie': { t: 'Aides 2026 sur 11 000 € TTC de travaux au plus : 50 % (très modestes), 35 % (modestes), 20 % (autres) ; bien acquis avant le 01/01/2011 (guide du SPANC de mai 2026).',
        c: function (p) { if (p.z === 'vol') return NO(NC); if (p.a !== '15') return NO('réservée aux biens acquis avant le 01/01/2011'); return byCat(p, { tmo: 0.5, mo: 0.35, int: 0.2, sup: 0.2 }, Math.min(p.m, 11000)); } },
      'vendee-grand-littoral': { t: 'Aides 2026 pour les ménages modestes et très modestes, installation de plus de 15 ans, résidence principale ou location à l’année : 20 % de 10 000 € TTC au plus (bien acquis depuis 4 ans ou plus), 30 % ou 40 % (acquis depuis moins de 4 ans), plus 60 % de l’étude (300 € au plus).',
        c: function (p) {
          if (p.z === 'vol') return NO(NC); if (p.st === 'rs') return NO('résidences secondaires exclues');
          var b = Math.min(p.m, 10000), recent = p.a === '0' || p.a === '1' || p.a === '2';
          if (!p.cat) return { k: 'rng', lo: 0.2 * b, hi: (recent ? 0.4 : 0.2) * b, why: 'réservée aux ménages modestes et très modestes' };
          if (p.cat !== 'tmo' && p.cat !== 'mo') return NO('réservée aux ménages modestes et très modestes');
          var r = recent ? (p.cat === 'tmo' ? 0.4 : 0.3) : 0.2;
          return { k: 'val', v: r * b, why: Math.round(r * 100) + ' % de ' + fmt(b) + (recent ? ' (bien acquis depuis moins de 4 ans)' : ' (bien acquis depuis 4 ans ou plus)') + ', plus jusqu’à 300 € pour l’étude' };
        } },
      'les-sables-d-olonne-agglomeration': { t: 'Jusqu’à 7 000 € selon les ressources du foyer (délibération de novembre 2021) ; conditions détaillées non publiées en ligne.',
        c: function (p) { if (p.z === 'vol') return NO(NC); return { k: 'max', v: Math.min(7000, p.m), why: 'selon vos ressources : conditions à demander au SPANC' }; } },
      'challans-gois': { t: '60 % des études et travaux plafonnés à 10 000 € (6 000 € au plus) pour les ménages modestes et très modestes, 10 % (1 000 € au plus) pour les autres ; logement achevé avant le 01/01/2011, installation non conforme imposant des travaux.',
        c: function (p) { if (p.z === 'vol') return NO(NC); return byCat(p, { tmo: 0.6, mo: 0.6, int: 0.1, sup: 0.1 }, Math.min(p.m, 10000)); } },
      'ile-de-noirmoutier': { t: '20, 30 ou 40 % d’un plafond de travaux de 8 000 € TTC, sans condition de revenus, pour un propriétaire depuis au moins 2 ans.',
        c: function (p) { if (p.z === 'vol') return NO(NC); if (p.a === '0' || p.a === '1') return NO('réservée aux propriétaires depuis au moins 2 ans'); var b = Math.min(p.m, 8000); return { k: 'rng', lo: 0.2 * b, hi: 0.4 * b, why: 'taux à confirmer par le SPANC' }; } },
      'pays-de-mortagne': { t: '10 % des dépenses éligibles (étude et travaux) pour un logement construit avant le 01/01/2011, entreprises chartées, travaux après la décision d’attribution.',
        c: function (p) { if (p.z === 'vol') return NO(NC); return { k: 'val', v: 0.1 * p.m, why: '10 % des dépenses, plafond non publié' }; } },
      'sud-vendee-littoral': { t: 'Aides à la réhabilitation sous conditions (règlement d’aides 2025) ; montants non lisibles en ligne.',
        c: function () { return { k: 'unk', why: 'montants non publiés en ligne : contactez le SPANC' }; } },
      'vie-et-boulogne': { t: 'Aides pour les foyers très modestes à modestes et dans le périmètre de protection du captage d’Apremont ; montants non publiés.',
        c: function () { return { k: 'unk', why: 'montants non publiés : contactez le SPANC' }; } }
    };
    var NONE = ['cap-atlantique', 'chateaubriant-derval', 'clisson-sevre-et-maine', 'estuaire-et-sillon', 'ile-d-yeu', 'la-roche-sur-yon-agglomeration', 'ocean-marais-de-monts', 'pays-d-ancenis', 'pays-de-blain', 'pays-des-achards', 'pontchateau-saint-gildas', 'terres-de-montaigu'];
    var nzs = function (s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/œ/g, 'oe').replace(/[^a-z0-9]+/g, ' ').trim(); };
    var sopts = $$('#sa-communes option'), sc = $('#sa-c', sa), se = $('#sa-e', sa), scr = $('#sa-c-r', sa), out = $('.result', sa), shown = false, commune = '';
    var findC = function () {
      var v = nzs(sc.value); scr.textContent = ''; commune = '';
      if (v.length < 2) return;
      var hit = sopts.filter(function (o) { return nzs(o.value) === v; })[0];
      if (!hit) { var c = sopts.filter(function (o) { return nzs(o.value).indexOf(v) === 0; }); if (c.length === 1) hit = c[0]; }
      if (hit) { se.value = hit.getAttribute('data-s'); commune = hit.value; scr.textContent = hit.value + '\u00a0: ' + se.options[se.selectedIndex].text; }
      else if (v.length > 3 && !sopts.some(function (o) { return nzs(o.value).indexOf(v) === 0; })) scr.textContent = 'Commune introuvable en Loire-Atlantique et en Vendée\u00a0: choisissez l’intercommunalité.';
    };
    var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
    var li = function (h, a, b) { return '<li><b>' + h + '</b> — ' + a + (b ? ' <span class="src">' + b + '</span>' : '') + '</li>'; };
    var amt = function (r) {
      if (r.k === 'val') return fmt(r.v); if (r.k === 'max') return 'jusqu’à ' + fmt(r.v);
      if (r.k === 'rng') return rng(Math.round(r.lo / 10) * 10, Math.round(r.hi / 10) * 10); return 'montant à confirmer';
    };
    var run = function () {
      var slug = se.value;
      if (!slug) { out.hidden = false; out.innerHTML = '<p class="sim-warn">Choisissez votre commune ou votre intercommunalité pour voir les aides de votre territoire.</p>'; return; }
      var n = Math.max(1, Math.min(12, parseInt($('#sa-n', sa).value, 10) || 1)), rv = $('#sa-r', sa).value.replace(/[^0-9]/g, '');
      var p = { n: n, r: rv === '' ? null : parseInt(rv, 10), st: $('#sa-s', sa).value, z: $('#sa-z', sa).value, a: $('#sa-a', sa).value, f: $('#sa-f', sa).value, m: Math.max(0, parseFloat($('#sa-m', sa).value) || 0) };
      p.cat = catOf(n, p.r); p.mo11 = p.r !== null && p.r <= plafA('mo', n) * 1.1;
      var name = se.options[se.selectedIndex].text, L = LOC[slug], r = L ? L.c(p) : null, ok = [], ko = [];
      var fiche = '<a href="/spanc/' + slug + '#aides-aux-travaux">fiche ' + esc(name) + '</a>';
      if (!L) { r = { k: 'none' }; ok.push(li('Aide de l’intercommunalité : aucune', 'rien trouvé pour ' + esc(name) + ' dans les documents publiés.', fiche)); }
      else if (r.k === 'no') ko.push(li('Aide de l’intercommunalité (' + esc(name) + ')', cap(r.why) + '.', fiche));
      else ok.push(li('Aide de l’intercommunalité (' + esc(name) + ') : ' + amt(r), esc(L.t) + (r.why ? ' <i>' + cap(r.why) + '.</i>' : ''), fiche));
      var localOk = L && r.k !== 'no';
      if (p.st === 'po' || p.st === 'acq') {
        if (p.cat === 'tmo' && localOk) ok.push(li('Anah : complément possible', 'pour un propriétaire occupant très modeste, seulement en complément de l’aide de votre intercommunalité : taux de 35 % au plus, sur 20 000 € HT de travaux au plus. Montant fixé selon une instruction de l’Anah, à confirmer auprès de France Rénov’.', '<a href="https://www.anah.gouv.fr/sites/default/files/2026-07/Deliberation-2026-23_Regime-aides-applicable-aux-proprietaires-occupants.pdf" rel="noopener" target="_blank">délibération Anah n°\u00a02026-23</a>'));
        else if (p.cat === 'tmo') ko.push(li('Anah', 'elle n’intervient qu’en complément d’une aide de collectivité, absente ici.'));
        else if (!p.cat && localOk) ok.push(li('Anah : si vous êtes très modeste', 'complément possible pour un propriétaire occupant très modeste, uniquement avec une aide de collectivité. Indiquez votre revenu fiscal pour vérifier.'));
        else if (!p.cat) ko.push(li('Anah', 'elle n’intervient qu’en complément d’une aide de collectivité, absente ici.'));
        else ko.push(li('Anah', 'réservée aux propriétaires occupants très modestes (' + CATL[p.cat] + ' ici).'));
      } else ko.push(li('Anah', 'pour l’assainissement, elle ne vise que les propriétaires occupants très modestes.'));
      var eco = p.st !== 'rs' && p.f !== 'micro';
      if (eco) ok.push(li('Éco-PTZ : jusqu’à 10 000 € à 0 %', 'prêt sans intérêts sur 15 ans au plus, sans condition de ressources, pour une résidence principale de plus de 2 ans' + (p.f === 'nsp' ? ', si la filière ne consomme pas d’électricité (micro-station exclue)' : '') + (p.st === 'acq' ? ' (une fois l’achat signé)' : '') + '. Entreprise RGE facultative.', '<a href="https://www.service-public.gouv.fr/particuliers/vosdroits/F19905" rel="noopener" target="_blank">service-public, vérifié le 01/09/2026</a>'));
      else ko.push(li('Éco-PTZ', p.st === 'rs' ? 'réservé aux résidences principales.' : 'il ne finance pas les dispositifs qui consomment de l’énergie, comme les micro-stations.'));
      ok.push(li('TVA à 10 %', 'au lieu de 20 %, dans un logement achevé depuis plus de 2 ans : l’entreprise l’applique directement sur le devis.', '<a href="https://bofip.impots.gouv.fr/node/358116" rel="noopener" target="_blank">BOFiP</a>'));
      ok.push(li('À demander aussi', 'retraité : votre caisse de retraite (aide ou prêt possible, montants non publiés) ; allocataire : le prêt amélioration de l’habitat de la CAF.'));
      var big, aid = 0, ex = '';
      if (r.k === 'val') { big = fmt(r.v) + ' d’aide locale estimée'; aid = r.v; }
      else if (r.k === 'max') { big = 'Jusqu’à ' + fmt(r.v) + ' d’aide locale'; aid = r.v; }
      else if (r.k === 'rng') big = amt(r) + ' d’aide locale';
      else if (r.k === 'unk') big = 'Aide locale à confirmer';
      else big = eco ? 'Éco-PTZ jusqu’à 10 000 € à 0 %' : 'Pas d’aide locale pour votre cas';
      var sub = (r.k !== 'no' && r.k !== 'none' && eco) ? '+ éco-PTZ jusqu’à 10 000 € à 0 %' : '';
      if (p.m > 0 && (r.k === 'val' || r.k === 'max' || r.k === 'no' || r.k === 'none')) {
        var rest = Math.max(0, p.m - aid), mens = Math.min(rest, 10000) / 180;
        ex = '<div class="note"><strong>Exemple sur vos chiffres' + (r.k === 'max' ? ' (aide maximale)' : '') + '</strong>' + fmt(p.m) + ' TTC de travaux' + (aid ? ' − ' + fmt(aid) + ' d’aide locale' : ', sans aide locale') + ' = <b>' + fmt(rest) + ' à votre charge</b>' +
          (eco && rest > 0 ? (rest <= 10000 ? ', finançables en totalité' : ', dont 10 000 € finançables') + ' par l’éco-PTZ : environ ' + fmt(mens) + ' par mois sur 15 ans, sans intérêts (hors frais éventuels de la banque).' : '.') + '</div>';
      } else if (r.k === 'rng' || r.k === 'unk') ex = '<p class="fine">Reste à charge : impossible à chiffrer précisément sans le barème de votre intercommunalité. Le professionnel ou le SPANC vous le confirme.</p>';
      var tips = [];
      if (p.z === 'nc') tips.push('Déposez la demande d’aide <b>avant de signer le devis</b> : c’est une condition presque partout.');
      if (p.z === 'vente' && p.st === 'acq') tips.push('Acquéreur : vous avez <b>1 an après l’acte</b> pour faire les travaux. Faites-les chiffrer avant de signer : le coût entre dans la négociation.');
      if (p.z === 'vente' && p.st !== 'acq') tips.push('Vendeur : vous n’êtes pas obligé de faire les travaux avant la vente, mais un devis chiffré rassure l’acquéreur et cadre la négociation.');
      if (p.z === 'vol') tips.push('Sans non-conformité signalée, les aides locales ne s’appliquent pas en général : demandez un contrôle au SPANC si votre installation est ancienne.');
      out.hidden = false;
      out.innerHTML = ty('<div class="small">' + (p.cat ? 'Profil : ' + CATL[p.cat] + ' (barème Anah 2026, ' + n + ' pers.)' : 'Profil de revenus non renseigné') + ' · ' + esc(commune || name) + '</div>' +
        '<div class="big">' + big + '</div>' + (sub ? '<p class="sim-sub">' + sub + '</p>' : '') +
        '<ul class="sim-list">' + ok.join('') + '</ul>' + ex +
        (tips.length ? '<ul class="sim-tips">' + tips.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' : '') +
        (ko.length ? '<details class="sim-ko"><summary>Aides écartées pour votre cas (' + ko.length + ')</summary><ul>' + ko.join('') + '</ul></details>' : '') +
        '<p class="fine">Estimation indicative à partir des règles publiées (dates sur les fiches et dans les sources ci-dessous). Les aides locales changent souvent : la décision revient à l’intercommunalité.</p>');
      var precis = ('Simulateur aides : ' + (commune ? commune + ', ' : '') + name + ' · ' + n + ' pers., ' + (p.cat ? CATL[p.cat] : 'revenus non indiqués') + ' · ' +
        { po: 'propriétaire occupant', pb: 'bailleur', acq: 'acquéreur', rs: 'résidence secondaire' }[p.st] + ' · ' + { nc: 'non-conformité SPANC', vente: 'vente/achat', vol: 'travaux volontaires' }[p.z] +
        ' · travaux ' + fmt(p.m) + ' TTC · aide locale : ' + (r.k === 'no' || r.k === 'none' ? 'aucune' : amt(r)) + ' · éco-PTZ : ' + (eco ? 'oui' : 'non')).replace(/ /g, ' ');
      if (precis.length > 300) precis = precis.slice(0, 299) + '…';
      var cta = document.getElementById('demande');
      if (cta) {
        var np = document.createElement('div'); np.className = 'sim-cta';
        np.innerHTML = ty('<a class="btn cta" href="#demande">Recevoir mon estimation et 1 ou 2 devis →</a><p class="small">Gratuit et sans engagement : votre estimation est jointe à la demande, et 1 ou 2 professionnels de votre secteur vous proposent un devis, avec votre accord.</p>');
        $('a', np).setAttribute('data-precis', precis);
        $('a', np).setAttribute('data-projet', p.st === 'acq' ? 'Achat d’une maison avec installation non conforme' : 'Mise aux normes / réhabilitation');
        $('a', np).setAttribute('data-proprio', p.st === 'acq' ? 'En cours d’achat' : 'Propriétaire');
        out.appendChild(np);
      }
    };
    sc.addEventListener('input', function () { findC(); if (shown) run(); });
    sc.addEventListener('change', function () { findC(); if (shown) run(); });
    $$('select,input', sa).forEach(function (el) { if (el !== sc) { el.addEventListener('change', function () { if (el === se) { scr.textContent = ''; commune = ''; } if (shown) run(); }); if (el.type === 'number' || el.type === 'text') el.addEventListener('input', function () { if (shown) run(); }); } });
    $('[data-sim-go]', sa).addEventListener('click', function () { shown = true; run(); });
  }
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'ld-precisions') e.target.dataset.auto = '0'; });
  /* Préremplissage du formulaire depuis un simulateur (lien portant data-precis) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-precis]') : null; if (!a) return;
    var lf2 = document.getElementById('demande'); if (!lf2) return;
    var pr = $('#ld-precisions', lf2);
    if (pr && (!pr.value || pr.dataset.auto === '1')) { pr.value = a.getAttribute('data-precis'); pr.dataset.auto = '1'; }
    [['#ld-projet', 'data-projet'], ['#ld-proprio', 'data-proprio']].forEach(function (x) {
      var s = $(x[0], lf2), v = a.getAttribute(x[1]); if (!s || !v) return;
      $$('option', s).forEach(function (o) { if (o.textContent === v) s.value = o.value || o.textContent; });
    });
    setTimeout(function () { var cp = $('#ld-cp', lf2); if (cp) cp.focus({ preventScroll: true }); }, 400);
  });
})();
