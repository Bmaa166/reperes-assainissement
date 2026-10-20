/* Guides Clair — outils interactifs (aucune donnée envoyée, tout est calculé dans le navigateur) */
(function () {
  'use strict';
  var fmt = function (n) { return Math.round(n).toLocaleString('fr-FR') + ' €'; };
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
      'vente': ['Ce que vous devez fournir', ['Un document du SPANC de <b>moins de 3 ans</b> à la signature de l’acte, à compter de la date de la visite.', 'S’il manque ou s’il est trop ancien, le contrôle est à votre charge (environ 150 à 220 € selon les territoires).', 'Vous n’êtes pas obligé de faire les travaux avant de vendre : l’acquéreur dispose d’un an. Leur coût entre souvent dans la négociation.', 'Sans document valide, vous ne pouvez pas vous exonérer de la garantie des vices cachés.'], ['vente-achat-maison', 'spanc-controle']],
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
    $('[data-next]', lf).addEventListener('click', function () { if (ok1()) go(1); });
    $('[data-prev]', lf).addEventListener('click', function () { go(0); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!ok1()) { go(0); return; }
      var p = $('#ld-prenom', lf), tel = $('#ld-tel', lf), em = $('#ld-email', lf), c = $('input[name=consent]', lf);
      if (!p.value.trim()) return bad(p, 'Indiquez votre prénom.');
      if (tel.value.replace(/[^0-9]/g, '').length < 9) return bad(tel, 'Indiquez un numéro de téléphone valide.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em.value.trim())) return bad(em, 'Indiquez un email valide.');
      if (!c.checked) return bad(c, 'Cochez la case d’accord pour que je puisse vous proposer un professionnel.');
      var d = {}; $$('input,select', form).forEach(function (x) { if (x.name) d[x.name] = x.type === 'checkbox' ? x.checked : x.value.trim(); });
      d.page = location.pathname; d.site = location.hostname; d.delai_saisie = Math.round((Date.now() - t0) / 1000);
      var btn = $('button[type=submit]', lf); btn.disabled = true; btn.textContent = 'Envoi…';
      fetch(lf.dataset.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(d) })
        .then(function (r) { return r.json(); })
        .then(function (r) {
          if (!r || !r.ok) throw new Error('refus');
          form.style.display = 'none'; bar2.style.width = '100%';
          msg.innerHTML = '<div class="result"><div class="big sm">Merci, votre demande est bien reçue.</div><ul><li>Je vous écris par email pour vous présenter le professionnel proposé, avec son nom.</li><li>Votre demande ne lui est transmise que si vous répondez oui.</li><li>Vous pouvez demander la suppression de vos données à tout moment.</li></ul></div>';
        })
        .catch(function () { btn.disabled = false; btn.textContent = 'Envoyer ma demande'; msg.innerHTML = '<div class="note warn">L’envoi n’a pas fonctionné. Réessayez dans un instant, ou écrivez-moi via la page <a href="/mentions-legales">mentions légales</a>.</div>'; });
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
})();
